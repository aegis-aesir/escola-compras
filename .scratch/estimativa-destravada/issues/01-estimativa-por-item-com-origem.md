# 01: Preparação — estimativa por item com origem

**What to build:** a estimativa passa a ser representada por item, com linhas de produto, frete e ICMS; cada linha guarda valor, origem (automático, a conferir, aceito, manual, não se aplica, aguardando contador), fonte/link, autor e data. Estimativas já registradas (automáticas e manuais completas) continuam lidas e exibidas exatamente como hoje. Nenhum comportamento visível muda. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Estimativas antigas (automática e manual) são lidas no novo formato sem migração destrutiva e aparecem iguais no painel e para a Diretoria Geral
- [ ] Total, subtotal e dados enviados à Diretoria Geral permanecem idênticos para registros antigos
- [ ] Testes de fluxo, estimativa parcial e integração D1 existentes continuam passando
- [ ] Teste novo cobre a leitura de cada formato antigo
