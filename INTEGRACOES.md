# OpenClaw — Colégio Estrelas

Conta: `operacional`. Número: `+559292017107`.
Projeto e hospedagem existentes foram preservados.

**Regra vigente de 17/11/2026:** operação pausada por solicitação do usuário. Não iniciar/reiniciar gateway, ponte ou tarefas agendadas para aplicar esta entrega. Recebimento só por seleção individual, conforme [WHATSAPP-SELECIONADO.md](docs/modulos/compras/WHATSAPP-SELECIONADO.md). Esta regra substitui orientações antigas de captura e reinício abaixo.

## Separação das tarefas entre agentes

- `pesquisa-web`: pesquisa web, descoberta de fornecedores locais/nacionais, leitura por `web_fetch`, navegador de pesquisa `compras` e análise estruturada das estimativas.
- `operacional`: WhatsApp da conta `operacional`, número exato `+559292017107`; envios somente autorizados, respostas e anexos recebidos no canal existente.
- A conta pessoal `default` foi desativada e despareada. Não reativar, parear ou usar como fallback. Esta mudança não modifica canais, modelos, provedores ou credenciais do OpenClaw.

A ponte envia `agentId` e `sessionKey` explícitos em `/tools/invoke`. Sessões de ferramentas são isoladas por pedido; a análise mantém sessão própria por tarefa/lease. Não depender do agente principal do gateway. Falhas do pesquisa-web permanecem pendentes/com erro para revisão, sem transferir pesquisas ao operacional.

As chaves das tarefas, leases, confirmações, registros por pedido, assinaturas e os dois bloqueios de envio continuam iguais. Resultados pendentes são confirmados pelo journal existente; não limpar nem reenfileirar envios para aplicar esta alteração.

Mensagens e anexos só entram no sistema por indicação explícita de cada mensagem. O hook de recebimento não captura conteúdo; o runner ignora backlog legado sem seleção. Veja docs/modulos/compras/WHATSAPP-SELECIONADO.md para painel e CLI. Anexos selecionados ficam no R2 privado; não são enviados à pesquisa-web nem executados. Extração binária/OCR não é automática; texto extraído pode ser indicado explicitamente. Propostas permanecem preliminares até confirmação Master/ADM. O upload privado do pedido permanece disponível.

Validação sem contato externo: `node --test scripts/agent-routing-test.mjs`, `node --test scripts/openclaw-test.mjs`, `node scripts/price-evidence-test.mjs`, `node scripts/integration-test.mjs` e `node scripts/automatic-estimate-test.mjs`. O transporte de envio do teste é inteiramente simulado: nenhuma chamada real à ferramenta de mensagens.

