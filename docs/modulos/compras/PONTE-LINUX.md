# Ponte de Compras no CT 105

O gateway do OpenClaw no contêiner usa o endereço local `127.0.0.1:18789`.
Instale a pasta versionada `integrations/openclaw/` em `/opt/ceea-compras/bridge`, com os arquivos pertencendo ao root. Instale `ceea-compras-bridge.service` em `/etc/systemd/system/`. Valide com `systemd-analyze verify /etc/systemd/system/ceea-compras-bridge.service`.

A unidade roda como `agente` e exige a presença de `/etc/ceea-compras/bridge-enabled`. No CT 105, a partida automática foi autorizada em 25/11/2026 e configurada com `systemctl add-wants multi-user.target ceea-compras-bridge.service`. Para pausar, remova a trava e pare o serviço. O comando da unidade fixa o envio, o navegador de compras e a conferência de frete no checkout como desativados. Também retira a autorização de teste e a leitura de pastas de mensagens, mantendo disponível a seleção explícita pelo painel.

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


Em 26/11/2026, a configuração do Proxmox confirmou `onboot: 1` no CT 105. O contêiner já está configurado para subir com o host. Dentro do contêiner, o systemd inicia o gateway e a ponte se a trava da ponte estiver presente.

## Alerta externo por e-mail

O runner registra um sinal assinado a cada 30 segundos, em paralelo ao processamento da fila. O Site expõe apenas o horário desse sinal em `GET /api/integrations/bridge/health`. A consulta usa `Authorization: Bearer` com um segredo exclusivo (`BRIDGE_MONITOR_SECRET`), distinto do segredo HMAC da ponte. Se a hospedagem exigir autenticação adicional, use uma credencial de serviço própria para o monitor.

Ordem de ativação:

1. Provisionar `BRIDGE_MONITOR_SECRET` no Site e publicar a revisão. Usar um valor aleatório de pelo menos 32 caracteres.
2. Atualizar o `runner.mjs` instalado no CT 105 e reiniciar apenas a unidade da ponte. Verificar um horário recente no endpoint autenticado antes de ligar o monitor.
3. No CT 110 (Dashboard HomeLab), instalar `bridge-monitor.py` em `/opt/ceea-compras-monitor/` e as unidades `ceea-compras-monitor.service` e `ceea-compras-monitor.timer` em `/etc/systemd/system/`.
4. Criar `/etc/ceea-compras-monitor/monitor.env` com proprietário root e permissão `0600`. Definir `BRIDGE_MONITOR_SITE`, `BRIDGE_MONITOR_SECRET`, `BRIDGE_ALERT_TO` (um e-mail ou dois separados por vírgula) e `BRIDGE_SMTP_HOST`. Usar `BRIDGE_MONITOR_SITES_TOKEN` se exigido pelo Sites e `BRIDGE_SMTP_USER` e `BRIDGE_SMTP_PASSWORD` para SMTP autenticado. Definir `BRIDGE_ALERT_FROM` quando o remetente for um alias autorizado, diferente do login SMTP. Se ficar vazio, o monitor usa o login como remetente. O padrão é STARTTLS na porta 587. Para TLS implícito, definir `BRIDGE_SMTP_TLS=implicit`; a porta padrão nesse modo é 465. `BRIDGE_SMTP_PORT` permite indicar a porta do provedor.
5. Conferir o serviço e o timer com `systemd-analyze verify`. Recarregar as unidades e ativar com `systemctl enable --now ceea-compras-monitor.timer`. Confirmar dois ciclos no journal e uma resposta recente do Site.

O monitor verifica a cada 30 segundos. Após 120 segundos sem contato, ele tenta enviar um aviso a cada destinatário. Na recuperação, avisa quem já recebeu o alerta. A entrega depende do SMTP. Erros de consulta ao Site aparecem no journal do monitor. Para simular uma falha ou recuperação, rode os testes locais com transporte fictício.

### Ativação em produção — 26/11/2026

Publicada no Site existente a versão 2026.11.26.1, SHA `47dae9ddef8b1408ed453cbec4e1474ab0b4522f`, versão Sites 73 e ambiente 9. A consulta de saúde retornou HTTP 401 sem credencial e HTTP 200 com credencial. O runner do CT 105 foi atualizado e o CT 110 confirmou um sinal recente. O gateway e a ponte ficaram ativos e o envio de WhatsApp permaneceu bloqueado. O timer do CT 110 está ativo e habilitado, com execução automática bem-sucedida a cada 30 segundos. Foi enviado um único teste real. A caixa de entrada confirmou o recebimento por IMAP, mas o Gmail exibiu o login victor@colegioestrelas.com como remetente, apesar de o monitor ter enviado com o From proxmox@colegioestrelas.com. A habilitação do alias em Enviar e-mail como no Gmail segue pendente. Nenhuma queda foi simulada.

## Publicação da estimativa E1 — 26/11/2026

