# Entrega atual de Compras — Cotação colapsável e ícones — 13/11/2026

## Escopo e resultado

O usuário solicitou um bloco colapsável de Cotação nos detalhes da solicitação e ícones padronizados nos cabeçalhos, pois apenas Formulário Orçamentário tinha ícone.

O novo componente `RequestQuotationPanel` reúne as ações existentes Registrar cotação/Preparar mensagem, comparativo e histórico de versões das propostas. É inserido no painel após a decisão da DG e antes de Execução; o painel legado também recebe o conteúdo. O bloco abre por padrão em `quoting`/`national` quando ativo. Fora dessas etapas permanece consultável e, sem propostas, explica a separação entre propostas comerciais e estimativas. Setor não recebe o bloco. Ações continuam restritas a Master/ADM, etapa compatível e pedido ativo; Financeiro e arquivados mantêm consulta, e versões antigas nunca oferecem seleção.

Os cabeçalhos de formulário, conferência, estimativas, cotação, execução, prestação de contas, históricos, fontes, categorias e detalhes de propostas usam ícones da biblioteca Lucide já instalada, com 16 px e espaçamento de 8 px. Não foram criadas novas regras de compra, APIs ou contatos externos. A decisão da DG continua sendo sobre necessidade e escopo.

- Branch: `codex/compras`; worktree exclusiva `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\compras`; porta `5185`.
- Base: `7a9a9dd7fade1e41c9343db5a7a62bb8d91abee7`, correção anterior do prazo já enviada.
- SHA final: informado na resposta do chat; conferir com `git log -1 --format=%H`. Este arquivo integra o próprio commit.

## Arquivos compartilhados e contratos

- Novo: `app/request-quotation-panel.tsx`, composição visual das ações/comparativo/histórico existentes.
- `app/dashboard.tsx`: passa o bloco pelo novo encaixe `quotations` de `BudgetRecordPanel`; remove o conteúdo avulso duplicado.
- `app/budget-record-panel.tsx`: encaixe opcional `quotations`, inclusive no legado; ícones nos cabeçalhos.
- `app/workflow-panel.tsx`, `app/estimate-criteria-panel.tsx`, `app/supplier-discovery-panel.tsx`: ícones em estimativas, critérios e consulta de fornecedores.
- `app/quote-commercial-fields.tsx`: ícones nos detalhes das propostas, reaproveitando a mesma comparação/seleção.
- `app/request-history.tsx`, `app/request-archive-details.tsx`: ícones nos históricos e informações preservadas.
- `app/redesign.css`: alinhamento/espaçamento dos ícones limitado aos cabeçalhos colapsáveis do detalhe de solicitação.
- Novo: `scripts/request-sections-test.mjs`, regressão de renderização/ordem/ícones e consulta por perfil/arquivamento; gera fixture visual fictícia em `outputs/request-sections/` (ignorado).
- `scripts/general-return-ui-test.mjs`, `scripts/request-form-layout-test.mjs`: expectativas de cabeçalhos atualizadas para admitir ícones, mantendo as verificações de ordem e comportamento.
- `FORMULARIOS-E-CONTROLES.md` e este arquivo: orientação e entrega.

O único contrato de componente ampliado é a propriedade opcional `quotations?: ReactNode` do painel; nenhum contrato de dados/API foi alterado. Sem migrações, configurações, segredos, dependências ou alteração de modelos, rotas, autenticação, menu ou permissões. O coordenador deve conciliar alterações concorrentes nos componentes e no CSS compartilhado antes de integrar.

## Verificações e resultados reais

Todos os comandos foram executados com workdir explícito nesta worktree.

