# Compatibilidade de formulários Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Implantar os três formulários antigos e os controles das diretorias, preservando o fluxo atual e os dados.

**Architecture:** Extensão aditiva dos registros existentes; contratos compartilhados e campos declarativos para formulários extensos, regras e projeções validadas no servidor. Anexos privados em R2. Consolidação e documentos fiscais em registros próprios com versão e auditoria.

**Tech Stack:** React/Vinext, TypeScript/Zod, Cloudflare Workers/D1/R2, Sites existente.

**Spec:** docs/superpowers/specs/2026-11-10-compatibilidade-formularios-design.md, aprovada expressamente pelo usuário em 10/11/2026.

## Global Constraints
- Diretoria Geral aprova a necessidade, sem teto de valor ou reaprovação por aumento de preço.
- Estimativa, referência do setor, cotação oficial e realizado são distintos.
- Setor somente seus formulários; DG somente decisão da necessidade; controles administrativos para Master/Administrativo.
- Preservar project_id, DB, usuários, histórico e documentos originais; nunca importar automaticamente as duas linhas preenchidas da planilha.
- WhatsApp operacional +55 92 9201-7107; testes sem mensagens reais.

## Review Focus
- Pedido antigo sem campos novos deve abrir sem atribuir declarações ou classificações inventadas.
- Aprovação parcial precisa alterar o escopo efetivamente enviado/selecionado, sem comprar itens excluídos.
- Anexos administrativos não podem ser lidos por setor ou por DG; não permitir requisições anônimas.
- Pagamento e fechamento não podem ignorar pendência obrigatória ou duplicar realizado por nota/proposta.
- Ciclos, câmbio, valores ausentes e calendários em virada de ano devem manter semântica explícita.

### Task 1: Contratos, regras dos formulários e decisões
Files: app/budget-fields.ts, app/budget.ts, app/model.ts, app/access.ts, app/workflow.ts, scripts/budget-test.mjs.
Interfaces: BudgetForm={kind,fields,references,accepted}; Purchase.form opcional para legado; Purchase.management campos administrativos; decisionScope por índices originais com escopo seguro.
- [ ] Testes RED de modelos, campos condicionais, cálculos de assinatura, calendário, parcial/devolução/adiamento e projeções.
- [ ] Implementar contratos e regras; usar assinatura autenticada com data do servidor.
- [ ] GREEN dos testes e verificação de tipos; registrar evidências no ledger.

### Task 2: Formulários e controles por pedido
Files: app/budget-request-form.tsx, app/budget-record-panel.tsx, app/budget.css, app/dashboard.tsx, app/workflow-panel.tsx, app/api/data/route.ts.
Interfaces: formulário produz o requestSchema mais BudgetForm; painel consome Purchase/Snapshot e onSave(payload):Promise<boolean>; ações budget_management, return_request, resubmit_request, defer_request, resume_request e decide_need.
- [ ] Implementar três formulários com itens, referências, declaração, anexos após criação e correções.
- [ ] Implementar conferência/parecer/financeiro/execução e mapa de cotações; ligar decisões estruturadas sem bypass legado.
- [ ] Teste local de persistência, validação e permissões; revisar móvel e tema.

### Task 3: Controle fiscal e fechamento mensal
Files: app/budget-month.ts, app/budget-month-panel.tsx, lib/budget-records.ts, scripts/budget-records-test.mjs.
Interfaces: Snapshot.budgetRecords contém registros autorizados fiscal/closing; budgetRecordsAction(db,payload,me,requests,settings,now) retorna id; dados de mês derivam dos pedidos sem duplicação.
- [ ] RED de pagamento bloqueado/dispensa documentada, fechamento com pendências/posição futura e concorrência.
- [ ] Implementar matriz fiscal, notas e liberação, cálculos mensais, indicadores, fechamento/reabertura e plano de ações.
- [ ] GREEN D1 isolado; integrar área mensal somente gestão.

### Task 4: Anexos privados e publicação
Files: lib/budget-files.ts, worker/index.ts, .openai/hosting.json, tipos Cloudflare, scripts/budget-files-test.mjs, documentação.
Interfaces: /api/files recebe POST multipart {requestId,file,visibility}; GET /api/files/{id} exige acesso e responde attachment privado; metadados autorizados por pedido.
- [ ] RED de anonimato, acesso cruzado, visibilidade, tamanho, tipos e CSRF.
- [ ] Implementar R2 privado BUCKET mantendo D1 DB; metadados records/audit com identidade e tamanho.
- [ ] Testar conjunto relevante, TypeScript/build, revisar código completo e corrigir problemas importantes.
- [ ] Atualizar documentação, publicar pelo helper oficial Sites no mesmo projeto e confirmar resultado.
