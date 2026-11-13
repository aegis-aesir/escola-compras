# OpenClaw — Colégio Estrelas

Conta: `operacional`. Número: `+559292017107`.
Projeto e hospedagem existentes foram preservados.

## Separação das tarefas entre agentes

- `coordinator`: pesquisa web, descoberta de fornecedores locais/nacionais, leitura por `web_fetch`, navegador de pesquisa `compras` e análise estruturada das estimativas.
- `operacional`: WhatsApp da conta `operacional`, número exato `+559292017107`; envios somente autorizados, respostas e anexos recebidos no canal existente.
- A conta pessoal `default` foi desativada e despareada. Não reativar, parear ou usar como fallback. Esta mudança não modifica canais, modelos, provedores ou credenciais do OpenClaw.

A ponte envia `agentId` e `sessionKey` explícitos em `/tools/invoke`. Sessões de ferramentas são isoladas por pedido; a análise mantém sessão própria por tarefa/lease. Não depender do agente principal do gateway. Falhas do coordinator permanecem pendentes/com erro para revisão, sem transferir pesquisas ao operacional.

As chaves das tarefas, leases, confirmações, registros por pedido, assinaturas e os dois bloqueios de envio continuam iguais. Resultados pendentes são confirmados pelo journal existente; não limpar nem reenfileirar envios para aplicar esta alteração.

Os anexos recebidos continuam sob responsabilidade do operacional no WhatsApp. A ponte atual importa apenas texto para conferência no painel: não transfere anexos ao coordinator, não executa documentos recebidos e não transforma arquivos em propostas automaticamente. O fluxo de anexos privados enviados pelo painel permanece independente.

Validação sem contato externo: `node --test scripts/agent-routing-test.mjs`, `node --test scripts/openclaw-test.mjs`, `node scripts/price-evidence-test.mjs`, `node scripts/integration-test.mjs` e `node scripts/automatic-estimate-test.mjs`. O transporte de envio do teste é inteiramente simulado: nenhuma chamada real à ferramenta de mensagens.

