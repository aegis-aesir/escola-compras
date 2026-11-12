# Pendência, Dashboard e Resumo da Diretoria Geral Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar a devolução administrativa à decisão da Diretoria Geral e liberar Dashboard e Resumo Mensal em modo de consulta.

**Architecture:** A interface reutiliza a ação de domínio `return_to_admin`; a navegação e a fachada de leitura passam a fornecer ao perfil `geral` as informações necessárias para acompanhamento. As proteções de escrita existentes permanecem como limite de autorização.

**Tech Stack:** TypeScript, React 19, Vinext, Node.js, esbuild.

**Spec:** `docs/superpowers/specs/2026-11-12-dg-pendencia-dashboard-resumo-design.md`

## Global Constraints

- Preservar pedidos, histórico, hospedagem e integrações existentes.
- Não enviar mensagens reais a fornecedores.
- Diretoria Geral aprova a necessidade, não escolhe fornecedor nem executa a compra.

## Review Focus

- A devolução exige pendência não vazia e usa a transição protegida já existente.
- A opção aparece dentro da decisão, sem colapsável duplicado.
- Dashboard e Resumo Mensal são navegáveis pelo perfil `geral`.
- Dados de acompanhamento não concedem ações administrativas de escrita.
- A fila de aprovação continua contendo somente `general_review`.

---

### Task 1: Integrar a devolução ao formulário de decisão

**Files:**
- Modify: `app/budget-record-panel.tsx`
- Test: `scripts/general-return-ui-test.mjs`

**Interfaces:**
- Consumes: `send('return_to_admin', {reason})`
- Produces: opção `return_admin` no seletor de decisão e campo de pendência condicional.

- [ ] Escrever teste de renderização que exija a opção dentro da decisão e rejeite o colapsável separado.
- [ ] Executar o teste e confirmar falha pela estrutura atual.
- [ ] Encaminhar `return_admin` à ação existente e renderizar o campo obrigatório.
- [ ] Executar o teste e confirmar aprovação.

### Task 2: Liberar acompanhamento da Diretoria Geral

**Files:**
- Modify: `app/process-navigation.ts`
- Modify: `app/access.ts`
- Modify: `app/api/data/route.ts`
- Test: `scripts/process-navigation-test.mjs`
- Test: `scripts/local-auth-test.mjs`

**Interfaces:**
- Consumes: `primaryNavigationForRole`, `allowedViewsForRole`, `visibleRequests`.
- Produces: Dashboard, Aprovação Diretoria e Resumo Mensal consultáveis pelo perfil `geral`.

- [ ] Alterar primeiro os testes de navegação e leitura para o novo contrato.
- [ ] Executar e confirmar falhas nas permissões atuais.
- [ ] Ampliar somente as leituras necessárias, preservando os bloqueios de escrita.
- [ ] Executar testes focados e regressões do fluxo.

### Task 3: Documentar, compilar e publicar

**Files:**
- Modify: `AGENTS.md`
- Modify: `IMPLEMENTACAO.md`
- Modify: `CONTINUAR-NO-VSCODE.md`

- [ ] Atualizar as regras operacionais e o estado da implementação.
- [ ] Executar testes de fluxo, tipos, build e `git diff --check`.
- [ ] Mesclar no `main`, enviar ao GitHub e publicar nova versão do Site existente.

