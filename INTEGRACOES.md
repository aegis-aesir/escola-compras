# OpenClaw — Colégio Estrelas

Conta: `operacional`. Número: `+559292017107`.
Projeto e hospedagem existentes foram preservados.

## Funcionamento

O Site mantém tarefas no D1. A ponte local consulta a fila por HTTPS assinado
com HMAC-SHA256 e chama o OpenClaw pelo endereço local `127.0.0.1:18789`.
Não é necessário expor o gateway à internet. O acesso ao Site privado usa
uma credencial de serviço independente da identidade dos funcionários.

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

A ponte verifica prazos mesmo com o painel fechado, enquanto o computador
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

O teste de integração usa D1 temporário isolado. O smoke test exige servidor na
porta 5173 e cria dados fictícios somente no banco local. Nenhum teste envia
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


## Estimativas pelo agente operacional

A ponte pesquisa fontes, lê até três páginas via `web_fetch` e passa trechos limitados ao agente existente `operacional` por `openclaw gateway call agent`. Usa o modelo/configuração já definidos para esse agente, com custo normal desse provedor. Não cria outro agente nem altera o atendimento WhatsApp. O CLI é localizado no caminho Windows padrão; `OPENCLAW_CLI_PATH` permite indicar outra instalação.

A execução utiliza sessão própria por processamento, `promptMode: minimal`, `extraSystemPrompt`, `disableMessageTool: true` e `deliver: false`. Não recebe credenciais do Site no subprocesso. O prompt instrui analisar apenas os textos fornecidos, não executar instruções de páginas nem usar ferramentas. A resposta JSON declara equivalência, moeda BRL, preço total, quantidade por embalagem, unidade e trechos literais. O servidor valida estrutura, fonte e evidências; a interpretação semântica é do agente e segue para conferência administrativa, não constitui aprovação de compra.

Quando todos os itens têm referências, o servidor calcula quantidades e total e passa para análise administrativa. Frete desconhecido é excluído do total e identificado. Pendências não ganham preços inventados; o painel mostra a justificativa e permite refazer a pesquisa. Estimativa em análise administrativa pode ser corrigida com histórico; após encaminhamento à diretoria geral essa edição fica bloqueada. Resultados antigos ou de itens alterados não sobrescrevem pedidos. O polling recupera projeções interrompidas sem duplicação.

Pesquisas de estimativa usam lease de 10 minutos para leitura/análise. A chamada ao agente tem orçamento de 120 segundos, espera do CLI de 160 segundos e limite de processo de 170 segundos. Falhas usam a política de até três tentativas existente. As pesquisas anteriores só de links são preservadas; o identificador `prices-agent-v1` inicia a extração para pedidos ainda em estimativa. Testes: `node scripts/price-evidence-test.mjs`, `node scripts/automatic-estimate-test.mjs` e os testes de integração existentes. Nenhuma mensagem real deve ser usada para validar esse fluxo.

## Mercado Livre com sessão no navegador

Perfil dedicado `compras`, gerenciado pelo OpenClaw no computador, com janela visível e sessão persistente fora do repositório. O usuário faz login diretamente nele. Abrir novamente: `powershell -File integrations/openclaw/open-shopping-browser.ps1`. O perfil foi criado pelo CLI e configurado com `browser.profiles.compras.headless=false`; não trocar o perfil padrão nem importar cookies de outros navegadores.

O launcher define `ESTRELAS_BROWSER_RESEARCH=true`. A ponte abre uma aba própria de busca no Mercado Livre, preservando nome, especificação e sinais do modelo (como S41+), confirma sinais visíveis de sessão e lê até dois anúncios. Somente URLs HTTPS de busca/anúncio permitidas; não há clique, preenchimento, carrinho, pagamento, contato ou acesso a páginas da conta. Abas de login do usuário não são fechadas. CAPTCHA, login expirado ou sessão não confirmada ficam como pendência; não contornar verificações do site.

A extração usa DOM renderizado do produto: título, preço, descrição e especificações. Não lê cookies, armazenamento, senhas ou formulários. Não exporta cabeçalho da conta nem endereço. Frete exibido é apenas informativo: quantidade e destino precisam de conferência antes de incorporá-lo ao total. O agente operacional continua responsável pela análise de equivalência/preço e pelas citações literais.

Páginas autenticadas têm prioridade. Com esse modo ativo, páginas públicas do Mercado Livre não são usadas silenciosamente em substituição à sessão. Outras lojas continuam disponíveis como fontes públicas. O painel mostra `Mercado Livre · navegador compras`, o estado da sessão na data da pesquisa e a origem da referência utilizada. Use **Refazer pesquisa de preços** após entrar na conta ou resolver uma verificação. Novas estimativas usam o modo logado automaticamente enquanto o perfil estiver disponível.

Validação: `node scripts/mercado-browser-test.mjs`, testes de preços e integração existentes. A confirmação de login e os seletores do site precisam ser verificados na conta real; alterações de layout podem produzir pendência em vez de preço. Nenhuma credencial é enviada ao Site.

Validação em 09/11/2026: sessão real reconhecida pelo controle visível atual da conta e dois anúncios lidos no perfil compras. A leitura aguarda a hidratação dos resultados e do preço por até nove tentativas, sem usar a confirmação da sessão como confirmação de conteúdo carregado.

A operação assinada `retry_estimate` recebe `jobId` e `version`, somente para uma pesquisa de estimativa elegível. Usa os mesmos controles do Site privado/HMAC, valida versão e registra histórico. Não permite reexecutar envios WhatsApp. Destina-se a refazer pesquisas mediante solicitação administrativa, inclusive após o usuário concluir login no perfil compras.

A análise respeita o runtime configurado do agente operacional (inclusive Claude CLI). Não usa modelRun, pois esse modo força execução pela API e ignora o runtime CLI, exigindo outra credencial. As instruções de análise são enviadas também como contexto de sistema. Frete numérico só é extraído quando há valor completo com centavos; spans fragmentados não geram um valor parcial.