Referência: [API de ferramentas do gateway](https://docs.openclaw.ai/gateway/tools-invoke-http-api).

## Funcionamento

### Seleção múltipla e modelo genérico de cotação — 13/11/2026

**Preparar mensagem** lista, por checkbox, os fornecedores cadastrados compatíveis com o material/serviço e segmento do item. Nenhum contato é selecionado automaticamente. `quoting` oferece somente locais; `national` admite locais e nacionais. Fontes externas precisam de conferência e cadastro, e categorias ausentes de itens legados não são inferidas. O detalhamento do direcionamento de manutenção está em Descoberta de fornecedores abaixo.

O painel exibe um único modelo do pedido aprovado, com `{{contato}}`. A confirmação chama `prepare_openclaw` com `supplierIds` (1 a 100 IDs únicos); o servidor valida toda a seleção, compatibilidade, etapa e telefones antes de preparar as tarefas pela função idempotente existente. O contrato singular `supplierId` continua aceito para clientes anteriores. Master/ADM, versão e bloqueios de arquivamento/fechamento continuam verificados pela API. Selecionar contatos e copiar o modelo não chama esse endpoint.

Cada tarefa nova guarda `quotationTemplate: {version: 'contact-v1', text, contact}`. No despacho, a ponte substitui somente o marcador inicial do contato, mantendo literalmente itens, quantidades, prazo e condições. É personalização determinística do cumprimento pelo contato/nome cadastrado, sem reescrita livre por IA, pesquisa ou mudança de modelo/credencial. O destinatário, conta `operacional`, número +55 92 9201-7107, roteamento, idempotencyKey e confirmação do provedor permanecem os existentes.

Compatibilidade: `message` continua contendo a mensagem completa e endereçada para pontes anteriores; não contém o marcador genérico. Tarefas antigas sem `quotationTemplate` continuam enviando seu `message` original. Atualizar a ponte para usar a personalização no despacho sem limpar journals, reenfileirar envios incertos, alterar credenciais ou ativar chaves de envio. Esta mudança não habilita envio: ambas as chaves continuam obrigatórias, e o ambiente local permanece bloqueado. Preparação não é confirmação de envio.

Testes sem contato externo: `node scripts/quotation-suppliers-test.mjs`, `node scripts/quotation-message-ui-test.mjs` e, com o servidor local de Compras em 127.0.0.1:5185, `node scripts/quotation-suppliers-http-test.mjs`. O teste HTTP recusa execução se o envio estiver habilitado no servidor local; o transporte da ponte é simulado integralmente nos testes isolados.

O Site mantém tarefas no D1. A ponte local consulta a fila por HTTPS assinado
com HMAC-SHA256 e chama o OpenClaw pelo endereço local `127.0.0.1:18789`.
Não é necessário expor o gateway à internet. A ponte usa sua assinatura HMAC;
a credencial de serviço existente é mantida para compatibilidade com a hospedagem.
A entrada web agora usa login local, sem ChatGPT. Sessões dos funcionários e
autenticação da ponte são controles independentes; consulte `ACESSOS-LOCAIS.md`.

Pesquisa: `web_search` retorna fontes com data para conferência. Tanto listas
de resultados quanto citações do Perplexity são aceitas. Respostas sintetizadas
não são usadas como preços comprovados. A administração confere a página e
registra preço unitário, embalagem e data na estimativa; o frete estimado segue a regra
do ticket 06 (percentual padrão do Master, a conferir, ou valor manual por item).
Estimativa continua separada de proposta comercial real.

WhatsApp: depois da aprovação da necessidade, a administração prepara uma
cotação para um fornecedor permitido na etapa. O envio exige as duas chaves
de ativação. Somente uma confirmação com identificador de mensagem registra
o contato local e inicia o prazo. Não há teto ou reaprovação por preço real.

Recebimento: o hook não captura conteúdo. O operador/ADM indica cada mensagem explicitamente pela CLI ou pelo painel; anexos precisam de seleção individual. O servidor exige selected-message-v1 antes de gravar. A mensagem gera proposta preliminar; a administração confere e confirma com as regras normais de cotação.

A ponte usa diretamente `https://ceea.colegioestrelas.com`; não usar o endereço antigo, pois ele responde com redirecionamento e o cliente bloqueia redirecionamentos por segurança. A ponte verifica prazos mesmo com o painel fechado, enquanto o computador
estiver ligado, conectado e com a ponte em execução. Após um dia útil sem
proposta válida, libera a etapa nacional e enfileira a pesquisa. Usa o calendário
da escola e o fuso America/Manaus.

## Descoberta de fornecedores

**Materiais versus serviços de manutenção (13/11/2026):** `supplierCategoryForItem` deriva somente o segmento de fornecimento, sem gravar no pedido. Categorias explícitas de materiais/serviços prevalecem; para categorias amplas de manutenção, nomes objetivos de produtos e de instalação/conserto/mão de obra ajudam a distinguir o fornecimento. Sem categoria ou com descrição ambígua, a administração precisa conferir. Compra de registro/torneira procura lojas de materiais de construção, hidráulica, ferragens, homecenter e utilidades, conforme categoria comercial ou evidência de varejo no nome do fornecedor. Prestadores cadastrados apenas como Manutenção não atendem automaticamente a materiais. Empresas com categorias explícitas de materiais e serviços mantêm as duas possibilidades; prestadores hidráulicos com evidência de serviço continuam atendendo instalação hidráulica.

`requestSupplierCategories` fornece os segmentos derivados à descoberta, elegibilidade da fila e cadastro de fontes conferidas. As consultas de materiais incluem a descrição do item e termos de venda/lojas, sem tratar prestador como estoque de materiais. Uma empresa de serviços no cadastro não suprime a busca de lojas. `IntegrationJob.category` de uma descoberta passa a identificar o segmento de fornecimento; o item original mantém sua categoria. A conferência administrativa de uma fonte nova registra o fornecedor no segmento pesquisado, não no rótulo amplo Manutenção.

Pesquisas genéricas antigas e cotações **ainda na fila** que não correspondam ao segmento atual deixam de ser retiradas e são canceladas com auditoria no polling existente; registros e respostas anteriores permanecem no histórico. Mensagens concluídas ou de envio incerto não são apagadas nem reenviadas. A mesma compatibilidade vale na preparação singular, múltipla e antes da retirada da tarefa. Nenhuma chamada real é necessária para validar: `maintenance-suppliers-test.mjs` usa D1 temporário/fontes fictícias; `maintenance-suppliers-http-test.mjs` usa apenas a API local 127.0.0.1:5185, com envio desativado.

Cada item tem uma categoria, com sugestões compartilhadas com o cadastro de
fornecedores. Novas solicitações pedem a categoria; a administração pode preencher
as categorias dos pedidos antigos, sem alterar itens, quantidades ou aprovações.
Comparações ignoram caixa, acentos e espaços repetidos. Fora dos segmentos relacionados de manutenção descritos abaixo, categorias diferentes
não são presumidas equivalentes. No cadastro de fornecedor, categorias podem
ser separadas por vírgula ou ponto e vírgula; cada item tem uma categoria.

Depois da aprovação, a ponte consulta primeiro o banco interno para cada categoria
e abrangência. Um fornecedor local compatível evita busca externa naquela categoria.
Categorias sem cadastro geram uma única tarefa, mesmo com vários itens da mesma
categoria. O cadastro é consultado novamente antes da execução para evitar pesquisa
desnecessária após um fornecedor ser adicionado. Na etapa nacional, a mesma regra
usa fornecedores nacionais, respeitando o prazo local existente.

Para Manaus, a primeira pesquisa procura perfis de empresas no Google Maps. Páginas
de ajuda, preferências, marketing e links genéricos de busca não contam como empresas
encontradas. Sem perfil útil, o runner pesquisa outras fontes locais. Isso usa a
busca web do OpenClaw; não há conexão direta com a API Google Places nem garantia
de cobertura completa do Maps. Um atalho de busca no Maps também fica no painel,
identificado como navegação manual, separado das fontes efetivamente retornadas.

Fontes externas não são contatos verificados. A administração confere a empresa,
categoria, localização/atendimento e WhatsApp antes de salvar. O cadastro preserva
URL, data da pesquisa e responsável pela conferência, e passa a ser usado nas
buscas internas seguintes. Cadastrar fornecedor não enfileira nem envia mensagem.
Pedidos com itens de várias categorias ainda exigem conferência de quais itens
cada empresa atende; propostas e compras divididas permanecem fora desta versão.

## Configuração segura

- Site: `INTEGRATION_SECRET` (segredo de no mínimo 32 caracteres) e
  `WHATSAPP_SEND_ENABLED` (inicialmente `false`), pelas variáveis do Sites.
- Ponte: `INTEGRATION_SECRET`, `ESTRELAS_SITES_SERVICE_TOKEN`,
  `OPENCLAW_GATEWAY_TOKEN`, `ESTRELAS_SITE_URL`, `OPENCLAW_GATEWAY_URL`,
  `ESTRELAS_STATE_DIR`, `ESTRELAS_INBOX_DIR` e `ESTRELAS_ENABLE_SEND`.
- No Windows, `start-windows.ps1` lê o cofre DPAPI do usuário em
  `%USERPROFILE%/.openclaw/estrelas-compras/secrets.dpapi`. O cofre guarda
  `integrationSecret` e `serviceToken`; o token do gateway é lido da configuração
  privada já existente do OpenClaw. Nunca copiar esses valores para este projeto.
- DPAPI depende do mesmo usuário Windows e computador. Não colocar o cofre no
  NAS, Git ou arquivos de continuidade. Restrinja a pasta ao usuário e SYSTEM.
- O runner conhece `%USERPROFILE%/.openclaw/estrelas-compras/inbox`; o hook não grava conteúdo nessa pasta.
  A ponte guarda resultados pendentes na pasta irmã `state`.

Não compartilhar tokens no chat. A configuração do servidor deve ser publicada
para aplicar a revisão das variáveis. O launcher Windows mantém o envio desligado.
Uma liberação futura exige `WHATSAPP_SEND_ENABLED=true` no servidor e
`ESTRELAS_ENABLE_SEND=true` na ponte, após validar a operação com a escola.
Não usar `dryRun` do OpenClaw para testar envio: na versão 2026.10.10 ele é ignorado.

## Operação no Windows

Executar um ciclo, sem envio:

```powershell
powershell.exe -NoProfile -File ./integrations/openclaw/start-windows.ps1 -Once
```

Executar continuamente, com intervalo de 60 segundos:

```powershell
powershell.exe -NoProfile -File ./integrations/openclaw/start-windows.ps1
```

O launcher impede duas instâncias na mesma sessão Windows. A fila do servidor
também usa controle de versão para impedir que duas pontes assumam a mesma tarefa.
Nesta instalação, a tarefa `ColegioEstrelas-OpenClaw` foi configurada para iniciar
no logon do usuário Windows e manter a ponte oculta. Consulte seu estado no
Agendador de Tarefas; para interromper a ponte, encerre essa tarefa. O computador
deve permanecer ligado e o usuário conectado.
Para inicialização automática, use uma tarefa do Windows no logon deste usuário,
com janela oculta e sem credenciais nos argumentos. A ponte não executa se o
gateway não estiver disponível; resultados já confirmados não são reenviados.

Hook local: fazer backup e substituir offline somente handler.js e HOOK.md. O handler não tem dependências e não captura eventos. Não mudar pluginHooks, configuração do gateway ou políticas do canal para importar mensagens. O procedimento vigente de seleção explícita, anexos e instalação está em docs/modulos/compras/WHATSAPP-SELECIONADO.md. Nenhum reinício faz parte desta entrega.

## Falhas e conferência

Envio sem confirmação, timeout ou processamento interrompido vira **Envio incerto**.
Não repetir automaticamente. Conferir o WhatsApp e registrar o contato manual
quando houver evidência. Uma falha depois de enviar pode ter entregue a mensagem.
Os arquivos `.result.json` reenviam apenas a confirmação ao Site, não a mensagem.
Arquivos `.review` exigem conferência; `.done` são comprovantes processados.
Não apagar esses registros para tentar novamente.

O hook não captura respostas, mesmo quando o WhatsApp as recebe. Se uma resposta precisar entrar no sistema, indicar somente essa mensagem no painel/CLI; nunca importar a conversa ou backlog inteiro.

## Validação

```powershell
node --test scripts/openclaw-test.mjs
node scripts/integration-test.mjs
node scripts/supplier-discovery-test.mjs
node scripts/workflow-test.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/smoke-test.mjs
npm.cmd run build
```

O teste de integração usa D1 temporário isolado. Nesta worktree Compras, o smoke test exige servidor em
http://127.0.0.1:5185, conforme `.ceea-worktree.json`, e cria dados fictícios somente no banco local. A porta 5173 pertence ao coordenador. Nenhum teste envia
WhatsApp real. Pesquisa real pode consumir a franquia do provedor já configurado.

Referências: documentação instalada do OpenClaw 2026.10.10 e
https://docs.openclaw.ai/gateway/tools-invoke-http-api,
https://docs.openclaw.ai/automation/hooks/event-types.

Validação em 08/11/2026: sete testes da ponte, teste de regras com D1 isolado,
teste do fluxo completo local, TypeScript e build aprovados. Pesquisa real no
gateway retornou fontes do Perplexity. Hook instalado e elegível. Credenciais
configuradas no servidor e em cofre DPAPI. Publicação oficial no Site existente
concluída e contato autenticado da ponte confirmado no banco de produção.
Nenhuma mensagem foi enviada a fornecedores nos testes. Conferência visual
automatizada indisponível nesta sessão por ausência de navegador conectado.

Atualização de descoberta: testes da consulta interna, categorias, cadastro por
fonte, concorrência e cancelamento de pesquisas antigas aprovados. Teste real de
papelarias em Manaus confirmou fallback para fontes locais quando a busca Maps
retornou apenas páginas genéricas. Não foram cadastrados contatos fictícios nem
enviadas mensagens em produção.
# Importação administrativa de fornecedores

A operação assinada `import_suppliers` da ponte recebe `batch: {source, contacts}` com até 100 fornecedores previamente conferidos. Cada contato inclui nome (`name`), telefone com DDI/DDD (`phone`), categoria (`category`), contato (`contact`), abrangência (`scope`), cidade (`city`) e UF (`state`). Exige os mesmos controles de acesso do Site privado e HMAC da ponte; não aceita chamadas anônimas. Usar apenas para lotes autorizados pela administração, nunca para cadastrar automaticamente resultados da web ou mensagens recebidas.

O servidor valida todo o lote antes de gravar, preserva registros existentes, deduplica por telefone com ou sem `+`, registra origem/data e histórico. Retorna contagens e resultados por índice: criado, existente ou conflito de categoria/abrangência. Repetir o lote não duplica os fornecedores. Não cria pesquisas, cotações ou mensagens. Arquivos de contatos e relatórios de importação permanecem privados em `outputs/`, fora do Git. Validação isolada: `node scripts/supplier-import-test.mjs`.


## Estimativas pelo agente pesquisa-web

### Critérios administrativos por item (13/11/2026)

Master e Diretoria Administrativa revisam os critérios pré-preenchidos antes de iniciar: descrição/termos de busca, requisitos mínimos, autorização de similares e marca/modelo obrigatório ou apenas referência. O padrão não autoriza similares. O objeto `estimateCriteria` é separado de `items` e `form`; preserva o item original, autoria, data e revisão por item, com histórico em `estimateCriteriaHistory`. Alterações só antes do encaminhamento à DG, com versão e mês aberto.

`research` com o array de critérios salva e inicia a pesquisa; `research_item` salva/refaz somente a revisão de um item, preservando resultados atuais dos demais. Ambos colocam o pedido em `estimating`; preços completos retornam a `admin_review`. O histórico preserva estimativa anterior, se houver. Resultados de outra revisão, especificação ou critérios não preenchem a estimativa atual. Os critérios não autorizam compra nem substituem o pedido do setor.

A fila mantém `item` original e transporta `researchItem` e `researchCriteria` autorizados. Navegador compras e busca web usam o alvo ajustado; pesquisa-web recebe original e critérios, mantém unidade/quantidade e exige evidências literais de preço e requisitos. Sem autorização de similares, a identidade original continua obrigatória. Assinaturas mantêm a conferência de vigência existente. O cliente anuncia `researchProtocol: criteria-v1` no polling; pontes antigas não retiram tarefas com novos critérios. Atualizar os arquivos sem iniciar a tarefa Windows; preservar journals, cofre, conta operacional e bloqueios de envio. A retomada depende de autorização do usuário.

Validação sem mensagens externas: `estimate-criteria-test.mjs`, `estimate-criteria-http-test.mjs`, `estimate-criteria-ui-test.mjs`, `agent-routing-test.mjs`, `automatic-estimate-test.mjs` e `price-evidence-test.mjs`.

Resultados parciais (12/11/2026): o painel exibe preço unitário, subtotal, fonte e data dos itens já validados, mesmo enquanto outro item está pendente. Usa a mesma validação de evidências do servidor e somente resultados da revisão e especificação atuais. O subtotal parcial exclui frete e não libera a aprovação; o frete estimado por item entra na saída da Estimativa (E1 ticket 06, abaixo). Pesquisa já encerrada com pendências não aparece como ainda em processamento. Assinaturas continuam exigindo conferência de vigência antes de usar preços como referência. Teste: `node scripts/partial-estimate-ui-test.mjs`.

A ponte pesquisa fontes, lê até três páginas via `web_fetch` e passa trechos limitados ao agente existente `pesquisa-web` por `openclaw gateway call agent`. Usa o modelo/configuração já definidos para esse agente, com custo normal desse provedor. Não cria outro agente nem altera o atendimento WhatsApp. O CLI é localizado no caminho Windows padrão; `OPENCLAW_CLI_PATH` permite indicar outra instalação.

A execução utiliza sessão própria por processamento, `promptMode: minimal`, `extraSystemPrompt`, `disableMessageTool: true` e `deliver: false`. Não recebe credenciais do Site no subprocesso. O prompt instrui analisar apenas os textos fornecidos, não executar instruções de páginas nem usar ferramentas. A resposta JSON declara equivalência, moeda BRL, preço total, quantidade por embalagem, unidade e trechos literais. O servidor valida estrutura, fonte e evidências; a interpretação semântica é do agente e segue para conferência administrativa, não constitui aprovação de compra.

Saída parcial (26/11/2026, E1 ticket 02): quando todos os itens têm desfecho final na revisão atual — preço comprovado ou pendência de estimativa (análise concluída sem preço, ou tentativas esgotadas em `failed`) —, o servidor grava a estimativa por item (`estimate.lines`, ver `app/estimate-lines.ts`) e passa para a revisão da Diretoria Administrativa (`admin_review`). Tarefa na fila, em execução ou em nova tentativa não é desfecho; resultado antigo sem análise estruturada continua reenfileirado. Nunca segue à Diretoria Geral automaticamente, e o envio à DG é recusado (409) enquanto houver pendência. O total soma só os itens com preço e os fretes com valor (ticket 06); frete pendente fica fora do total e identificado. Pendências não ganham preços inventados; o painel mostra cada uma com o motivo. Estimativa em análise administrativa pode ser corrigida com histórico; após encaminhamento à diretoria geral essa edição fica bloqueada. Resultados antigos ou de itens alterados não sobrescrevem pedidos. O polling recupera projeções interrompidas sem duplicação.

Frete estimado por percentual (27/11/2026, E1 ticket 06): substitui "frete não apurado, fora do total" da saída parcial. O frete é calculado **no Site** (`withFreightLines` em `app/estimate-lines.ts`, usado por `projectAutomaticEstimates`, `projectItemResearch` e pelas ações da revisão); a ponte não muda e não envia frete. Cada item recebe a linha `kind:'freight'` com `itemIndex`, valor = percentual padrão (Configurações do Master: `freightPercent`, com o CEP comercial `schoolCep`, ambos nos ajustes da escola e com histórico) × subtotal do produto, origem `to_check`, motivo "Frete por percentual", `freightPercent` e `freightBasis`. Sem percentual configurado ou sem preço do produto: `pending` com motivo; assinaturas digitais: `not_applicable`. Frete `manual` nunca é recalculado; frete `accepted` só volta a ser calculado quando o subtotal do produto muda. Total = produtos + frete (cada frete uma vez; `estimate.freight` é a soma das linhas). O envio à DG é recusado (409) com frete pendente ou a conferir não aceito; a decisão da DG em pedidos já enviados não exige frete. Estimativas por item gravadas antes (linha única "Frete não apurado") continuam lidas; na revisão, **Calcular frete pelo percentual** (`estimate_freight_percent`) ou o frete manual por item as converte para linhas por item. Sem migração D1. O frete exibido pela loja e a simulação até o CEP ficam para o ticket 07. Teste: `node scripts/estimate-freight-percent-test.mjs`.

Marca "a conferir" (26/11/2026, E1 ticket 05): a regra compartilhada `classifyEvidence` (`integrations/openclaw/price-evidence.mjs`, usada pela ponte em `client.mjs` e pelo Site em `lib/integrations.ts`) devolve três desfechos: comprovado (a validação estrita de `extractReference`, inalterada), a conferir (preço total em BRL que aparece literalmente na página escolhida, mas com produto parecido, unidade/embalagem diferente ou trecho incompleto; vai com o motivo) e pendência (sem preço utilizável — preço que não aparece na página nunca vira valor). O agente de análise devolve `status:"to_check"` quando há preço com comprovação incompleta e `needs_review` só quando não há preço. A ponte encaminha a evidência a conferir e o Site decide de novo pela mesma regra. Ordem de publicação: **primeiro o Site** (que passa a aceitar `analysis.status:"to_check"` em `/complete`), **depois a ponte** — uma ponte nova falando com o Site antigo teria o resultado a conferir recusado na validação e a tarefa iria para nova tentativa. O protocolo anunciado não muda (`criteria-v1`); ponte antiga continua compatível com o Site novo.

Pesquisas de estimativa usam lease de 10 minutos para leitura/análise. A chamada ao agente tem orçamento de 120 segundos, espera do CLI de 160 segundos e limite de processo de 170 segundos. Falhas usam a política de até três tentativas existente. As pesquisas anteriores só de links são preservadas; o identificador `prices-agent-v1` inicia a extração para pedidos ainda em estimativa. Testes: `node scripts/price-evidence-test.mjs`, `node scripts/automatic-estimate-test.mjs` e os testes de integração existentes. Nenhuma mensagem real deve ser usada para validar esse fluxo.

## Mercado Livre com sessão no navegador

Perfil dedicado `compras`, gerenciado pelo OpenClaw no computador, com janela visível e sessão persistente fora do repositório. O usuário faz login diretamente nele. Abrir novamente: `powershell -File integrations/openclaw/open-shopping-browser.ps1`. O perfil foi criado pelo CLI e configurado com `browser.profiles.compras.headless=false`; não trocar o perfil padrão nem importar cookies de outros navegadores.

O launcher define `ESTRELAS_BROWSER_RESEARCH=true`. A ponte abre uma aba própria de busca no Mercado Livre, preservando nome, especificação e sinais do modelo (como S41+), confirma sinais visíveis de sessão e lê até dois anúncios. Somente URLs HTTPS de busca/anúncio permitidas; não há clique, preenchimento, carrinho, pagamento, contato ou acesso a páginas da conta. Abas de login do usuário não são fechadas. CAPTCHA, login expirado ou sessão não confirmada ficam como pendência; não contornar verificações do site.

A extração usa DOM renderizado do produto: título, preço, descrição e especificações. Não lê cookies, armazenamento, senhas ou formulários. Não exporta cabeçalho da conta nem endereço. Frete exibido é apenas informativo: quantidade e destino precisam de conferência antes de incorporá-lo ao total. O agente pesquisa-web continua responsável pela análise de equivalência/preço e pelas citações literais.

Páginas autenticadas têm prioridade. Com esse modo ativo, páginas públicas do Mercado Livre não são usadas silenciosamente em substituição à sessão. Outras lojas continuam disponíveis como fontes públicas. O painel mostra `Mercado Livre · navegador compras`, o estado da sessão na data da pesquisa e a origem da referência utilizada. Use **Refazer pesquisa de preços** após entrar na conta ou resolver uma verificação. Novas estimativas usam o modo logado automaticamente enquanto o perfil estiver disponível.

Validação: `node scripts/mercado-browser-test.mjs`, testes de preços e integração existentes. A confirmação de login e os seletores do site precisam ser verificados na conta real; alterações de layout podem produzir pendência em vez de preço. Nenhuma credencial é enviada ao Site.

Validação em 09/11/2026: sessão real reconhecida pelo controle visível atual da conta e dois anúncios lidos no perfil compras. A leitura aguarda a hidratação dos resultados e do preço por até nove tentativas, sem usar a confirmação da sessão como confirmação de conteúdo carregado.

A operação assinada `retry_estimate` recebe `jobId` e `version`, somente para uma pesquisa de estimativa elegível. Usa os mesmos controles do Site privado/HMAC, valida versão e registra histórico. Não permite reexecutar envios WhatsApp. Destina-se a refazer pesquisas mediante solicitação administrativa, inclusive após o usuário concluir login no perfil compras.

A análise respeita o runtime configurado do agente pesquisa-web (inclusive Claude CLI). Não usa modelRun, pois esse modo força execução pela API e ignora o runtime CLI, exigindo outra credencial. As instruções de análise são enviadas também como contexto de sistema. Frete numérico só é extraído quando há valor completo com centavos; spans fragmentados não geram um valor parcial.

## Solicitações arquivadas

Arquivamento da solicitação inteira, exclusivo do Master, com motivo, autoria e histórico/restauração. Preservar o mesmo pedido, etapa, aprovações, formulário, propostas, notas, anexos e todos os históricos. Retirar das filas ativas, bloquear edições e pausar novas tarefas automáticas. A aba Arquivadas permite consultar e restaurar a etapa original. Não há mais arquivamento individual de propostas; metadados antigos são apenas históricos. Valores e fechamentos mensais não são apagados.

O monitor não avança prazos, enfileira pesquisas ou projeta estimativas/contatos em solicitações arquivadas. A fila preserva os IDs e fica sem novas retiradas enquanto arquivada. Resultados de tarefas já retiradas e respostas recebidas continuam registrados, sem alterar a etapa arquivada. A restauração pode retomar pendências autorizadas, com a mesma prevenção de duplicidade; envios incertos não são reenviados automaticamente. Não é possível desfazer um envio já aceito pelo provedor. Conta operacional, número exato, credenciais, modelos e chaves de envio são preservados. Testes não enviam mensagens reais.


## Agenda de contatos — 14/11/2026

Cotação → Agenda de contatos reúne fornecedores existentes e contatos gerais. Master/ADM administram a agenda; Setor, DG e Financeiro não recebem esses dados. GET/POST /api/contacts validam sessão, origem, JSON e limite de 64 KB. Novos contatos entram sem classificação; categoria e abrangência conferidas habilitam sugestões automáticas pelas regras atuais de material/serviço e etapa local/nacional. Na preparação manual, Master/ADM também podem escolher os demais contatos disponíveis, conforme a atualização abaixo. Importar, sincronizar ou classificar não prepara nem envia mensagens.

CSV UTF-8 e VCF 3/4 são lidos no navegador: prévia, erros por linha, até 5 MB e 5.000 números, lotes de até 50 e progresso confirmado. Cada lote também respeita 60.000 bytes UTF-8 de contatos, reservando espaço para o envelope no limite HTTP de 64.000 bytes. Campos inválidos são excluídos com aviso, sem truncamento. Telefones brasileiros mantêm oito/nove dígitos após DDD; não acrescentar o nono dígito. Duplicados não sobrescrevem nomes/categorias. Edição usa versão e auditoria; fornecedor existente preserva ID/histórico/classificação. Mudança de telefone é recusada durante envio running/uncertain. Tarefa já preparada não é redirecionada para outro número. Importador legado e cadastro por pesquisa também respeitam telefones existentes na agenda.

A sincronização cobre **contatos conhecidos do WhatsApp operacional; pode não incluir toda a agenda do celular**. A instalação OpenClaw 2026.10.10 não oferece agenda completa: directory/allowFrom é lista de permissão. O adaptador lê somente campos escalares de identidade por SQLite readonly nas fontes locais nativas: ~/.openclaw/state/openclaw.sqlite, tabela channel_ingress_events (conta operacional literal ou namespace hash oficial e fila exata), e ~/.openclaw/agents/operacional/agent/openclaw-agent.sqlite, tabela session_nodes, delivery externo WhatsApp operacional/direct. Tombstones de eventos concluídos não identificam contatos. Grupos, conta pessoal, número da escola, mensagens próprias e LIDs sem relação PN verificada são excluídos. Não lê transcrições, textos, anexos, arquivos de sessão, allowFrom ou credenciais. Falha de uma fonte gera aviso de cobertura parcial; nenhuma fonte utilizável gera erro explícito.

A ponte atualizada anuncia contacts-v1 em contact_sync_poll, com HMAC/acesso de serviço existentes. Somente uma solicitação administrativa ativa; sem solicitação não abre as fontes. Lease de 15 minutos e páginas de 50 em contact_sync_result, até 5.000 contatos, hashes para repetição idêntica e rejeição de páginas divergentes/atrasadas. Somente códigos de erro públicos e avisos saneados; snapshot não expõe lease. Prévia precede import_sync humano e classificação. Registros auxiliares agenda_contact, agenda_contact_sync e agenda_bridge usam records; sem migração.

**Integração pelo coordenador:** publicar a versão revisada do servidor e atualizar os módulos da instalação existente da ponte, incluindo client.mjs, runner.mjs, contact-sync.mjs e contact-phone.mjs. Reiniciar somente a tarefa existente após a atualização, preservando cofre/journals, conta operacional, +559292017107 e as duas chaves de envio desativadas. Não é necessário relogar, parear, abrir outra conexão ou alterar modelos. A UI só habilita nova sincronização com heartbeat contacts-v1 recente (5 minutos). Ponte antiga continua processando o fluxo existente; servidor antigo recusa a operação nova e o runner segue inbox/pesquisas. Falha de contatos não bloqueia as outras tarefas. Não atualizar/reiniciar produção a partir da worktree do módulo.

Validação local: contact-import-test, contact-agenda-test, contact-agenda-ui-test, contact-agenda-http-test, contact-sync-test e contact-runner-test; regressões de supplier-import, quotation-suppliers, maintenance-suppliers, integration/openclaw, workflow, process-navigation e finance-profile. Somente dados fictícios e porta 5185. Nenhuma importação ou envio real.


## Destinatários escolhidos manualmente — 14/11/2026

Na janela Preparar mensagem de cotação, GET /api/contacts?quotationRequestId=UUID retorna a lista completa para pedido aprovado e em cotação, incluindo contatos gerais e a última prévia WhatsApp em review. Deduplicar números; fornecedor salvo prevalece. Telefones inválidos, fora do contrato de transporte e da própria escola ficam indisponíveis. Somente fornecedores compatíveis são sugeridos/pré-selecionados (até 100); os demais podem ser escolhidos manualmente. Busca, filtros e páginas preservam as escolhas; limpar não restaura sugestões automaticamente. O modelo continua genérico e sem disparo ao abrir/marcar.

POST /api/data action=prepare_openclaw passa recipients com referências {kind:saved,id,version,phone} ou {kind:sync,syncId,phone}. O servidor revalida o lote inteiro antes da primeira gravação. Recusa versões/telefones diferentes, números não contidos na agenda/prévia e prévia substituída. Ao preparar, somente os contatos sincronizados escolhidos são salvos sem classificação; uma repetição da mesma prévia permanece idempotente mesmo após esse salvamento. Concorrência pode interromper um lote depois de algumas gravações confirmadas; repetir não duplica tarefas e referência atualizada exige reabrir a janela.

Novas tarefas guardam manualSelection.recipientId/actor/at/suggested, contactId para contato geral e supplierId apenas para fornecedor. Compatibilidade é sugestão nessa escolha administrativa explícita; os contratos legados supplierIds/supplierId permanecem estritos. Snapshot, revalidação, target, elegibilidade, claim e inbox usam a mesma normalização de telefone. Retirada exige pedido aprovado na etapa, telefone atual igual ao alvo, guardas atômicas de versão/competência e ambas as chaves de envio. Edição de telefone running/uncertain é recusada; fila antiga não é redirecionada/liberada. Resposta geral associa contactId/contactName para revisão, sem criar fornecedor/proposta automaticamente. Nenhum prazo/abrangência é inferido de contato sem classificação.

A ponte instalada já transporta esse mesmo tipo whatsapp_quote e o modelo contact-v1. Esta atualização é do servidor/UI; não exige alteração do cliente, novo serviço, pareamento ou liberação de envio. O coordenador revisa e publica; confirmar sete tarefas reais blocked/attempts0 e ambas as chaves desativadas antes/depois. Testes: quotation-contacts-test.mjs, quotation-contacts-http-test.mjs e quotation-contact-selection-test.mjs, mais regressões atuais. Sem dependências/migração.

## Envio normal e reenvio confirmado — 15/11/2026

O usuário autorizou envio normal aos contatos escolhidos e exclusão recuperável para novos testes. Esta regra atualiza a liberação futura descrita anteriormente: coordenador confere fila e publica, configura WHATSAPP_SEND_ENABLED=true no servidor e enableSend:true BOOLEANO no cofre; launcher deriva ESTRELAS_ENABLE_SEND desse campo. Campo ausente/string mantém false. Grants temporários ficam ausentes. Não habilitar/reabrir backlog ou enviar teste real durante a publicação; o usuário prepara novos envios pela UI. Preservar sete lojas canceladas e o outro teste bloqueado.

Saída explícita do teste limitado (15/11/2026): em produção normal, configurar `WHATSAPP_TEST_SEND_GRANT=disabled` no servidor para substituir qualquer binding residual de teste no provedor. O cofre da ponte continua sem `testSendGrant`. O literal exato `disabled` é uma decisão do operador, nunca um fallback para concessão inválida: outros valores malformados/expirados continuam bloqueando o envio. Se a ponte apresentar uma concessão, o servidor explicitamente desativado não a autoriza. Diagnósticos `quotation_claim` expõem somente motivos, tipos e booleanos; não registrar conteúdos de concessões, mensagens, telefones ou credenciais.

Agenda e tarefas de mensagens têm Lixeiras, motivos/CAS/auditoria e restauração explícita sem envio. Mensagens do WhatsApp e recibos não são apagados. Propostas comerciais/pedidos não são excluídos por essas ações. A seleção avisa envio anterior por pedido/telefone, inclusive registro excluído, e exige confirmação com resendOf.id/version; preparationId UUID torna repetição de rede idempotente. Nova tentativa ganha novo registro. Rotas legadas compartilham a mesma guarda atômica; retry_integration WhatsApp é recusado para não contornar a confirmação. Conferir procedimento e validações em docs/modulos/compras/REENVIO-E-LIXEIRA.md. Sem migração ou novas dependências.