- Regressão antes da implementação: `node scripts/request-sections-test.mjs` **falhou como esperado**, pela ausência de Cotação depois da decisão e antes da execução.
- Após a implementação, **PASS** nas oito suítes: `request-sections-test.mjs`, `general-return-ui-test.mjs`, `request-form-layout-test.mjs`, `redesign-styles-test.mjs`, `estimate-criteria-ui-test.mjs`, `quote-comparison-test.mjs` (9 testes), `budget-flow-test.mjs` e `finance-profile-test.mjs`. As duas últimas preservam decisões estruturadas e Financeiro somente após aprovação, sem gravações indevidas. Testes usam dados fictícios e, quando necessário, D1/R2 temporários isolados.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **PASS**.
- `npm.cmd run build`: **PASS**.
- `git diff --check`: **PASS**.
- Revisão conforme `react-best-practices`: componentes no escopo do módulo, sem efeitos/fetches novos; cabeçalhos nativos `details/summary`, ícones decorativos, callbacks e bloqueios de perfil/etapa/arquivamento preservados.
- Verificação visual no navegador em `http://127.0.0.1:5185/ui-check.html`: fixture gerada com os componentes reais e estilos do projeto, dados fictícios e sem autenticação/produção. Cotação foi observada aberta com ações/comparativo; ao recolher, o conteúdo deixou de aparecer. Ícones e alinhamento dos sete cabeçalhos visíveis conferidos. Captura local em `outputs/request-sections/cotacao-icones.png`, fora do Git. Servidor temporário de arquivos, sem ponte ou processamento de pesquisas.

Limite: a checagem visual usa HTML renderizado dos componentes e interação nativa dos colapsáveis, não um fluxo autenticado completo do aplicativo. Não houve envio de mensagens, pesquisa externa, dados reais, migração ou publicação. As abas de produção não foram operadas.

## Pendências e verificação pelo coordenador

Sem pendência de implementação neste escopo. Revisar o SHA/branch informados, conciliar os arquivos compartilhados e publicar somente pelo fluxo do coordenador.

Para conferir localmente: executar `node scripts/request-sections-test.mjs` para gerar a fixture ou iniciar o aplicativo em `http://127.0.0.1:5185` com dados fictícios. Abrir solicitação ativa em Cotação e conferir a ordem Formulário → Conferência → Estimativas → decisão da DG (quando aplicável) → Cotação → Execução → Prestação de contas. Recolher/expandir Cotação e verificar ações, comparativo e histórico. Conferir ausência de ações no Financeiro/arquivados e ausência do bloco para Setor. Não usar pesquisas/envios reais para validar a organização visual.

---

# Histórico — remoção do prazo da decisão — 13/11/2026

Commit da entrega anterior: `7a9a9dd7fade1e41c9343db5a7a62bb8d91abee7`. Para a entrega atual, prevalece a seção acima.

## Escopo e comportamento resultante

O usuário relatou que não conseguia apagar os segmentos da data no campo **Prazo pertinente à decisão** e solicitou remover o campo. O controle nativo de data parcialmente preenchido bloqueava o envio por validação do navegador, mesmo sendo opcional.

O campo foi retirado da aprovação integral, aprovação parcial, medida provisória e rejeição. Somente **Adiar** mantém **Data prevista para reavaliar a solicitação**, obrigatória conforme a regra vigente. Ao mudar de Adiar para outra decisão, o controle é desmontado e deixa de participar da validação e do FormData. Não foi incluído botão para limpar a data.

Datas de decisões anteriores continuam consultáveis. API, contrato de armazenamento, permissões, validações do servidor, competência, histórico e fluxo de solicitação única permanecem preservados.

