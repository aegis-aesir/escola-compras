param(
    [Parameter(Mandatory=$true)][string]$File,
    [Parameter(Mandatory=$true)][string]$MessageId,
    [Parameter(Mandatory=$true)][string]$Actor,
    [Parameter(Mandatory=$true)][string]$Reason,
    [string]$RequestId,
    [string]$Attachments
)
$ErrorActionPreference='Stop'
if(Test-Path -LiteralPath (Join-Path $PSScriptRoot '../../.ceea-worktree.json')){throw 'Importação real somente pelo checkout do coordenador.'}
if(-not [IO.Path]::IsPathRooted($File) -or -not (Test-Path -LiteralPath $File -PathType Leaf)){throw 'Indique o JSON privado da mensagem escolhida por caminho absoluto.'}
if($Attachments -and (-not [IO.Path]::IsPathRooted($Attachments) -or -not (Test-Path -LiteralPath $Attachments -PathType Leaf))){throw 'Indique o manifesto privado de anexos por caminho absoluto.'}
$keys=@('INTEGRATION_SECRET','ESTRELAS_SITES_SERVICE_TOKEN','ESTRELAS_SITE_URL','ESTRELAS_ENABLE_SEND','ESTRELAS_LOCAL_TEST','ESTRELAS_TEST_SEND_GRANT')
$previous=@{}
foreach($key in $keys){$previous[$key]=[Environment]::GetEnvironmentVariable($key,'Process')}
try {
    $vault=Join-Path $env:USERPROFILE '.openclaw/estrelas-compras/secrets.dpapi'
    $protected=(Get-Content -LiteralPath $vault -Raw).Trim() | ConvertTo-SecureString
    $credentials=[System.Net.NetworkCredential]::new('',$protected).Password | ConvertFrom-Json
    $env:INTEGRATION_SECRET=$credentials.integrationSecret
    $env:ESTRELAS_SITES_SERVICE_TOKEN=$credentials.serviceToken
    $env:ESTRELAS_SITE_URL='https://ceea.colegioestrelas.com'
    $env:ESTRELAS_ENABLE_SEND='false'
    $env:ESTRELAS_LOCAL_TEST='false'
    $env:ESTRELAS_TEST_SEND_GRANT=$null
    $cliArgs=@((Join-Path $PSScriptRoot 'select-message.mjs'),'--file',$File,'--message-id',$MessageId,'--actor',$Actor,'--reason',$Reason,'--submit')
    if($RequestId){$cliArgs+=@('--request-id',$RequestId)}
    if($Attachments){$cliArgs+=@('--attachments',$Attachments)}
    # One explicit inbox import only. Never starts a runner, polls, or sends WhatsApp.
    & node @cliArgs
    if($LASTEXITCODE -ne 0){throw 'Importação selecionada não confirmada.'}
} catch {
    Write-Error 'Não foi possível importar a seleção. Confira os arquivos indicados e o acesso privado da ponte; nenhuma conversa adicional foi importada.'
    exit 1
} finally {
    $credentials=$null
    $protected=$null
    foreach($key in $keys){[Environment]::SetEnvironmentVariable($key,$previous[$key],'Process')}
}
