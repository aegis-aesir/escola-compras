# Ordem, versão e arquivo de rascunhos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reordenar a decisão, esclarecer o adiamento, exibir versão e implementar arquivo reversível de rascunhos para Setor e Master.

**Architecture:** A tela apenas muda a ordem de apresentação; o arquivo de rascunhos permanece em D1 e usa o mesmo registro/versionamento. A API centraliza propriedade e permissão Master; componentes separados apresentam rascunhos próprios e globais.

**Tech Stack:** TypeScript, React 19, Vinext, Cloudflare D1, Node.js.

**Spec:** `docs/superpowers/specs/2026-11-12-ordem-versao-arquivo-rascunhos-design.md`

## Global Constraints

- Não excluir rascunhos nem anexos.
- Não permitir edição de rascunho alheio pelo Master.
- Não alterar aprovações, OpenClaw ou envio de mensagens.

## Review Focus

- Arquivamento concorrente respeita versão e propriedade.
- Rascunho arquivado não pode ser salvo nem enviado.
- Master vê todos; Setor continua vendo somente os próprios.
- Decisão não aparece duplicada e mantém a ação de devolução integrada.
- Versão permanece visível em temas e larguras diferentes.

---

### Task 1: Ordem e textos da decisão

**Files:** `app/budget-record-panel.tsx`, `scripts/general-return-ui-test.mjs`

- [ ] Testar ordem Estimativas → Decisão → Execução e novo rótulo do adiamento.
- [ ] Confirmar RED, mover o bloco e confirmar GREEN.

### Task 2: Versão visível

**Files:** `app/system-version.ts`, `app/dashboard-shell.tsx`, `scripts/redesign-shell-test.mjs`

- [ ] Testar renderização de versão persistente.
- [ ] Confirmar RED, implementar constante/visual e confirmar GREEN.

### Task 3: Arquivo de rascunhos

**Files:** `app/request-draft.ts`, `app/api/drafts/route.ts`, `app/draft-request-form.tsx`, `app/master-drafts-panel.tsx`, `app/process-navigation.ts`, `app/dashboard.tsx`, `app/api/data/route.ts`, `scripts/request-drafts-test.mjs`, `scripts/process-navigation-test.mjs`

- [ ] Escrever testes HTTP para propriedade, Master, arquivar/restaurar, conflito e bloqueio de envio.
- [ ] Confirmar RED, implementar API e modelos, confirmar GREEN.
- [ ] Escrever/renderizar testes de navegação e controles, confirmar RED→GREEN.

### Task 4: Documentar, verificar e publicar

**Files:** `AGENTS.md`, `IMPLEMENTACAO.md`, `CONTINUAR-NO-VSCODE.md`

- [ ] Atualizar documentação.
- [ ] Executar regressões, TypeScript, build e diff-check.
- [ ] Mesclar, enviar ao GitHub e publicar no Site existente.

