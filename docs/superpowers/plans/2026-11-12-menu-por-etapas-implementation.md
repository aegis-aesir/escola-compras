# Menu por etapas do processo orçamentário — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o menu lateral em filas exclusivas do processo orçamentário para a administração, preservando a visão contínua das próprias solicitações para o setor.

**Architecture:** Centralizar os nomes, a ordem, as permissões e o encaixe de status em uma camada pura de navegação do processo. O shell renderiza somente as etapas primárias autorizadas; as telas auxiliares continuam permitidas, mas são abertas por ações contextuais dentro de Solicitação, Cotação e área do usuário. O dashboard reutiliza as telas e handlers atuais, mudando apenas a seleção das filas e os pontos de entrada.

**Tech Stack:** React 19, TypeScript, Vinext, Lucide React, testes Node.js com `assert` e bundle de módulos puros via esbuild.

**Spec:** `docs/superpowers/specs/2026-11-12-menu-por-etapas-design.md`

## Global Constraints

- Preservar estados, transições, permissões, aprovações, dados, histórico e integrações existentes.
- Não criar migração nem estado novo no D1.
- Não enviar mensagens reais pelo WhatsApp e não modificar as chaves OpenClaw.
- Manter o botão Aparência, os temas, a preferência do menu e a responsividade existentes.
- Não publicar na produção sem autorização específica posterior.
- Usar elementos nativos no shell cliente para não reintroduzir o segundo runtime React no Vinext.

## Review Focus

- Um pedido administrativo não pode aparecer simultaneamente em duas filas; Task 1 testa todos os estados ativos e históricos.
- O perfil Setor deve continuar vendo os próprios pedidos em qualquer etapa; Task 1 testa estados do início ao recebimento.
- Telas auxiliares devem permanecer autorizadas sem reaparecer no menu principal; Tasks 2 e 3 testam permissão e navegação contextual.
- A Diretoria Geral deve receber somente `general_review`; Task 1 cobre estados vizinhos e rejeitados.
- O Financeiro deve manter consulta sem receber controles de gravação; Tasks 1 e 4 preservam a matriz atual e executam regressões de perfil.

---

### Task 1: Modelo puro das etapas e filas exclusivas

**Files:**
- Create: `app/process-navigation.ts`
- Create: `scripts/process-navigation-test.mjs`
- Modify: `app/access.ts`
- Modify: `app/request-views.ts`

**Interfaces:**
- Produces: `type ProcessView`, `primaryNavigationForRole(role)`, `allowedViewsForRole(role)` e `requestMatchesView(request, view, role)`.
- Produces: rótulos e ícones lógicos suficientes para o shell consumir sem duplicar a ordem das etapas.
- Preserves: `visibleViews(role)` como fachada compatível para o restante do painel.

- [ ] **Step 1: Escrever o teste falho da ordem e dos rótulos por perfil**

O teste deve exigir para Master e Diretoria Administrativa: `overview`, `requests`, `analysis`, `estimates`, `general_approval`, `quotes`, `execution`, `budget`, com os rótulos exatos da especificação; Setor recebe somente `requests` com o rótulo `Minhas solicitações`; Diretoria Geral recebe somente `general_approval`.

- [ ] **Step 2: Executar o teste e confirmar RED**

Run: `node scripts/process-navigation-test.mjs`
Expected: FAIL porque `app/process-navigation.ts` ou as novas interfaces ainda não existem.

- [ ] **Step 3: Implementar a matriz mínima de navegação e permissões**

Criar as funções puras e fazer `visibleViews(role)` delegar a `allowedViewsForRole(role)`. As telas auxiliares `suppliers`, `whatsapp`, `archives` e `settings` permanecem em permissões autorizadas, mas não em `primaryNavigationForRole`.

- [ ] **Step 4: Ampliar o teste com a matriz exclusiva de status**

Exigir: `pending → analysis`; `estimating/admin_review → estimates`; `general_review → general_approval`; `quoting/national → quotes`; `execution/approved/ordered/received → execution`. Para administração, `correction/deferred/rejected → requests`. Para Setor e Financeiro, `requests` continua aceitando todos os registros não arquivados entregues pela API. Confirmar que cada status administrativo ativo corresponde a exatamente uma fila.

- [ ] **Step 5: Executar e confirmar GREEN**

Run: `node scripts/process-navigation-test.mjs`
Expected: PASS com ordem, rótulos, permissões e exclusividade das filas.

- [ ] **Step 6: Executar regressões de visibilidade**

Run: `node scripts/approval-visibility-test.mjs && node scripts/workflow-test.mjs`
Expected: PASS sem alterar as transições do domínio.

- [ ] **Step 7: Commit**

```bash
git add app/process-navigation.ts app/access.ts app/request-views.ts scripts/process-navigation-test.mjs
git commit -m "feat: mapear filas exclusivas do processo"
```

### Task 2: Menu lateral adaptado ao perfil

**Files:**
- Modify: `app/dashboard-shell.tsx`
- Modify: `scripts/redesign-shell-test.mjs`

**Interfaces:**
- Consumes: `primaryNavigationForRole(role)` e `ProcessView` da Task 1.
- Produces: shell com etapas primárias, destaque do pai para telas auxiliares e área do usuário com Configurações para Master.

- [ ] **Step 1: Escrever os contratos falhos do novo menu**