- Branch: `codex/compras`.
- Worktree: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\compras`.
- Porta reservada: `5185`.
- Base desta correção: `b30ce17282a4769db5995ec127a46129f5ff579f` (entrega documental anterior, já enviada).
- SHA final da correção: informado na resposta do chat; este arquivo integra o próprio commit. Conferir com `git log -1 --format=%H`.

## Arquivos alterados e dependências

- `app/budget-record-panel.tsx`: componente compartilhado do painel de Compras; exibe o controle de data somente no adiamento e ajusta a ajuda de competência para referir-se à solicitação.
- `scripts/general-return-ui-test.mjs`: regressão no HTML renderizado da aprovação, garantindo ausência do campo de prazo.
- `scripts/budget-flow-test.mjs`: mantém verificação de adiamento com data e acrescenta rejeição de adiamento sem data.
- `FORMULARIOS-E-CONTROLES.md`: descrição atual da remoção do campo e preservação das datas históricas.
- `docs/modulos/compras/ENTREGA.md`: registro desta correção; entrega anterior preservada abaixo como histórico.

Sem dependências novas, migrações, configurações, segredos, mudanças de modelos, estilos, menu ou rotas. Sem contratos novos com outros módulos. O coordenador deve conciliar eventuais mudanças concorrentes no painel/documentação.

## Testes executados e resultados reais

Todos os comandos usaram workdir explícito desta worktree, sem servidor ou ponte de produção.

- Antes da alteração, `node scripts/general-return-ui-test.mjs` **falhou como esperado**: “aprovar a necessidade não deve apresentar campo de prazo”, comprovando a presença do controle no HTML renderizado.
- Após a alteração, `node scripts/general-return-ui-test.mjs`: **PASS**.
- `node scripts/budget-flow-test.mjs`: **PASS**, incluindo obrigatoriedade da data apenas no adiamento e decisões estruturadas existentes.
- `node scripts/single-request-test.mjs`: **PASS**, com dados fictícios e D1 temporário isolado; protocolo único, reapresentação, novas aprovações, privacidade dos snapshots e incorporação idempotente de cópia legada com anexo preservado.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **PASS**.
- `npm.cmd run build`: **PASS**, build Vinext concluído.
- `git diff --check`: **PASS**.

Validação da interface por renderização de HTML, sem verificação interativa no navegador nesta etapa. Nenhum dado real foi acessado ou alterado, e nenhuma pesquisa ou mensagem externa foi executada. Não houve publicação.

## Pendências e passos para o coordenador

Sem pendência de implementação neste escopo. Revisar e integrar somente a branch/SHA informados; publicação continua exclusiva do coordenador.

Na validação local em `http://127.0.0.1:5185`, usar solicitação fictícia em `general_review`. Conferir que aprovação integral, parcial, medida provisória (em emergencial) e rejeição não exibem prazo; Adiar exibe a data de reavaliação e impede envio sem ela. Alternar de Adiar com data incompleta para Aprovar: o controle deve desaparecer, permitindo registrar a decisão quando os demais campos obrigatórios estiverem preenchidos. Consultar decisões anteriores para confirmar que datas já gravadas continuam visíveis. Não enviar mensagens a fornecedores para verificar esta mudança.

---

# Histórico — entrega documental anterior — 13/11/2026

Commit desta entrega anterior: `b30ce17282a4769db5995ec127a46129f5ff579f`. O texto abaixo registra o escopo e as verificações da etapa documental anterior; para o campo de prazo e a entrega atual, prevalece a seção acima.

## Identificação e escopo

- Branch: `codex/compras`.
- Worktree: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\compras`.
- Porta local: `5185`, host `127.0.0.1`.
- Base auditada: `2b0d4e7ea83d6d7e4afaf176a3c319cf4263aa6e`.
- O SHA final do commit documental consta na resposta de entrega do chat; conferir com `git log -1 --format=%H`. Este arquivo integra o próprio commit.

O usuário solicitou explicar o campo **Prazo pertinente à decisão** e corrigir as inconsistências documentais sobre adiamento, porta local de Compras e permissões do Financeiro, conforme o código e as regras atuais. A entrega altera somente Markdown. O comportamento do aplicativo permanece o existente.

## Correções realizadas

- Adiamento: os guias passam a descrever uma única solicitação/protocolo, com revisão em `deferredEdit`, reapresentação por `reapply_deferred`, rodada anterior em `roundHistory`, nova competência calculada no servidor em Manaus e retorno a `pending` para nova estimativa e aprovações. O autor respeita `availableMonth`; o Master pode antecipar com justificativa; mês fechado exige reabertura. Cópias legadas ainda não enviadas são incorporadas ao histórico por `consolidateDeferredDrafts`, preservando anexos. Pedidos independentes já enviados não são consolidados. As descrições antigas de criação de novo protocolo e retomada direta foram corrigidas, inclusive nos parágrafos sobre poderes do Master.
- Ambiente: os guias de uso e testes indicam `http://127.0.0.1:5185` para esta worktree. A porta `5173` continua documentada como a do checkout principal do coordenador. Nenhum manifesto, launcher, hook ou configuração foi alterado.
- Financeiro: os guias de acesso e formulários deixam explícita a leitura somente de pedidos com `generalApproval` e registros autorizados vinculados, sem pedidos/rodadas sem aprovação, rascunhos ou revisões privadas. Permanecem os bloqueios de gravação de compras/fiscais/anexos e a ausência de usuários, cadastro separado de fornecedores e integração na resposta do perfil.
- Campo da decisão: documentação de `needDecision.due` como data opcional associada à decisão da DG. Em **Adiar**, é obrigatória e representa a data prevista para reavaliar. Não agenda compra, altera competência automaticamente ou define a liberação de reapresentação (`availableMonth`). O rótulo e a interface não foram alterados.

