# Financeiro após aprovação da Diretoria Geral — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restringir toda consulta do perfil Financeiro às solicitações com `generalApproval` e aos dados vinculados a elas.

**Architecture:** Centralizar a decisão em uma função pura compartilhada e aplicá-la na montagem do snapshot, na consulta de históricos e no acesso a anexos. Registros fiscais entregues ao Financeiro serão filtrados pelos IDs das solicitações já autorizadas, preservando o modo somente leitura.

**Tech Stack:** TypeScript, React/Vinext, Cloudflare Workers, D1, R2, Node.js, Miniflare.

**Spec:** `docs/superpowers/specs/2026-11-12-financeiro-pos-aprovacao-design.md`

## Global Constraints

- A aprovação válida para esta consulta é a presença de `Purchase.generalApproval`.
- Não alterar estados, fluxo de aprovação, dados persistidos, D1, R2, credenciais ou hospedagem.
- Não ampliar as permissões de escrita do Financeiro.
- Não enviar mensagens reais pelo WhatsApp durante os testes.
- Preservar integralmente as permissões dos demais perfis.

## Review Focus

- Pedido em `general_review` sem `generalApproval`: não pode aparecer ao Financeiro; coberto no teste de domínio da Task 1.
- Pedido aprovado em cotação, execução ou recebido: deve permanecer visível; coberto no teste de domínio da Task 1.
- Nota ou atividade ligada a pedido não aprovado: não pode ser entregue no snapshot; coberto no teste HTTP da Task 2.
- Consulta direta de histórico ou anexo de pedido não aprovado: deve responder 403/404 sem revelar conteúdo; coberto nos testes HTTP e de arquivos da Task 2.
- Fechamento mensal com dados agregados anteriores à aprovação: não deve vazar solicitações não aprovadas ao Financeiro; coberto pelo filtro de registros e pelo teste HTTP da Task 2.

---

### Task 1: Regra de visibilidade financeira

**Files:**
- Modify: `app/access.ts`
- Modify: `scripts/finance-profile-test.mjs`

**Interfaces:**
- Produces: `canFinanceReadRequest(request: Pick<Purchase, 'generalApproval'>): boolean`.
- Produces: `visibleRequests(requests, me)` filtrando por essa função quando `me.role === 'financeiro'`.

- [ ] **Step 1: Escrever o teste de domínio que espera apenas pedidos com `generalApproval`**

Usar pedidos sem aprovação em `admin_review`, `general_review` e `rejected`, além de pedidos aprovados em `quoting`, `execution` e `received`; afirmar que somente os três aprovados são retornados.

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `node scripts/finance-profile-test.mjs`
Expected: FAIL porque o Financeiro ainda recebe todas as etapas.

- [ ] **Step 3: Implementar `canFinanceReadRequest` e aplicá-la em `visibleRequests`**

A função retorna `true` somente quando `generalApproval` existe. Não alterar os ramos de Master, Diretoria Administrativa, Diretoria Geral ou Setor.

- [ ] **Step 4: Executar o teste e confirmar a aprovação**

Run: `node scripts/finance-profile-test.mjs`
Expected: PASS.

### Task 2: Bloqueio servidor de registros, histórico e anexos não aprovados

**Files:**
- Modify: `app/api/data/route.ts`
- Modify: `lib/budget-files.ts`
- Modify: `scripts/finance-profile-http-test.mjs`
- Modify: `scripts/finance-profile-test.mjs`

**Interfaces:**
- Consumes: `canFinanceReadRequest` da Task 1.
- Produces: snapshot financeiro com `requests`, `budgetRecords` e `activity` limitados aos pedidos aprovados.
- Produces: histórico e arquivos acessíveis ao Financeiro somente quando o pedido vinculado satisfaz `canFinanceReadRequest`.

- [ ] **Step 1: Estender os testes com um pedido não aprovado e dados vinculados**

No teste HTTP, criar um pedido sem aprovação e outro com `generalApproval`; vincular notas, auditoria e arquivo aos dois. Afirmar que apenas os dados do aprovado aparecem e que o histórico/anexo do não aprovado é negado.

- [ ] **Step 2: Executar os testes e confirmar a falha**

Run: `node scripts/finance-profile-test.mjs` e, com servidor local, `node scripts/finance-profile-http-test.mjs`.
Expected: FAIL porque histórico, anexos e registros vinculados ainda aceitam qualquer pedido para o Financeiro.

- [ ] **Step 3: Filtrar o snapshot e os endpoints**

Em `GET /api/data`, obter os IDs das solicitações financeiras visíveis, manter apenas notas cujo `data.requestId` pertença ao conjunto e somente fechamentos compatíveis com a consulta financeira aprovada. Na consulta `historyFor` e em `budget-files.accessible`, exigir `canFinanceReadRequest` para o papel `financeiro`.

- [ ] **Step 4: Executar os testes e confirmar a aprovação**

Run: `node scripts/finance-profile-test.mjs` e `node scripts/finance-profile-http-test.mjs`.
Expected: PASS, sem mensagens reais.

### Task 3: Navegação, documentação e verificação final

**Files:**
- Modify: `app/process-navigation.ts`
- Modify: `scripts/process-navigation-test.mjs`
- Modify: `AGENTS.md`
- Modify: `IMPLEMENTACAO.md`
- Modify: `CONTINUAR-NO-VSCODE.md`

**Interfaces:**
- Consumes: o snapshot já filtrado das Tasks 1 e 2.
- Produces: navegação do Financeiro sem rótulos ou testes que indiquem acompanhamento anterior à aprovação.

- [ ] **Step 1: Atualizar o teste de navegação**

Remover a expectativa de que um pedido `pending` pertença à fila financeira e afirmar que solicitações financeiras exibidas já contêm `generalApproval` antes da classificação de tela.

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `node scripts/process-navigation-test.mjs`
Expected: FAIL com a regra anterior que classificava etapas pré-aprovação para o Financeiro.

- [ ] **Step 3: Ajustar a classificação e documentar a regra**

Manter as três telas Financeiro — Solicitação, Execução e Resumo Mensal — mas retirar qualquer tratamento especial de etapas anteriores à aprovação. Registrar nos três documentos principais que o perfil recebe dados somente após a decisão favorável da Diretora Geral.

- [ ] **Step 4: Executar a verificação completa**

Run:
- `node scripts/finance-profile-test.mjs`
- `node scripts/process-navigation-test.mjs`
- `node scripts/budget-files-test.mjs`
- `node scripts/budget-records-test.mjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `npm.cmd run build`
- `git diff --check`

Expected: todos com exit code 0; `diff --check` pode emitir apenas o aviso conhecido de conversão LF/CRLF.

- [ ] **Step 5: Publicar a mesma revisão no GitHub e no Site existente**

Usar o fluxo oficial Sites, preservar `appgprj_6aedd7e23db08191903c79130395fb57`, a audiência pública e `https://ceea.colegioestrelas.com`.