Atualizar `scripts/redesign-shell-test.mjs` para exigir os oito rótulos na ordem definida, `Minhas solicitações` para Setor, ausência de Fornecedores/WhatsApp/Arquivadas/Configurações na lista primária e controles acessíveis da área do usuário.

- [ ] **Step 2: Executar o teste e confirmar RED**

Run: `node scripts/redesign-shell-test.mjs`
Expected: FAIL porque o shell ainda contém a navegação antiga.

- [ ] **Step 3: Implementar o shell adaptado**

Adicionar `role` às propriedades do shell, renderizar a navegação primária retornada pela Task 1 e mapear `suppliers`/`whatsapp` para Cotação, `archives` para Solicitação e `settings` para a área do usuário. Manter acessibilidade, menu compacto/expandido/móvel, Appearance e elementos nativos exigidos pelo Vinext.

- [ ] **Step 4: Executar e confirmar GREEN**

Run: `node scripts/redesign-shell-test.mjs`
Expected: PASS com identidade, sessão, acessibilidade e menu por perfil preservados.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard-shell.tsx scripts/redesign-shell-test.mjs
git commit -m "feat: adaptar menu lateral ao processo"
```

### Task 3: Filas no dashboard e acessos contextuais

**Files:**
- Modify: `app/dashboard.tsx`
- Modify: `app/redesign.css`
- Modify: `scripts/process-navigation-test.mjs`
- Modify: `scripts/redesign-styles-test.mjs`

**Interfaces:**
- Consumes: `requestMatchesView(request, view, role)` e `ProcessView` da Task 1.
- Produces: filas exclusivas, cabeçalhos novos e ações contextuais para Arquivadas, Fornecedores, Agente WhatsApp e Configurações.

- [ ] **Step 1: Adicionar testes falhos dos pontos de entrada contextuais**

Exigir no dashboard: botão Arquivadas em Solicitação somente quando autorizado; botões Fornecedores e Agente WhatsApp em Cotação; títulos `Análise ADM`, `Estimativa`, `Aprovação Diretoria` e `Resumo Mensal`; ausência de filtro legado que fazia estimativas antigas reaparecerem.

- [ ] **Step 2: Executar e confirmar RED**

Run: `node scripts/process-navigation-test.mjs && node scripts/redesign-styles-test.mjs`
Expected: FAIL nos novos contratos de dashboard/contexto.

- [ ] **Step 3: Substituir o filtro de listas pela função pura**

Fazer a lista operacional chamar `requestMatchesView`. Preservar busca, filtro de status na visão do setor, ordenação, abertura dos detalhes e o bloqueio de navegação por permissão.

- [ ] **Step 4: Atualizar cabeçalhos e ações contextuais**

Passar `role` ao shell; usar os novos títulos e descrições; inserir os acessos auxiliares nos contextos definidos; manter Nova solicitação e Meus rascunhos somente onde já são autorizados.

- [ ] **Step 5: Ajustar o CSS mínimo das ações**

Reutilizar `.page-actions`, `.button` e tokens existentes; adicionar somente o necessário para a área do usuário e grupos contextuais funcionarem em desktop e celular.

- [ ] **Step 6: Executar e confirmar GREEN**

Run: `node scripts/process-navigation-test.mjs && node scripts/redesign-shell-test.mjs && node scripts/redesign-styles-test.mjs`
Expected: PASS sem sobreposição de filas e sem perda dos acessos auxiliares.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard.tsx app/redesign.css scripts/process-navigation-test.mjs scripts/redesign-styles-test.mjs
git commit -m "feat: organizar painel por etapas orcamentarias"
```

### Task 4: Documentação e verificação integral

**Files:**
- Modify: `IMPLEMENTACAO.md`
- Modify: `CONTINUAR-NO-VSCODE.md`

**Interfaces:**
- Consumes: comportamento final das Tasks 1–3.
- Produces: documentação atualizada para continuidade segura do projeto.

- [ ] **Step 1: Documentar a matriz de menu e filas**

Registrar a exceção do Setor, os estados de cada fila, os acessos contextuais e que não houve alteração no fluxo, banco ou integração.

- [ ] **Step 2: Executar os testes focados**

Run: `node scripts/process-navigation-test.mjs && node scripts/redesign-shell-test.mjs && node scripts/redesign-styles-test.mjs && node scripts/approval-visibility-test.mjs && node scripts/estimate-trigger-test.mjs && node scripts/workflow-test.mjs && node scripts/finance-profile-test.mjs`
Expected: todos PASS, sem envio real a fornecedores.

- [ ] **Step 3: Executar verificação de tipos e build**

Run: `node node_modules/typescript/bin/tsc --noEmit && npm.cmd run build`
Expected: TypeScript e build concluídos sem erro.

- [ ] **Step 4: Verificar integridade do diff**

Run: `git diff --check && git status --short`
Expected: nenhuma inconsistência de whitespace; somente arquivos previstos antes do commit.

- [ ] **Step 5: Commit**

```bash
git add IMPLEMENTACAO.md CONTINUAR-NO-VSCODE.md
git commit -m "docs: registrar navegacao por etapas"
```

- [ ] **Step 6: Entregar sem publicar**

Informar commit final, verificações executadas e que a versão 42 da produção permanece inalterada até autorização específica.
