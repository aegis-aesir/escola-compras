# Solicitação única Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reapresentar pedidos adiados sem gerar outra solicitação.
**Architecture:** Revisão editável dentro de request; snapshots de rodadas anteriores. Conversão idempotente de cópias não enviadas em versões históricas vinculadas.
**Tech Stack:** React/Vinext, TypeScript, Cloudflare D1/R2 e Sites existentes.
**Spec:** docs/superpowers/specs/2026-11-13-solicitacao-unica-design.md

## Global Constraints
- Mesmo ID/protocolo/autoria; preservar dados/R2/credenciais e regras de aprovação.
- Nova rodada exige nova estimativa/parecer/DG; nenhum envio real de WhatsApp.
- Setor só edita seus adiados ativos; Master pode antecipar com motivo. Bloquear mês fechado e versões obsoletas.

## Review Focus
- Cópias arquivadas com anexos e concorrência de edição durante a incorporação.
- Troca de mês/ano em Manaus e repetição de envio.
- Snapshots internos não podem vazar para setor/DG.
- Resumo de competência anterior não pode desaparecer após reapresentação.
- Cópia local antiga não pode ressuscitar um rascunho incorporado.

## Task 1: Dados, transições e compatibilidade
- [x] Teste isolado: adiar sem draftId; reapresentar mesmo ID; guardar decisão/estimativa/competência anterior; bloquear usuário/mês/versão; preservar outros dados.
- [x] Implementar `app/deferred-request.ts`, tipos, transição, endpoint de revisão, incorporação em `lib/deferred-requests.ts` e uso nos endpoints existentes.
- [x] Testar migração duas vezes com D1/R2 isolados: uma solicitação, nenhum rascunho duplicado, arquivos e auditoria intactos.

## Task 2: Interface, segurança e resumo
- [x] Implementar formulário com autosave/backup, ação Revisar e reapresentar em Adiado e histórico por rodada.
- [x] Atualizar projeções de acesso, anexos e resumo por competência.
- [x] Testar HTTP local, permissões e SSR; atualizar testes do fluxo anterior.

## Task 3: Publicação
- [ ] Rodar tipos e regressões de fluxo, financeiro, rascunhos e integração.
- [ ] Atualizar AGENTS/IMPLEMENTACAO/CONTINUAR e versão; revisar diff; commit/push main.
- [ ] Build oficial Sites, salvar/publicar na hospedagem existente e conferir resultado.

## Ledger
- Início: main limpo em a614839. Usuário autorizou implementação direta da primeira opção.

- Testes novos passaram: mesmo protocolo e histórico, isolamento por perfil, autosave/anexos, idempotência e exclusão lógica restrita. Migração concorrente preservou arquivo e gerou apenas uma revisão.
- Acréscimo autorizado: ações dos arquivados por tipo e exclusão de rascunhos pelo Master. A exclusão será lógica para preservar dados e auditoria; nenhuma exclusão real em produção.
- Testes antigos ajustados ao contrato de solicitação única e à consulta mensal já autorizada da DG.

- Revisão independente identificou três casos, corrigidos: projeção recursiva de históricos do Financeiro, rejeição explícita do envio independente de cópia legada em conflito e recuperação assistida de backup divergente após resposta de autosave perdida. Cobertura acrescentada aos testes.
