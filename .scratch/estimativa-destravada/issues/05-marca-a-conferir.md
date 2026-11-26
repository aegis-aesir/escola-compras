# 05: Marca "a conferir"

**What to build:** a regra de evidência de preço, compartilhada entre ponte e Site, ganha o desfecho a conferir: preço encontrado com comprovação incompleta (unidade diferente, produto parecido, trecho incompleto), com o motivo. Só vira pendência o item sem preço nenhum. Na revisão, o valor a conferir aparece destacado e a Diretoria Administrativa aceita com um clique (origem aceito) ou substitui por valor manual; a conferir não aceito impede o envio à Diretoria Geral. A ponte no CT 105 precisa ser atualizada pelo coordenador na publicação. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** 03.

**Status:** done (26/11/2026, commit local na branch codex/compras)

- [x] Testes da regra de evidência cobrem comprovado, a conferir e pendência, idênticos na ponte e no Site
- [x] Resultado a conferir chega ao Site com motivo e é exibido destacado
- [x] Aceitar com um clique registra autoria/data e muda a origem para aceito
- [x] Envio à Diretoria Geral recusado com qualquer a conferir não aceito
- [x] Instruções do agente de análise atualizadas para devolver a conferir em vez de pendência quando houver preço
