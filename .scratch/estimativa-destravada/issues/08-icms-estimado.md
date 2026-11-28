# 08: ICMS estimado

**What to build:** o Master mantém a tabela de alíquotas de ICMS (interna do Amazonas, interestadual por estado de origem, exceções) com vigência, e a chave do cálculo. Com a chave desligada (padrão até a confirmação do contador), cada item tem a linha ICMS aguardando contador, que não impede a Diretoria Administrativa de enviar à Diretoria Geral. Com a chave ligada, a IA só identifica o estado de origem da loja, o sistema aplica a tabela vigente (a conferir quando a origem é incerta) e o histórico guarda qual tabela valeu. É referência de custo, não apuração fiscal; a matriz fiscal da compra real não muda. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Premissa fiscal (informada pelo usuário em 27/11/2026):** nas compras de outro estado, a escola paga a diferença de alíquota (DIFAL). Portanto o ICMS estimado só existe para item de loja de fora do Amazonas: diferença entre a alíquota interna do AM e a interestadual da origem (tabela do Master), aplicada sobre produto + frete. Loja do Amazonas: ICMS já está no preço, linha "não se aplica". Origem incerta: a conferir. A forma exata da base de cálculo continua a critério do contador (o Master ajusta a tabela); a chave pode ser ligada assim que a tabela estiver preenchida.

**Blocked by:** 06.

**Status:** done (28/11/2026, branch codex/compras; DIFAL conforme a premissa do usuário; a ponte não muda — UF informada pela Diretoria Administrativa enquanto a pesquisa não a trouxer)

- [x] Chave desligada: linha aguardando contador, envio à Diretoria Geral permitido
- [x] Chave ligada: alíquota aplicada pela tabela vigente e pelo estado de origem; tabela registrada na estimativa
- [x] Origem incerta gera ICMS a conferir
- [x] Somente Master altera tabela e chave, com histórico
- [x] Diretoria Geral vê produtos, frete, ICMS e total separados
