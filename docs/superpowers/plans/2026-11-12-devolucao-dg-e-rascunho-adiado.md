# Devolução pela Diretoria Geral e Rascunho Adiado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a devolução de pedidos pela Diretoria Geral para apuração administrativa e criar automaticamente uma cópia privada e editável quando um pedido for adiado.

**Architecture:** A transição de domínio registra uma pendência própria da Diretoria Geral e exige sua resposta antes do reenvio. O adiamento recebe um ID de rascunho gerado pela API; a atualização do pedido, a auditoria e a inserção condicional do `request_draft` acontecem no mesmo `DB.batch`, com vínculo ao pedido original e proteção contra duplicidade. O fluxo existente de rascunhos preserva os metadados de adiamento e só converte a cópia em nova solicitação a partir do mês permitido.

**Tech Stack:** TypeScript, React/Vinext, Zod, Cloudflare Workers, D1, R2, Node.js/esbuild test scripts.

**Spec:** `docs/superpowers/specs/2026-11-12-devolucao-dg-e-rascunho-adiado-design.md`

## Global Constraints

- O pedido original adiado permanece `deferred`, intacto e consultável; sua cópia é outro registro e produz outro protocolo.
- Não copiar estimativa interna, parecer ativo, decisão, aprovação, propostas, fornecedores, execução, documentos fiscais ou anexos para o rascunho.
- O rascunho adiado pertence exclusivamente ao `authorId` original e pode ser editado antes de ficar disponível para envio.
- O envio definitivo só é permitido a partir do mês seguinte à competência efetiva, ou ao mês do adiamento quando não houver competência válida.
- A devolução da Diretoria Geral não usa a complementação do setor e preserva estimativa, formulário e histórico do parecer anterior.
- Pedidos adiados antigos sem vínculo de rascunho continuam compatíveis e podem usar a retomada administrativa legada.
- Não alterar credenciais, hospedagem ou integrações; nenhum teste envia mensagens reais pelo WhatsApp.

## Review Focus

- Repetição da mesma requisição de adiamento após perda de resposta deve manter exatamente um rascunho vinculado — coberto no teste HTTP da Task 3.
- A passagem de dezembro para janeiro e pedidos sem competência válida devem produzir o mês de liberação correto — coberto no teste puro da Task 2.
- A Diretoria Administrativa não pode reenviar uma devolução da DG sem responder à pendência — coberto nos testes de domínio e HTTP das Tasks 1 e 3.
- Setor, Financeiro e outros usuários não podem consultar ou editar o rascunho de outro autor — coberto no teste HTTP da Task 3.
- Pedido legado `deferred` sem `draftId` deve continuar retomável, enquanto um adiamento novo não altera o original — coberto nos testes de regressão das Tasks 2 e 4.

---

### Task 1: Transição de devolução da Diretoria Geral

**Files:**
- Modify: `app/model.ts`
- Modify: `app/budget-workflow.ts`
- Modify: `scripts/budget-flow-test.mjs`

**Interfaces:**
- Consumes: `budgetTransition(old, payload, me, settings, now)` e o estado existente `general_review`.
- Produces: `Purchase.generalReturn`, `Purchase.generalReturnHistory` e a ação `return_to_admin`; `budget_management` aceita `generalReturnResponse` somente ao reenviar uma pendência.

- [ ] **Step 1: Write the failing domain tests**

Adicionar a `scripts/budget-flow-test.mjs` casos que comprovem:

- `return_to_admin` por `geral` em `general_review` muda para `admin_review`, registra motivo/ator/data, preserva estimativa e copia o parecer anterior para o histórico;
- `solicitante` e `administrativo` não podem executar a devolução da DG;
- `budget_management` com `submitToGeneral:true` falha enquanto `generalReturn` existir e `generalReturnResponse` estiver vazio;
- o reenvio com resposta válida volta a `general_review`, encerra a pendência corrente e preserva motivo e resposta em `generalReturnHistory`.

- [ ] **Step 2: Run the domain test to verify RED**

Run: `node scripts/budget-flow-test.mjs`

Expected: FAIL porque `return_to_admin`, `generalReturn` e a exigência de resposta ainda não existem.

- [ ] **Step 3: Add the return types to `app/model.ts`**

Definir tipos nomeados para a pendência corrente e o histórico resolvido, com `reason`, `actor`, `at` e, no histórico, `response`, `resolvedBy`, `resolvedAt` e a cópia do `adminReview` anterior. Acrescentar `generalReturn?` e `generalReturnHistory?` a `Purchase` sem alterar registros antigos.