Referência: [API de ferramentas do gateway](https://docs.openclaw.ai/gateway/tools-invoke-http-api).

## Funcionamento

### Seleção múltipla e modelo genérico de cotação — 13/11/2026

**Preparar mensagem** lista, por checkbox, os fornecedores cadastrados compatíveis com as categorias dos itens. Nenhum contato é selecionado automaticamente. `quoting` oferece somente locais; `national` admite locais e nacionais, preservando a elegibilidade da fila anterior. Fontes externas precisam de conferência e cadastro, e categorias de itens legados não são inferidas.

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
registra preço unitário, embalagem, frete e data no formulário de estimativa.
Estimativa continua separada de proposta comercial real.

WhatsApp: depois da aprovação da necessidade, a administração prepara uma
cotação para um fornecedor permitido na etapa. O envio exige as duas chaves
de ativação. Somente uma confirmação com identificador de mensagem registra
o contato local e inicia o prazo. Não há teto ou reaprovação por preço real.

Recebimento: o hook `estrelas-compras` observa mensagens de texto da conta
operacional e as entrega ao painel para revisão. Grupos, anexos e remetentes
sem telefone identificável exigem consulta no WhatsApp. O hook não responde
nem muda os demais agentes existentes. Mensagens recebidas não autorizam ações.
A proposta só passa a valer depois do registro pela administração.

A ponte usa diretamente `https://ceea.colegioestrelas.com`; não usar o endereço antigo, pois ele responde com redirecionamento e o cliente bloqueia redirecionamentos por segurança. A ponte verifica prazos mesmo com o painel fechado, enquanto o computador
estiver ligado, conectado e com a ponte em execução. Após um dia útil sem
proposta válida, libera a etapa nacional e enfileira a pesquisa. Usa o calendário
da escola e o fuso America/Manaus.

## Descoberta de fornecedores

Cada item tem uma categoria, com sugestões compartilhadas com o cadastro de
fornecedores. Novas solicitações pedem a categoria; a administração pode preencher
as categorias dos pedidos antigos, sem alterar itens, quantidades ou aprovações.
Comparações ignoram caixa, acentos e espaços repetidos. Categorias diferentes
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
- O hook usa `%USERPROFILE%/.openclaw/estrelas-compras/inbox` por padrão.
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

Hook local: `openclaw hooks install ./integrations/openclaw --force` instala o
código revisado. Verifique `openclaw hooks info estrelas-compras`. A ativação
pode recarregar os hooks; alterações posteriores nos arquivos podem exigir
reinício do gateway. Isso não envia mensagens de teste.

## Falhas e conferência

Envio sem confirmação, timeout ou processamento interrompido vira **Envio incerto**.
Não repetir automaticamente. Conferir o WhatsApp e registrar o contato manual
quando houver evidência. Uma falha depois de enviar pode ter entregue a mensagem.
Os arquivos `.result.json` reenviam apenas a confirmação ao Site, não a mensagem.
Arquivos `.review` exigem conferência; `.done` são comprovantes processados.
Não apagar esses registros para tentar novamente.

O hook observa eventos aceitos pelo OpenClaw; não importa retroativamente todo o
histórico e não captura mensagens bloqueadas pelas políticas do canal. Se uma
resposta não aparecer, conferir o WhatsApp e a política de recebimento da conta.

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


## Estimativas pelo agente coordinator

### Critérios administrativos por item (13/11/2026)

Master e Diretoria Administrativa revisam os critérios pré-preenchidos antes de iniciar: descrição/termos de busca, requisitos mínimos, autorização de similares e marca/modelo obrigatório ou apenas referência. O padrão não autoriza similares. O objeto `estimateCriteria` é separado de `items` e `form`; preserva o item original, autoria, data e revisão por item, com histórico em `estimateCriteriaHistory`. Alterações só antes do encaminhamento à DG, com versão e mês aberto.

`research` com o array de critérios salva e inicia a pesquisa; `research_item` salva/refaz somente a revisão de um item, preservando resultados atuais dos demais. Ambos colocam o pedido em `estimating`; preços completos retornam a `admin_review`. O histórico preserva estimativa anterior, se houver. Resultados de outra revisão, especificação ou critérios não preenchem a estimativa atual. Os critérios não autorizam compra nem substituem o pedido do setor.

A fila mantém `item` original e transporta `researchItem` e `researchCriteria` autorizados. Navegador compras e busca web usam o alvo ajustado; coordinator recebe original e critérios, mantém unidade/quantidade e exige evidências literais de preço e requisitos. Sem autorização de similares, a identidade original continua obrigatória. Assinaturas mantêm a conferência de vigência existente. O cliente anuncia `researchProtocol: criteria-v1` no polling; pontes antigas não retiram tarefas com novos critérios. Reiniciar a tarefa Windows da ponte após atualizar o código, preservando journals, cofre, conta operacional e bloqueios de envio.

Validação sem mensagens externas: `estimate-criteria-test.mjs`, `estimate-criteria-http-test.mjs`, `estimate-criteria-ui-test.mjs`, `agent-routing-test.mjs`, `automatic-estimate-test.mjs` e `price-evidence-test.mjs`.

Resultados parciais (12/11/2026): o painel exibe preço unitário, subtotal, fonte e data dos itens já validados, mesmo enquanto outro item está pendente. Usa a mesma validação de evidências do servidor e somente resultados da revisão e especificação atuais. O subtotal parcial exclui frete e não libera a aprovação. Pesquisa já encerrada com pendências não aparece como ainda em processamento. Assinaturas continuam exigindo conferência de vigência antes de usar preços como referência. Teste: `node scripts/partial-estimate-ui-test.mjs`.

A ponte pesquisa fontes, lê até três páginas via `web_fetch` e passa trechos limitados ao agente existente `coordinator` por `openclaw gateway call agent`. Usa o modelo/configuração já definidos para esse agente, com custo normal desse provedor. Não cria outro agente nem altera o atendimento WhatsApp. O CLI é localizado no caminho Windows padrão; `OPENCLAW_CLI_PATH` permite indicar outra instalação.

A execução utiliza sessão própria por processamento, `promptMode: minimal`, `extraSystemPrompt`, `disableMessageTool: true` e `deliver: false`. Não recebe credenciais do Site no subprocesso. O prompt instrui analisar apenas os textos fornecidos, não executar instruções de páginas nem usar ferramentas. A resposta JSON declara equivalência, moeda BRL, preço total, quantidade por embalagem, unidade e trechos literais. O servidor valida estrutura, fonte e evidências; a interpretação semântica é do agente e segue para conferência administrativa, não constitui aprovação de compra.

Quando todos os itens têm referências, o servidor calcula quantidades e total e passa para análise administrativa. Frete desconhecido é excluído do total e identificado. Pendências não ganham preços inventados; o painel mostra a justificativa e permite refazer a pesquisa. Estimativa em análise administrativa pode ser corrigida com histórico; após encaminhamento à diretoria geral essa edição fica bloqueada. Resultados antigos ou de itens alterados não sobrescrevem pedidos. O polling recupera projeções interrompidas sem duplicação.

Pesquisas de estimativa usam lease de 10 minutos para leitura/análise. A chamada ao agente tem orçamento de 120 segundos, espera do CLI de 160 segundos e limite de processo de 170 segundos. Falhas usam a política de até três tentativas existente. As pesquisas anteriores só de links são preservadas; o identificador `prices-agent-v1` inicia a extração para pedidos ainda em estimativa. Testes: `node scripts/price-evidence-test.mjs`, `node scripts/automatic-estimate-test.mjs` e os testes de integração existentes. Nenhuma mensagem real deve ser usada para validar esse fluxo.

## Mercado Livre com sessão no navegador

Perfil dedicado `compras`, gerenciado pelo OpenClaw no computador, com janela visível e sessão persistente fora do repositório. O usuário faz login diretamente nele. Abrir novamente: `powershell -File integrations/openclaw/open-shopping-browser.ps1`. O perfil foi criado pelo CLI e configurado com `browser.profiles.compras.headless=false`; não trocar o perfil padrão nem importar cookies de outros navegadores.

O launcher define `ESTRELAS_BROWSER_RESEARCH=true`. A ponte abre uma aba própria de busca no Mercado Livre, preservando nome, especificação e sinais do modelo (como S41+), confirma sinais visíveis de sessão e lê até dois anúncios. Somente URLs HTTPS de busca/anúncio permitidas; não há clique, preenchimento, carrinho, pagamento, contato ou acesso a páginas da conta. Abas de login do usuário não são fechadas. CAPTCHA, login expirado ou sessão não confirmada ficam como pendência; não contornar verificações do site.

A extração usa DOM renderizado do produto: título, preço, descrição e especificações. Não lê cookies, armazenamento, senhas ou formulários. Não exporta cabeçalho da conta nem endereço. Frete exibido é apenas informativo: quantidade e destino precisam de conferência antes de incorporá-lo ao total. O agente coordinator continua responsável pela análise de equivalência/preço e pelas citações literais.

Páginas autenticadas têm prioridade. Com esse modo ativo, páginas públicas do Mercado Livre não são usadas silenciosamente em substituição à sessão. Outras lojas continuam disponíveis como fontes públicas. O painel mostra `Mercado Livre · navegador compras`, o estado da sessão na data da pesquisa e a origem da referência utilizada. Use **Refazer pesquisa de preços** após entrar na conta ou resolver uma verificação. Novas estimativas usam o modo logado automaticamente enquanto o perfil estiver disponível.

Validação: `node scripts/mercado-browser-test.mjs`, testes de preços e integração existentes. A confirmação de login e os seletores do site precisam ser verificados na conta real; alterações de layout podem produzir pendência em vez de preço. Nenhuma credencial é enviada ao Site.

Validação em 09/11/2026: sessão real reconhecida pelo controle visível atual da conta e dois anúncios lidos no perfil compras. A leitura aguarda a hidratação dos resultados e do preço por até nove tentativas, sem usar a confirmação da sessão como confirmação de conteúdo carregado.

A operação assinada `retry_estimate` recebe `jobId` e `version`, somente para uma pesquisa de estimativa elegível. Usa os mesmos controles do Site privado/HMAC, valida versão e registra histórico. Não permite reexecutar envios WhatsApp. Destina-se a refazer pesquisas mediante solicitação administrativa, inclusive após o usuário concluir login no perfil compras.

A análise respeita o runtime configurado do agente coordinator (inclusive Claude CLI). Não usa modelRun, pois esse modo força execução pela API e ignora o runtime CLI, exigindo outra credencial. As instruções de análise são enviadas também como contexto de sistema. Frete numérico só é extraído quando há valor completo com centavos; spans fragmentados não geram um valor parcial.

## Solicitações arquivadas

Arquivamento da solicitação inteira, exclusivo do Master, com motivo, autoria e histórico/restauração. Preservar o mesmo pedido, etapa, aprovações, formulário, propostas, notas, anexos e todos os históricos. Retirar das filas ativas, bloquear edições e pausar novas tarefas automáticas. A aba Arquivadas permite consultar e restaurar a etapa original. Não há mais arquivamento individual de propostas; metadados antigos são apenas históricos. Valores e fechamentos mensais não são apagados.

O monitor não avança prazos, enfileira pesquisas ou projeta estimativas/contatos em solicitações arquivadas. A fila preserva os IDs e fica sem novas retiradas enquanto arquivada. Resultados de tarefas já retiradas e respostas recebidas continuam registrados, sem alterar a etapa arquivada. A restauração pode retomar pendências autorizadas, com a mesma prevenção de duplicidade; envios incertos não são reenviados automaticamente. Não é possível desfazer um envio já aceito pelo provedor. Conta operacional, número exato, credenciais, modelos e chaves de envio são preservados. Testes não enviam mensagens reais.
