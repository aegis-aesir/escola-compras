# 03: Completar só o que falta

**What to build:** na revisão da estimativa, a Diretoria Administrativa informa preço e link/fonte apenas nos itens com pendência, mantendo os preços automáticos dos demais; cada preenchimento fica no histórico com autoria e data. Com todos os itens valorados, ela usa Enviar à Diretoria Geral. Substitui a estimativa manual tudo ou nada (o contrato antigo continua aceito para histórico). Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** 02.

**Status:** done (26/11/2026, branch codex/compras)

- [x] Solicitação com 2 comprovados e 1 pendência: a Diretoria Administrativa preenche só o pendente e os 2 automáticos permanecem com origem automático
- [x] Preço manual exige fonte/link e fica com origem manual
- [x] Envio à Diretoria Geral liberado só com todos os itens valorados; a Diretora Geral vê a origem de cada valor
- [x] Controle de versão e mês aberto respeitados; histórico registra cada edição
- [x] Teste de transição e de interface no padrão dos testes de estimativa parcial
