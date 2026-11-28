# 09: Prioridade de lojas nacionais conhecidas

**What to build:** a busca da estimativa ordena lojas nacionais conhecidas (Mercado Livre, Magazine Luiza, Amazon, Kabum, Leroy Merlin, conforme o tipo de item) antes de sites desconhecidos ao escolher as páginas analisadas, para reduzir pendências. Mudança somente na ponte; publicada no CT 105 pelo coordenador. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Com resultados simulados misturados, as páginas de lojas conhecidas são analisadas primeiro
- [x] Sem loja conhecida nos resultados, o comportamento atual permanece
- [x] Lista de lojas configurável sem mudar código da ponte