## Arquivos compartilhados alterados

- `AGENTS.md`: instrução de porta/testes e descrição atual dos poderes do Master no adiamento.
- `IMPLEMENTACAO.md`: fluxo atual do adiamento e endereço de testes.
- `CONTINUAR-NO-VSCODE.md`: abertura da worktree correta, porta/testes e adiamento.
- `FORMULARIOS-E-CONTROLES.md`: adiamento, Financeiro, campo da decisão e testes locais.
- `ACESSOS-LOCAIS.md`: restrição do Financeiro e porta dos testes HTTP.
- `INTEGRACOES.md`: endereço local do smoke test de Compras.
- `README.md`: distinção entre a porta do módulo e a do coordenador.
- `docs/modulos/compras/ENTREGA.md`: este registro.

Não há alterações em menu, layout, componentes, modelos, permissões executáveis, estilos, dependências, rotas, banco ou integrações. Não há mudança de contrato entre módulos. Os documentos compartilhados precisam ser conciliados pelo coordenador se outras branches também os alterarem. Especificações e planos históricos em `docs/superpowers/` não foram reescritos; a orientação operacional vigente está nos guias acima e em `AGENTS.md`.

## Verificações executadas e resultados

Todos os comandos foram executados com workdir explícito nesta worktree.

- `git rev-parse --show-toplevel`, `git branch --show-current`, `git status --short`: raiz/branch corretas e árvore inicialmente limpa.
- Conferência direta com `app/budget-record-panel.tsx`, `app/budget-workflow.ts`, `app/deferred-request.ts`, `app/deferred-draft.ts`, `lib/deferred-requests.ts`, `app/master-reanalysis.ts`, `app/access.ts`, `app/api/data/route.ts` e os helpers de ambiente: textos alinhados às regras implementadas.
- Verificação Node em memória importando `scripts/module-workspace.mjs`: **PASS** para branch `codex/compras`, porta `5185`, base `http://127.0.0.1:5185` e rejeição da porta `5173` pelo launcher do módulo. Nenhum servidor foi iniciado.
- Verificação Python em memória: **PASS** para presença de 5185 nos sete guias, ausência das instruções antigas de novo protocolo/cópia adiada nos textos revisados, restrições `generalApproval`/revisões privadas nos dois guias financeiros e diff restrito aos sete arquivos Markdown antes da inclusão deste registro. Nenhum arquivo de teste foi criado.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **PASS**, código de saída 0.
- `git diff --check`: **PASS**, sem erros de whitespace.

Build, testes HTTP, testes de interface e integrações reais não foram executados: a alteração é exclusivamente documental. Não foram criados dados fictícios, usuários, bancos ou anexos. Não houve pesquisa, mensagem externa, uso da ponte de produção, migração ou publicação. A operação atual em produção não foi verificada.

## Pendências, configuração e verificação pelo coordenador

Não há pendência de implementação neste escopo, migração, variável, segredo ou configuração a aplicar. Integração na main e publicação pertencem exclusivamente ao coordenador; esta entrega envia somente `codex/compras`.

Para revisar, conferir o SHA informado no chat e o diff do commit: somente os oito arquivos Markdown acima devem constar. Comparar os textos de adiamento com `reapplyDeferredRequest`/`consolidateDeferredDrafts`, o Financeiro com `canFinanceReadRequest`/`financeProjection` e a porta com `.ceea-worktree.json`/`localDevelopmentBase`. Na consulta do guia de formulários, conferir também a explicação do prazo da decisão. Não é necessário testar com dados reais para revisar esta entrega.