Publicada a versão **2026.11.26.2** do CEEA Manager, SHA `21d0a9c1f319217fa7e001ed57529d9b45b41918`, versão Sites **74**, ambiente **9**, implantação `appgdep_6b082efcb8b0819180c7a8435a21bd5d`. O projeto existente, a audiência pública e os vínculos D1 e R2 foram preservados. Nenhuma migração foi aplicada. O CT 110 recebeu HTTP 200 do endpoint de saúde usando a credencial existente.

Após a publicação, somente `price-evidence.mjs`, `client.mjs` e `agent-estimator.mjs` foram atualizados no CT 105. Os hashes coincidiram com o SHA publicado. A unidade da ponte reiniciou às 13h12min33s UTC em menos de um segundo e concluiu o primeiro ciclo às 13h12min39s UTC, sem tarefas na fila. O protocolo `criteria-v1`, a trava de ativação e `ESTRELAS_ENABLE_SEND=false` foram conferidos. O gateway manteve o mesmo processo e respondeu HTTP 200. O monitor leu um sinal gravado depois do reinício, e não houve registro de aviso.

`handler.js` e `select-message.mjs` têm versões anteriores da importação de mensagem selecionada no CT 105. As diferenças foram informadas à coordenação antes da atualização e esses arquivos foram preservados. A validação de uma solicitação real da estimativa fica para uso da coordenação.

## Frete conferido no checkout (desligado) — 27/11/2026

`ESTRELAS_BROWSER_CHECKOUT_FREIGHT=true` permite à ponte ir até a tela de entrega do checkout do Mercado Livre para ler o frete real, **sem concluir compra** (regras e travas em `INTEGRACOES.md`, "Frete conferido no checkout"). Só vale com `ESTRELAS_BROWSER_RESEARCH=true`, e a unidade versionada fixa as duas como `false` no `ExecStart`. Para ligar, somente com autorização do usuário e pelo coordenador: (1) confirmar que a conta `compras` do Mercado Livre não tem cartão salvo, compra com 1 clique nem saldo no Mercado Pago, e que o endereço padrão é o CEP 69086-665; (2) trocar no `ExecStart` as duas chaves para `true` (não colocá-las no `bridge.env`, pois o `ExecStart` prevalece); (3) `systemctl daemon-reload` e reiniciar a ponte; (4) acompanhar a primeira estimativa real e, na conta, conferir que não há pedido criado. Para desligar, voltar as chaves para `false` e reiniciar. Risco residual: "Comprar agora" pode deixar uma sessão de checkout pendente na conta (não é pedido); caminhos de checkout diferentes de `www.mercadolivre.com.br/checkout/…` ou `/gz/checkout/…` fazem a etapa parar; layout novo pode levar a parada precoce, mantendo o frete anterior.

## Rota Hermes para Pesquisa Web

A ponte aceita `ESTRELAS_RESEARCH_BACKEND=hermes` e `ESTRELAS_HERMES_SSH_HOST=10.0.1.27` no arquivo de ambiente do CT 105. O padrão é `openclaw`. No Hermes, a conta SSH dedicada `compras-pesquisa` só aceita a operação fixa `pesquisa-publica` a partir da origem do CT 105. A chave exclusiva e a chave pública fixada do host ficam em `/home/agente/.ssh/ceea-hermes/`. A identidade do host deve ser obtida por console confiável.

Para aplicar, validar primeiro a busca, a leitura e a análise com dados de teste e sem consultar a fila real. Guardar cópias de `client.mjs` e `bridge.env`, instalar `client.mjs` e `hermes-research.mjs` da mesma revisão, configurar as duas variáveis e reiniciar somente a ponte. As opções de navegador e checkout precisam estar desligadas para esta rota. Verificar o protocolo `criteria-v1`, o primeiro ciclo, o sinal recebido no CT 110 e os bloqueios de envio. A rota de WhatsApp permanece no OpenClaw.

Para voltar, remover `ESTRELAS_RESEARCH_BACKEND` ou definir `openclaw`, reiniciar somente a ponte e conferir o primeiro ciclo e o monitor. Uma falha do Hermes retorna erro à fila pela regra existente de retry. A ponte não muda de provedor automaticamente.

### Lojas conhecidas na estimativa (E1, ticket 09)

Na estimativa, a ponte analisa primeiro as páginas de lojas nacionais conhecidas e depois os demais resultados, na ordem da busca. Lista padrão, em ordem de prioridade: `mercadolivre.com.br`, `magazineluiza.com.br`, `amazon.com.br`, `kabum.com.br`, `leroymerlin.com.br` (subdomínios contam; domínios parecidos não). Para trocar a lista sem mudar código, definir `ESTRELAS_KNOWN_STORES` no arquivo de ambiente do CT 105 com domínios separados por vírgula; `none` desliga a priorização. Reiniciar somente a ponte. Sem loja conhecida nos resultados, o comportamento é o anterior. Teste: `node --test integrations/openclaw/known-stores.test.mjs`.
