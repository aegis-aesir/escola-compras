# Ponte de Compras no CT 105

O gateway do OpenClaw no contêiner usa o endereço local `127.0.0.1:18789`.
Instale a pasta versionada `integrations/openclaw/` em `/opt/ceea-compras/bridge`, com os arquivos pertencendo ao root. Instale `ceea-compras-bridge.service` em `/etc/systemd/system/`. Valide com `systemd-analyze verify /etc/systemd/system/ceea-compras-bridge.service`.

A unidade roda como `agente` e exige a presença de `/etc/ceea-compras/bridge-enabled`. No CT 105, a partida automática foi autorizada em 25/11/2026 e configurada com `systemctl add-wants multi-user.target ceea-compras-bridge.service`. Para pausar, remova a trava e pare o serviço. O comando da unidade fixa o envio e o navegador de compras como desativados. Também retira a autorização de teste e a leitura de pastas de mensagens, mantendo disponível a seleção explícita pelo painel.

O arquivo `/etc/ceea-compras/bridge.env` deve pertencer ao root e ter permissão `0600`. Provisionar por canal seguro `INTEGRATION_SECRET`, `ESTRELAS_SITES_SERVICE_TOKEN` e `OPENCLAW_GATEWAY_TOKEN`. Defina `ESTRELAS_SITE_URL=https://ceea.colegioestrelas.com` e `OPENCLAW_CLI_PATH` para o arquivo JavaScript real do CLI instalado, pois o estimador o executa com Node. Não reutilize o caminho do lançador Windows, nem inclua segredos no Git.

Antes de retomar, confirme que existe somente uma ponte ativa, que a conta WhatsApp institucional tem o identificador `operacional` e que os agentes `pesquisa-web` e `operacional` estão disponíveis no CT. O agente antigo `coordinator` não precisa ser recriado. Confirme a situação de resultados pendentes no Windows sem reenfileirar ou enviar contatos antigos e preserve o histórico. Depois da autorização de retomada, confira o primeiro contato autenticado pelo painel **Agente WhatsApp**. O envio real requer liberação separada.

## Instalação verificada

A unidade foi instalada no CT 105 e foi validada como `loaded`, `inactive` e `static`. A trava permanece ausente. O gateway respondeu HTTP 200 no loopback após a instalação. O arquivo de ambiente foi criado com proprietário root e permissão `0600`, contendo apenas a URL do Site e o caminho verificado do CLI em `/home/agente/.openclaw/tools/node-v24.22.1/lib/node_modules/openclaw/openclaw.mjs`.

Na checagem anterior à instalação, o número institucional aparecia conectado na conta de canal `default`. Esse identificador é diferente do agente antigo `coordinator`. Nenhum vínculo de WhatsApp ou agente foi alterado na instalação da unidade.

## Roteamento preparado

Em 24/11/2026, o fragmento `/etc/ceea-compras/routing-proposed.json` foi validado em um perfil isolado pelo OpenClaw 2026.11.6 e guardado no CT como root com permissão `0600`. Ele usa `agents.entries` e mantém `main` como agente padrão. Registra `pesquisa-web` com a ferramenta de mensagens bloqueada e vincula a conta `operacional` do WhatsApp ao agente do mesmo nome. A conta institucional proposta aponta para o diretório de sessão existente e preserva o modo de conversa consigo mesmo. Nenhuma credencial foi incluída no fragmento.

Aplicar o fragmento como mesclagem, preservando os modelos, configurações de acesso e demais opções da configuração ativa. Trocar o identificador da conta pode reconectar o WhatsApp. Conferir a política de acesso e a identidade da conta após a aplicação. A validação de esquema não testa a conexão nem o comportamento dos agentes. O fragmento permanece fora da configuração ativa.

## Credenciais instaladas

O token de serviço foi emitido novamente e o segredo HMAC foi trocado no Sites. A versão 70, commit `7c9e242`, foi republicada com a revisão 8 do ambiente, sem alteração no código servido. As três credenciais da ponte ficaram no arquivo privado no CT, com proprietário root e permissão `0600`.