- [ ] **Step 4: Implement `return_to_admin` in `budgetTransition`**

Incluir a ação na lista estruturada; exigir perfil `geral` ou Master, estado `general_review`, ausência de `generalApproval` e justificativa válida. Mudar para `admin_review`, registrar a pendência corrente e não apagar `estimate`, `form`, `items` ou `management`.

- [ ] **Step 5: Require and record the administrative response on resend**

Quando `budget_management` receber `submitToGeneral:true` e houver `generalReturn`, validar `generalReturnResponse` pelo mesmo `reasonSchema`, atualizar o parecer, anexar a entrada resolvida a `generalReturnHistory`, remover apenas a pendência corrente e retornar a `general_review`.

- [ ] **Step 6: Run the domain test to verify GREEN**

Run: `node scripts/budget-flow-test.mjs`

Expected: PASS com devolução, resposta e histórico preservados.

- [ ] **Step 7: Commit**

```bash
git add app/model.ts app/budget-workflow.ts scripts/budget-flow-test.mjs
git commit -m "feat: permitir devolucao da diretoria geral"
```

### Task 2: Modelo da cópia adiada e compatibilidade de rascunhos

**Files:**
- Create: `app/deferred-draft.ts`
- Modify: `app/request-draft.ts`
- Modify: `app/model.ts`
- Modify: `app/budget-workflow.ts`
- Create: `scripts/deferred-draft-test.mjs`
- Modify: `scripts/budget-flow-test.mjs`

**Interfaces:**
- Consumes: `Purchase`, `RequestDraftValues`, `budgetMonth(purchase)` e `submissionMonth(now)`.
- Produces: `deferredDraftRecord(request, draftId, now)`, `canSubmitDeferredDraft(metadata, now)`, `DeferredDraftMetadata`, `Purchase.deferred.draftId/availableMonth` e `Purchase.reusedFrom`.

- [ ] **Step 1: Write the failing pure transformation tests**

Criar `scripts/deferred-draft-test.mjs` para verificar que `deferredDraftRecord`:

- copia somente formulário preenchível, escopo original, itens, assinatura e referências preliminares;
- não contém estimativa, parecer, decisão, aprovação, propostas, execução ou dados fiscais;
- calcula `2027-01` a partir de `2026-12` e usa o mês de Manaus do adiamento quando a competência não existe;
- marca `status:'deferred'`, autor, protocolo/motivo de origem e permite edição;
- faz `canSubmitDeferredDraft` retornar falso antes do mês permitido e verdadeiro a partir dele.

Acrescentar ao `budget-flow-test` a expectativa de que um novo adiamento com `deferredDraftId` registre esse ID e `availableMonth`, enquanto a retomada legada continua aceita apenas quando não há `draftId`.

- [ ] **Step 2: Run tests to verify RED**

Run: `node scripts/deferred-draft-test.mjs && node scripts/budget-flow-test.mjs`

Expected: FAIL porque o módulo, os metadados e as novas regras ainda não existem.

- [ ] **Step 3: Define draft and request linkage types**

Em `app/request-draft.ts`, acrescentar `DeferredDraftMetadata` e campos opcionais em `RequestDraft` para status, origem, motivo e mês permitido. Em `app/model.ts`, ampliar `deferred` com `due?`, `draftId?`, `availableMonth?` e adicionar `reusedFrom?` com ID/código do pedido original.

- [ ] **Step 4: Implement the pure deferred-draft helpers**

Em `app/deferred-draft.ts`, implementar:

```ts
export function deferredDraftRecord(request:Purchase,draftId:string,now:string):DeferredDraftRecord
export function canSubmitDeferredDraft(metadata:Pick<DeferredDraftMetadata,'availableMonth'>,now:string):boolean
```

Remover dos campos copiados `referenceMonth`, `situation`, `originalRequestId` e `correctionResponse`; usar `originalScope` quando existir e calcular o mês seguinte sem depender do fuso UTC do servidor.

- [ ] **Step 5: Attach draft identity to defer transitions**

Nas duas formas estruturadas de adiamento (`defer_request` e `decide_need` com `choice:'defer'`), validar e salvar `b.deferredDraftId`, `due` quando existente e `availableMonth`. Bloquear `resume_request` quando o adiamento possuir `draftId`, preservando a retomada para registros legados.

- [ ] **Step 6: Run tests to verify GREEN**

Run: `node scripts/deferred-draft-test.mjs && node scripts/budget-flow-test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/deferred-draft.ts app/request-draft.ts app/model.ts app/budget-workflow.ts scripts/deferred-draft-test.mjs scripts/budget-flow-test.mjs
git commit -m "feat: preparar copia editavel de pedido adiado"
```

