# Simplificar formulário — plano de implementação

**Objetivo:** reduzir o preenchimento do setor e usar competência automática do primeiro envio em Manaus.

**Arquitetura:** contrato versionado preserva os formulários anteriores; descritores compartilhados validam o novo formulário. O servidor define mês e vínculo de complementação.

**Spec:** ../specs/2026-11-10-simplificar-formulario-design.md

## Restrições

Preservar D1/R2, login, permissões, fluxo das diretorias e hospedagem. Sem mensagens reais. Sem migração destrutiva ou reclassificação de pedidos antigos.

## Revisão

Virada UTC/Manaus; cliente forjando mês; complementação posterior; origem antiga contraditória; documentos/referências ausentes em emergência ou assinatura.

## Tarefas

- [x] Escrever e executar testes que falham para formulário simplificado, classificação obrigatória, mês Manaus e preservação da competência em correções.
- [x] Implementar versão 2 em budget-fields.ts/budget.ts e contexto de envio na API; preservar validação da versão anterior.
- [x] Atualizar formulário e consulta: campos removidos, classificação única, resposta condicional, mês informativo e referências opcionais. Conferir relatório mensal.
- [ ] Verificar tipos, testes de regressão, HTTP real local e interface; gerar build, sincronizar e publicar no Site existente.