Do CT, a API recusou uma assinatura inválida (401) e aceitou a nova assinatura antes de retornar operação desconhecida (400). O teste não percorreu a fila. A unidade permaneceu inativa, estática e sem trava de ativação criada. O gateway continuou saudável. O roteamento ativo foi verificado em uma etapa separada, abaixo.

## Roteamento ativo

A mesclagem foi validada primeiro em modo de simulação sobre a configuração real. Depois de aplicar, o OpenClaw validou o arquivo sem avisos. O gateway manteve o mesmo processo e respondeu HTTP 200. A consulta ao gateway listou `main`, `pesquisa-web` e `operacional`. O WhatsApp informou que `operacional` estava vinculado e conectado ao número institucional e que `default` estava desativado. A sessão existente foi reutilizada.

A unidade de Compras permaneceu inativa e sem arquivo de ativação. A verificação consultou o estado dos agentes e do canal. A fila e o envio de cotações poderão ser avaliados após autorização de retomada.

## Retomada autorizada

Em 24/11/2026, a ponte foi iniciada manualmente no CT 105. O primeiro ciclo autenticado terminou às 14h52 UTC (10h52 em Manaus), com zero tarefas processadas. O processo foi conferido com o envio bloqueado e sem autorização de envio de teste. Nesse momento a unidade ainda era estática e dependia de início manual. Não foram observados processos da ponte na Work. A autorização atual cobre a execução da ponte com o bloqueio de envios.


## Alerta externo por e-mail

O runner registra um sinal assinado a cada 30 segundos, em paralelo ao processamento da fila. O Site expõe apenas o horário desse sinal em `GET /api/integrations/bridge/health`. A consulta usa `Authorization: Bearer` com um segredo exclusivo (`BRIDGE_MONITOR_SECRET`), distinto do segredo HMAC da ponte. Se a hospedagem exigir autenticação adicional, use uma credencial de serviço própria para o monitor.

Ordem de ativação:

1. Provisionar `BRIDGE_MONITOR_SECRET` no Site e publicar a revisão. Usar um valor aleatório de pelo menos 32 caracteres.
2. Atualizar o `runner.mjs` instalado no CT 105 e reiniciar apenas a unidade da ponte. Verificar um horário recente no endpoint autenticado antes de ligar o monitor.
3. No CT 110 (Dashboard HomeLab), instalar `bridge-monitor.py` em `/opt/ceea-compras-monitor/` e as unidades `ceea-compras-monitor.service` e `ceea-compras-monitor.timer` em `/etc/systemd/system/`.
4. Criar `/etc/ceea-compras-monitor/monitor.env` com proprietário root e permissão `0600`. Definir `BRIDGE_MONITOR_SITE`, `BRIDGE_MONITOR_SECRET`, `BRIDGE_ALERT_TO` (um e-mail ou dois separados por vírgula) e `BRIDGE_SMTP_HOST`. Usar `BRIDGE_MONITOR_SITES_TOKEN` se exigido pelo Sites e `BRIDGE_SMTP_USER` e `BRIDGE_SMTP_PASSWORD` para SMTP autenticado. Definir `BRIDGE_ALERT_FROM` quando o remetente for um alias autorizado, diferente do login SMTP. Se ficar vazio, o monitor usa o login como remetente. O padrão é STARTTLS na porta 587. Para TLS implícito, definir `BRIDGE_SMTP_TLS=implicit`; a porta padrão nesse modo é 465. `BRIDGE_SMTP_PORT` permite indicar a porta do provedor.
5. Conferir o serviço e o timer com `systemd-analyze verify`. Recarregar as unidades e ativar com `systemctl enable --now ceea-compras-monitor.timer`. Confirmar dois ciclos no journal e uma resposta recente do Site.

O monitor verifica a cada 30 segundos. Após 120 segundos sem contato, ele tenta enviar um aviso a cada destinatário. Na recuperação, avisa quem já recebeu o alerta. A entrega depende do SMTP. Erros de consulta ao Site aparecem no journal do monitor. Para simular uma falha ou recuperação, rode os testes locais com transporte fictício.