### Task 3: Persistência atômica, privacidade e conversão da cópia

**Files:**
- Modify: `app/api/data/route.ts`
- Modify: `app/api/drafts/route.ts`
- Modify: `lib/budget-files.ts`
- Create: `scripts/general-return-deferred-draft-http-test.mjs`
- Modify: `scripts/request-drafts-test.mjs`

**Interfaces:**
- Consumes: `deferredDraftRecord`, `canSubmitDeferredDraft`, `Purchase.deferred.draftId` e os metadados definidos na Task 2.
- Produces: adiamento atômico com uma única cópia, GET/POST de rascunhos preservando metadados e conversão para nova solicitação com `reusedFrom`.

- [ ] **Step 1: Write the failing HTTP and draft tests**

Criar `scripts/general-return-deferred-draft-http-test.mjs` e ampliar `scripts/request-drafts-test.mjs` para comprovar:

- somente DG/Master devolve `general_review`, e o Administrativo só reenvia após responder;
- o adiamento cria exatamente um `request_draft` do autor original na mesma operação;
- repetição com versão antiga ou perda simulada de resposta não cria segunda cópia;
- Master, DG, Financeiro e outro setor não consultam nem alteram o rascunho privado;
- o autor edita e anexa normalmente sem perder status, origem, motivo ou mês permitido;
- envio antes do mês permitido recebe 409; a partir do mês permitido converte o mesmo ID em novo `request`, com novo código e `reusedFrom`;
- o pedido original continua `deferred` e inalterado depois do envio da cópia.

- [ ] **Step 2: Run tests to verify RED**

Run with the local server: `node scripts/general-return-deferred-draft-http-test.mjs && node scripts/request-drafts-test.mjs`

Expected: FAIL porque a API ainda não cria nem preserva a cópia adiada.

- [ ] **Step 3: Generate and pass the draft ID before the transition**

Em `app/api/data/route.ts`, para ações que podem adiar, gerar `crypto.randomUUID()` e passá-lo como `deferredDraftId` antes de chamar `transition`. Depois da transição, construir o registro com `deferredDraftRecord` somente quando o estado muda para `deferred`.

- [ ] **Step 4: Insert the deferred draft in the same D1 batch**

Acrescentar ao `db.batch` uma inserção condicional `request_draft` que exige a nova versão do pedido e o mesmo `deferred.draftId`, e rejeita vínculo `sourceRequestId` já existente. Manter o log de auditoria imediatamente associado à atualização do pedido e verificar `result[0].meta.changes===1`.

- [ ] **Step 5: Preserve metadata in the draft API**

Fazer `GET /api/drafts` devolver os metadados opcionais e `POST /api/drafts` atualizar somente `values` e `updatedAt`, preservando status/origem/motivo/mês do registro existente. Novos rascunhos comuns continuam com `status:'draft'`.

- [ ] **Step 6: Enforce the submission month and create the linkage**

Na conversão `action:'request'`, ler o registro de rascunho completo; se for adiado, usar `canSubmitDeferredDraft` e retornar 409 antes do mês permitido. Na solicitação criada, registrar `reusedFrom` sem copiar estados internos. Preservar o mesmo ID do rascunho para manter seus anexos novos.

- [ ] **Step 7: Keep file permissions private before submission**

Confirmar em `lib/budget-files.ts` que `request_draft` continua acessível apenas pelo autor, independentemente de `status:'deferred'`, e ajustar apenas se o novo metadado alterar a detecção atual.

- [ ] **Step 8: Run tests to verify GREEN**

Run: `node scripts/general-return-deferred-draft-http-test.mjs && node scripts/request-drafts-test.mjs && node scripts/budget-files-test.mjs`

Expected: PASS sem mensagens externas.

- [ ] **Step 9: Commit**

```bash
git add app/api/data/route.ts app/api/drafts/route.ts lib/budget-files.ts scripts/general-return-deferred-draft-http-test.mjs scripts/request-drafts-test.mjs
git commit -m "feat: criar rascunho atomico no adiamento"
```

### Task 4: Interface, navegação, documentação e regressão completa

**Files:**
- Modify: `app/budget-record-panel.tsx`
- Modify: `app/draft-request-form.tsx`
- Modify: `app/budget-request-form.tsx`
- Modify: `app/process-navigation.ts`
- Create: `scripts/general-return-ui-test.mjs`
- Modify: `scripts/process-navigation-test.mjs`
- Modify: `AGENTS.md`
- Modify: `IMPLEMENTACAO.md`
- Modify: `CONTINUAR-NO-VSCODE.md`

