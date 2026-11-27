# 07: Frete simulado até o CEP

**What to build:** o navegador de compras simula o frete até o CEP comercial (constante do sistema, 69086-665), com a quantidade pedida; quando obtém o valor completo, ele substitui o percentual como frete comprovado. Dados pessoais da conta continuam suprimidos da página analisada. Sem valor, mantém o percentual a conferir. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** 06.

**Status:** done (27/11/2026, branch codex/compras; inclui o ajuste do usuário: frete vem da estimativa/loja e CEP 69086-665 embutido no sistema)

- [x] Com página simulada exibindo frete para o CEP, a linha de frete fica comprovada com o valor
- [x] Sem frete na página, mantém o percentual a conferir
- [x] E-mail, endereço pessoal e CPF continuam omitidos; o CEP comercial é o único dado de destino usado
- [x] Nenhuma busca real nos testes
