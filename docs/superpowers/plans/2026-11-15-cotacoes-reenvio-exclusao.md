# Contatos e reenvio de cotações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** permitir novos envios escolhidos pelo usuário, exclusão recuperável e aviso/consentimento de reenvio.
**Architecture:** registros preservados com tombstone e auditoria, nova identidade por preparação, confirmação versionada do último recibo. Contatos e mensagens em unidades separadas; testes locais fictícios.
**Tech Stack:** React/TypeScript, D1/Workers, ponte Node/PowerShell existente.
**Spec:** docs/superpowers/specs/2026-11-15-cotacoes-reenvio-exclusao-design.md

## Global Constraints
- Worktree Compras, branch codex/compras, porta5185; coordenador publica/ativa produção.
- Sem dados reais, envio nativo, credenciais ou migração durante testes.
- Master/ADM; não reabrir running/uncertain ou apagar recibos.

## Review Focus
- Dois preparos simultâneos para mesmo telefone: no máximo uma nova tarefa.
- Recibo entre seleção e envio: confirmação antiga deve ser recusada.
- Contato excluído em prévia/sugestões/importação: não reaparece sem restauração.
- Restauro de rascunho: não pode disparar automaticamente.
- Repetição após falha de rede: mesmo preparo retorna mesmo ID.

### Task 1 — Agenda recuperável
**Files:** contact-model.ts, contact-agenda.tsx, api/contacts/route.ts, lib/contact-agenda.ts, novo lib/contact-removal.ts e testes próprios.
**Interface:** `removed?:{at,by,reason}`; snapshot `removedEntries?:AgendaEntry[]`; API remove/restore com id/version/reason; remover recusa tarefas ativas. Root filtra seleção/legado de fornecedores.
- [ ] Escrever teste D1 de remoção/restauro/pending/versão; observar RED.
- [ ] Implementar API e UI Lixeira, preservar nomes/histórico e tombstones em importação.
- [ ] Executar testes dirigidos e comunicar arquivos/limites.

### Task 2 — Ciclo de cotação e confirmação
**Files:** integration-model/panel, quotation-contact-model, quotation-message-form, dashboard, lib/integrations/quotation-contacts, api/data, novo helper de ciclo e testes próprios.
**Interface:** preparação recebe UUID `preparationId`; seleção pode incluir `resendOf:{id,version}`; escolha recebe `lastSent:{id,version,sentAt}`; jobs podem ter removed/preparationId/resendOf. Remoção recuperável pela API Master/ADM.
- [ ] Escrever teste RED de exclusão, novo ID, aviso/consentimento, idempotência e concorrência.
- [ ] Implementar guards atômicos, referências versionadas e reenvio com histórico intacto.
- [ ] Implementar aviso com data/contato e confirmação obrigatória; Lixeira de tarefas.
- [ ] Testar contato removido, prévia, mês fechado, dados stale e recibo concorrente.

### Task 3 — Integração e entrega
**Files:** start-windows.ps1, documentação/regras e scripts de configuração.
- [ ] Launcher lê booleano estrito enableSend do cofre, mantendo modo local bloqueado e grants separados.
- [ ] Testar UI/HTTP5185, regressões pertinentes, tipos e build; revisão independente.
- [ ] Commit/push codex/compras; entrega ao coordenador com preflight de fila antes de ativar envio normal.
