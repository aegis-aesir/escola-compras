# 07: Frete simulado até o CEP

**What to build:** o navegador de compras simula o frete até o CEP comercial configurado, com a quantidade pedida; quando obtém o valor completo, ele substitui o percentual como frete comprovado. Dados pessoais da conta continuam suprimidos da página analisada. Sem valor, mantém o percentual a conferir. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** 06.

**Status:** ready-for-agent

- [ ] Com página simulada exibindo frete para o CEP, a linha de frete fica comprovada com o valor
- [ ] Sem frete na página, mantém o percentual a conferir
- [ ] E-mail, endereço pessoal e CPF continuam omitidos; o CEP comercial é o único dado de destino usado
- [ ] Nenhuma busca real nos testes