**Interfaces:**
- Consumes: `generalReturn`, `generalReturnHistory`, `RequestDraft` metadata e as ações HTTP das Tasks 1–3.
- Produces: controles visíveis de devolução/resposta, rótulo de rascunho adiado, bloqueio compreensível de envio e documentação operacional.

- [ ] **Step 1: Write the failing UI and navigation tests**

Criar `scripts/general-return-ui-test.mjs` para exigir os textos e payloads **Devolver para apuração administrativa**, **Resposta à pendência da Diretoria Geral**, histórico da devolução, rótulo **Adiado** e mensagem do mês permitido. Ampliar `process-navigation-test` para provar que devolvido sai da fila da DG, aparece em Estimativa/Administração e o pedido original adiado continua visível ao setor.

- [ ] **Step 2: Run tests to verify RED**

Run: `node scripts/general-return-ui-test.mjs && node scripts/process-navigation-test.mjs`

Expected: FAIL porque os controles e rótulos ainda não existem.

- [ ] **Step 3: Add DG return and administrative response controls**

Em `app/budget-record-panel.tsx`, adicionar o formulário da DG em `general_review`; mostrar a pendência no retorno administrativo; exigir `generalReturnResponse` no botão de salvar e enviar; mostrar o histórico resolvido sem expor campos internos ao setor.

- [ ] **Step 4: Present deferred drafts without blocking editing**

Em `app/draft-request-form.tsx`, mostrar **Adiado**, protocolo, motivo e mês de liberação. Em `app/budget-request-form.tsx`, aceitar uma propriedade de bloqueio apenas para o botão de envio definitivo, mantendo todos os campos e anexos editáveis antes do mês permitido.

- [ ] **Step 5: Preserve legacy defer behavior in the request panel**

Ocultar **Retomar solicitação adiada** quando `deferred.draftId` existir e exibir que o setor recebeu uma cópia. Manter o formulário de retomada somente para registros antigos sem `draftId`.

- [ ] **Step 6: Update documentation**

Documentar em `AGENTS.md`, `IMPLEMENTACAO.md` e `CONTINUAR-NO-VSCODE.md` a devolução interna da DG, a resposta obrigatória, a cópia privada/editável e o fato de que o original permanece adiado.

- [ ] **Step 7: Run focused and full verification**

Run:

```bash
node scripts/general-return-ui-test.mjs
node scripts/process-navigation-test.mjs
node scripts/budget-flow-test.mjs
node scripts/deferred-draft-test.mjs
node scripts/general-return-deferred-draft-http-test.mjs
node scripts/request-drafts-test.mjs
node scripts/budget-files-test.mjs
node scripts/budget-http-test.mjs
node scripts/finance-profile-http-test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm.cmd run build
git diff --check
```

Expected: todos PASS; nenhum envio externo.

- [ ] **Step 8: Commit**

```bash
git add app/budget-record-panel.tsx app/draft-request-form.tsx app/budget-request-form.tsx app/process-navigation.ts scripts/general-return-ui-test.mjs scripts/process-navigation-test.mjs AGENTS.md IMPLEMENTACAO.md CONTINUAR-NO-VSCODE.md
git commit -m "feat: integrar devolucao e rascunho adiado na interface"
```

### Task 5: Revisão, integração e publicação

**Files:**
- Review: all files changed since the plan base
- Update: `docs/superpowers/plans/2026-11-12-devolucao-dg-e-rascunho-adiado.md` only if implementation decisions require clarification

**Interfaces:**
- Consumes: working feature and green verification from Tasks 1–4.
- Produces: reviewed main branch, GitHub commit and next Sites version at the existing URL.

- [ ] **Step 1: Review the complete diff against the spec**

Confirm permission boundaries, atomicity, duplicate prevention, month transitions, legacy compatibility, absence of approval reuse and absence of external sends. Fix Critical or Important findings with a failing test first.

- [ ] **Step 2: Re-run the complete verification on the final branch**

Run the Task 4 verification list unchanged.

Expected: all PASS.

- [ ] **Step 3: Merge and push only after explicit approval already recorded in the conversation**

Fast-forward the validated feature branch into `main`, push the exact commit to GitHub and preserve unrelated worktrees.

- [ ] **Step 4: Publish through the existing Sites project**

Use project `appgprj_6aedd7e23db08191903c79130395fb57`, preserve audience `public`, D1/R2 bindings, variables and custom URL `https://ceea.colegioestrelas.com`. Save and deploy the next version from the exact pushed commit and confirm the resulting version/site state.

