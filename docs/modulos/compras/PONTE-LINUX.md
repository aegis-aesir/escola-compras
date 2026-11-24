# Ponte de Compras no CT 105

O gateway do OpenClaw no contêiner usa o endereço local `127.0.0.1:18789`.
Instale a pasta versionada `integrations/openclaw/` em `/opt/ceea-compras/bridge`, com os arquivos pertencendo ao root. Instale `ceea-compras-bridge.service` em `/etc/systemd/system/`. Valide com `systemd-analyze verify /etc/systemd/system/ceea-compras-bridge.service`.

A unidade roda como `agente`, não tem partida automática e exige a presença explícita de `/etc/ceea-compras/bridge-enabled`. Durante a operação pausada, deixe esse arquivo ausente e o serviço inativo. O comando da unidade fixa o envio e o navegador de compras como desativados. Também retira a autorização de teste e a leitura de pastas de mensagens, mantendo disponível a seleção explícita pelo painel.

O arquivo `/etc/ceea-compras/bridge.env` deve pertencer ao root e ter permissão `0600`. Provisionar por canal seguro `INTEGRATION_SECRET`, `ESTRELAS_SITES_SERVICE_TOKEN` e `OPENCLAW_GATEWAY_TOKEN`. Defina `ESTRELAS_SITE_URL=https://ceea.colegioestrelas.com` e `OPENCLAW_CLI_PATH` para o arquivo JavaScript real do CLI instalado, pois o estimador o executa com Node. Não reutilize o caminho do lançador Windows, nem inclua segredos no Git.

Antes de retomar, confirme que existe somente uma ponte ativa, que a conta WhatsApp institucional tem o identificador `operacional` e que os agentes `pesquisa-web` e `operacional` estão disponíveis no CT. O agente antigo `coordinator` não precisa ser recriado. Confirme a situação de resultados pendentes no Windows sem reenfileirar ou enviar contatos antigos e preserve o histórico. Depois da autorização de retomada, confira o primeiro contato autenticado pelo painel **Agente WhatsApp**. O envio real requer liberação separada.

## Instalação verificada

A unidade foi instalada no CT 105 e foi validada como `loaded`, `inactive` e `static`. A trava permanece ausente. O gateway respondeu HTTP 200 no loopback após a instalação. O arquivo de ambiente foi criado com proprietário root e permissão `0600`, contendo apenas a URL do Site e o caminho verificado do CLI em `/home/agente/.openclaw/tools/node-v24.22.1/lib/node_modules/openclaw/openclaw.mjs`.

Ainda é necessário provisionar as credenciais de serviço e preparar a conta e os agentes no gateway. Na checagem anterior à instalação, o número institucional aparecia conectado na conta de canal `default`. Esse identificador é diferente do agente antigo `coordinator`. Nenhum vínculo de WhatsApp ou agente foi alterado na instalação da unidade.
