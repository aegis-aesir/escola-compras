# 08: ICMS estimado

**What to build:** o Master mantém a tabela de alíquotas de ICMS (interna do Amazonas, interestadual por estado de origem, exceções) com vigência, e a chave do cálculo. Com a chave desligada (padrão até a confirmação do contador), cada item tem a linha ICMS aguardando contador, que não impede a Diretoria Administrativa de enviar à Diretoria Geral. Com a chave ligada, a IA só identifica o estado de origem da loja, o sistema aplica a tabela vigente (a conferir quando a origem é incerta) e o histórico guarda qual tabela valeu. É referência de custo, não apuração fiscal; a matriz fiscal da compra real não muda. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** 06.

**Status:** ready-for-agent

- [ ] Chave desligada: linha aguardando contador, envio à Diretoria Geral permitido
- [ ] Chave ligada: alíquota aplicada pela tabela vigente e pelo estado de origem; tabela registrada na estimativa
- [ ] Origem incerta gera ICMS a conferir
- [ ] Somente Master altera tabela e chave, com histórico
- [ ] Diretoria Geral vê produtos, frete, ICMS e total separados
