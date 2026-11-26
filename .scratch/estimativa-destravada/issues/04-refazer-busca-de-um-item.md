# 04: Refazer a busca de um item na revisão

**What to build:** em cada item da revisão da estimativa, a Diretoria Administrativa pode refazer só aquela busca (com os critérios do item), sem perder os resultados dos outros itens. Enquanto a nova busca roda, o item aparece em andamento; resultados antigos nunca preenchem a revisão atual. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** 02.

**Status:** done

- [x] Refazer um item mantém os demais resultados e a solicitação na revisão da estimativa
- [x] Resultado da busca anterior do mesmo item é ignorado depois da nova solicitação de busca
- [x] Histórico registra quem refez e quando
