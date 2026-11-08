param([switch]$Once)
$ErrorActionPreference = 'Stop'
$bridgeHome = Join-Path $env:USERPROFILE '.openclaw/estrelas-compras'
$vaultPath = Join-Path $bridgeHome 'secrets.dpapi'
$mutex = [System.Threading.Mutex]::new($false, 'Local\ColegioEstrelasOpenClawBridge')
$locked = $false
try {
    $locked = $mutex.WaitOne(0)
    if (-not $locked) { throw 'A ponte já está em execução.' }
    $protected = (Get-Content -LiteralPath $vaultPath -Raw).Trim() | ConvertTo-SecureString
    $credentials = [System.Net.NetworkCredential]::new('', $protected).Password | ConvertFrom-Json
    $gatewayConfig = Get-Content -LiteralPath (Join-Path $env:USERPROFILE '.openclaw/openclaw.json') -Raw | ConvertFrom-Json
    $env:INTEGRATION_SECRET = $credentials.integrationSecret
    $env:ESTRELAS_SITES_SERVICE_TOKEN = $credentials.serviceToken
    $env:OPENCLAW_GATEWAY_TOKEN = $gatewayConfig.gateway.auth.token
    $env:OPENCLAW_GATEWAY_URL = 'http://127.0.0.1:18789'
    $env:ESTRELAS_SITE_URL = 'https://compras-escola-aegis.col-gio-estr-8349.chatgpt.site'
    $env:ESTRELAS_STATE_DIR = Join-Path $bridgeHome 'state'
    $env:ESTRELAS_INBOX_DIR = Join-Path $bridgeHome 'inbox'
    $env:ESTRELAS_ENABLE_SEND = 'false'
    $env:ESTRELAS_BROWSER_RESEARCH = 'true'
    $env:ESTRELAS_LOCAL_TEST = 'false'
    $runner = Join-Path $PSScriptRoot 'runner.mjs'
    if ($Once) { & node $runner } else { & node $runner --loop }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} catch {
    Write-Error 'Ponte indisponível. Confira o cofre privado, o gateway e INTEGRACOES.md. Nenhuma credencial foi exibida.'
    exit 1
} finally {
    foreach ($key in @('INTEGRATION_SECRET','ESTRELAS_SITES_SERVICE_TOKEN','OPENCLAW_GATEWAY_TOKEN')) {
        [Environment]::SetEnvironmentVariable($key, $null, 'Process')
    }
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
