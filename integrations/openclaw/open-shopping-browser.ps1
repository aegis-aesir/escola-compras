$ErrorActionPreference = 'Stop'
$cli = Join-Path $env:APPDATA 'npm/node_modules/openclaw/openclaw.mjs'
if ($env:OPENCLAW_CLI_PATH) { $cli = $env:OPENCLAW_CLI_PATH }
if (-not (Test-Path -LiteralPath $cli)) { throw 'OpenClaw não localizado. Configure OPENCLAW_CLI_PATH.' }
# Login is performed by the user in the visible dedicated browser. Never request
# passwords or copy cookies into the project, process arguments, or hosted Site.
& node $cli browser --browser-profile compras open 'https://www.mercadolivre.com.br'
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível abrir o perfil compras. Confira o gateway e INTEGRACOES.md.' }
