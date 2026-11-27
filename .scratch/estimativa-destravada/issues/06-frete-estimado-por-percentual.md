# 06: Frete estimado por percentual

**What to build:** o Master configura o CEP comercial da escola e o percentual padrão de frete. Cada item da estimativa ganha a linha de frete estimado, calculada pelo percentual e marcada a conferir; a Diretoria Administrativa aceita ou ajusta na revisão. Frete passa a ser obrigatório para enviar à Diretoria Geral, que vê produtos, frete e total em linhas separadas. Assinaturas: frete não se aplica. Spec: docs/specs/2026-11-26-compras-fluxo-revisado.md (E1). Vocabulário: GLOSSARY.md. Decisões: docs/adr/0001 e 0003.

**Blocked by:** 03.

**Status:** done

- [x] Somente Master altera CEP e percentual; alterações ficam no histórico
- [x] Linha de frete por percentual criada para cada item, origem a conferir
- [x] Total geral soma produtos e frete, sem contar frete duas vezes
- [x] Envio à Diretoria Geral exige frete aceito ou manual em todos os itens (exceto não se aplica)
- [x] Diretoria Geral vê produtos, frete e total separados
- [x] Regras do AGENTS.md/INTEGRACOES.md sobre "frete fora do total" atualizadas
