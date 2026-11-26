# 02: Saída parcial da Estimativa

**What to build:** quando todos os itens da solicitação têm desfecho final (preço comprovado ou pendência de estimativa após esgotar as tentativas), a solicitação sai de Estimativa e volta à Diretoria Administrativa para a revisão da estimativa, com cada pendência marcada e seu motivo. Nunca segue à Diretoria Geral automaticamente. Enviar à Diretoria Geral fica bloqueado enquanto houver pendência. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** 01.

**Status:** done (26/11/2026, codex/compras)

- [x] Ponte simulada entrega 1 item comprovado e 1 pendência: a solicitação termina na revisão da estimativa, não em Estimativa
- [x] Erro de infraestrutura ainda em nova tentativa não conta como desfecho final
- [x] Enviar à Diretoria Geral é recusado (servidor e interface) enquanto houver pendência
- [x] Resultados de critérios ou revisões antigas não contam como desfecho
- [x] Assinaturas digitais continuam fora da estimativa automática
- [x] AGENTS.md e INTEGRACOES.md atualizados onde diziam "todos os itens precisam de preço validado"
