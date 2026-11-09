param([switch]$LocalTest)
$ErrorActionPreference='Stop'
$vaultRoot=Join-Path $env:USERPROFILE '.openclaw/estrelas-compras'
$accessPath=Join-Path $vaultRoot $(if($LocalTest){'local-users-test.dpapi'}else{'local-users.dpapi'})
$bootstrapLock=$null
function Save-ProtectedAccess($content) {
    $temporaryPath=Join-Path $vaultRoot ('local-users-'+[guid]::NewGuid().ToString()+'.tmp')
    [IO.File]::WriteAllText($temporaryPath,$content,(New-Object Text.UTF8Encoding($true)))
    if(Test-Path -LiteralPath $accessPath){[IO.File]::Replace($temporaryPath,$accessPath,$null)}else{[IO.File]::Move($temporaryPath,$accessPath)}
}
try {
    New-Item -ItemType Directory -Path $vaultRoot -Force | Out-Null
    $lockPath=Join-Path $vaultRoot $(if($LocalTest){'local-users-test.lock'}else{'local-users.lock'})
    $bootstrapLock=[IO.File]::Open($lockPath,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    if ($LocalTest) {
        $integrationSecret=(Get-Content -LiteralPath (Join-Path (Split-Path (Split-Path $PSScriptRoot)) '.dev.vars') -Raw | Select-String -Pattern '(?m)^INTEGRATION_SECRET=(.+)$').Matches[0].Groups[1].Value.Trim('"')
        $serviceToken=$null
        $siteOrigin='http://127.0.0.1:5173'
    } else {
        $protected=(Get-Content -LiteralPath (Join-Path $vaultRoot 'secrets.dpapi') -Raw).Trim() | ConvertTo-SecureString
        $serviceCredentials=[System.Net.NetworkCredential]::new('', $protected).Password | ConvertFrom-Json
        $integrationSecret=$serviceCredentials.integrationSecret
        $serviceToken=$serviceCredentials.serviceToken
        $siteOrigin='https://compras-escola-aegis.col-gio-estr-8349.chatgpt.site'
    }
    if (-not $integrationSecret -or $integrationSecret.Length -lt 32) { throw 'Segredo de inicialização indisponível.' }
    if (Test-Path -LiteralPath $accessPath) {
        $existing=(Get-Content -LiteralPath $accessPath -Raw).Trim() | ConvertTo-SecureString
        $bundle=[System.Net.NetworkCredential]::new('', $existing).Password | ConvertFrom-Json
    } else {
        $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
        $userSeeds=@(
            @{username='master';name='Master';role='admin';department='Administrativo'},
            @{username='setor.teste';name='Setor de teste';role='solicitante';department='Administrativo'},
            @{username='diretoria.geral';name='Franciluce Lima';role='geral';department='Administrativo'}
        )
        foreach($seed in $userSeeds){$bytes=New-Object byte[] 18;$rng.GetBytes($bytes);$seed.password=[Convert]::ToBase64String($bytes)}
        $rng.Dispose()
        $bundle=@{batchId=[guid]::NewGuid().ToString();users=$userSeeds;site=$siteOrigin;createdAt=[DateTime]::UtcNow.ToString('o')}
        $json=$bundle | ConvertTo-Json -Depth 8 -Compress
        $encrypted=ConvertTo-SecureString $json -AsPlainText -Force | ConvertFrom-SecureString
        New-Item -ItemType Directory -Path $vaultRoot -Force | Out-Null
        Save-ProtectedAccess $encrypted
    }
    $payload=@{batchId=$bundle.batchId;users=@($bundle.users)} | ConvertTo-Json -Depth 8 -Compress
    # Keep the original serialized payload for safe retries after ambiguous network failures.
    if ($bundle.payload) { $payload=[string]$bundle.payload } else {
        if($bundle -is [hashtable]){$bundle.payload=$payload}else{$bundle | Add-Member -NotePropertyName payload -NotePropertyValue $payload}
        $encrypted=ConvertTo-SecureString ($bundle | ConvertTo-Json -Depth 8 -Compress) -AsPlainText -Force | ConvertFrom-SecureString
        Save-ProtectedAccess $encrypted
    }
    $timestamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
    $hmac=New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key=[Text.Encoding]::UTF8.GetBytes($integrationSecret)
    $signature=([BitConverter]::ToString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($timestamp+'.'+$payload)))).Replace('-','').ToLowerInvariant()
    $headers=@{'X-Estrelas-Timestamp'=$timestamp;'X-Estrelas-Signature'=('sha256='+$signature)}
    if($serviceToken){$headers['OAI-Sites-Authorization']='Bearer '+$serviceToken}
    $result=Invoke-RestMethod -Uri ($siteOrigin+'/api/auth/bootstrap') -Method Post -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($payload)) -TimeoutSec 60
    if(-not $result.ok){throw 'Inicialização não confirmada.'}
    [pscustomobject]@{initialized=$true;alreadyInitialized=[bool]$result.alreadyInitialized;users=@($bundle.users | ForEach-Object {$_.username});encryptedAccessFile=$accessPath} | ConvertTo-Json -Compress
} catch {
    Write-Output 'Não foi possível inicializar. O arquivo criptografado, quando criado, foi preservado para uma nova tentativa. Nenhuma senha foi exibida.'
    exit 1
} finally { if($bootstrapLock){$bootstrapLock.Dispose()};$integrationSecret=$null;$serviceToken=$null;$payload=$null;$bundle=$null }
