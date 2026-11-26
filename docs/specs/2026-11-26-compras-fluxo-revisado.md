# Spec — Compras: estimativa destravada e fluxo revisado

Status: ready-for-agent · Origem: sabatina de 25/11/2026 com o usuário · Vocabulário: [GLOSSARY.md](../../GLOSSARY.md) · Decisões: [ADR 0001](../adr/0001-conferencia-antes-da-estimativa.md), [ADR 0002](../adr/0002-cotacao-automatica-para-fornecedores-conferidos.md), [ADR 0003](../adr/0003-estimativa-com-frete-e-icms.md)

Etapas em ordem de entrega: **E1** destravar a estimativa (detalhada) · **E2** aviso de queda da ponte (concluída em 26/11/2026, versão 2026.11.26.1) · **E3** conferência antes da estimativa · **E4** cotação automática · **E5** execução, recebimento e fechamento.

## Problem Statement

A Diretoria Administrativa (uma única pessoa) não consegue levar solicitações até a Diretoria Geral porque a estimativa automática é tudo ou nada: basta um item sem preço comprovado para a solicitação ficar parada em Estimativa. A validação exige comprovação literal de cada trecho da página, o que gera muitas pendências; a estimativa manual descarta os preços já encontrados e obriga a redigitar tudo; frete e impostos não entram no custo, então a referência que chega à Diretoria Geral é incompleta. Além disso, a conferência acontece depois da pesquisa (pesquisando pedidos que serão rejeitados), a Diretoria Administrativa escolhe manualmente os destinatários de cada cotação e não há controle do que falta para fechar o mês.

## Solution

A estimativa passa a ser parcial e assistida: cada valor chega marcado como **comprovado** ou **a conferir**; só vira **pendência de estimativa** o item sem preço nenhum. Toda solicitação passa obrigatoriamente pela **revisão da estimativa** da Diretoria Administrativa, que mantém os preços automáticos e completa apenas o que falta, antes de seguir à Diretoria Geral com todos os itens valorados. A estimativa inclui **frete estimado** até o CEP da escola e **ICMS estimado** por tabela mantida pelo Master, em linhas separadas. Depois, a conferência administrativa passa para antes da pesquisa, a cotação sai automaticamente para fornecedores conferidos até completar 3 propostas, e o setor confirma o recebimento.

## User Stories

### E1 — Estimativa destravada

1. Como Diretoria Administrativa, quero que a solicitação saia de Estimativa quando todos os itens tiverem resultado, mesmo que alguns sejam pendência, para não ficar travada por um item.
2. Como Diretoria Administrativa, quero ver cada valor marcado como comprovado ou a conferir, para saber onde concentrar a revisão.
3. Como Diretoria Administrativa, quero que preço encontrado mas não totalmente comprovado (unidade diferente, produto parecido, trecho incompleto) entre como a conferir em vez de pendência, para aproveitar o que a busca achou.
4. Como Diretoria Administrativa, quero que só o item sem preço nenhum fique como pendência de estimativa, com o motivo, para entender o que faltou.
5. Como Diretoria Administrativa, quero digitar o preço apenas dos itens com pendência ou a conferir, mantendo os preços automáticos dos demais, para não redigitar a estimativa inteira.
6. Como Diretoria Administrativa, quero informar link ou fonte em cada preço manual, para manter a rastreabilidade.
7. Como Diretoria Administrativa, quero aceitar um valor a conferir com um clique, transformando-o em valor confirmado por mim, para revisar rápido.
8. Como Diretoria Administrativa, quero refazer a busca de um único item a partir da revisão, sem perder os outros resultados.
9. Como Diretoria Administrativa, quero que o botão Enviar à Diretoria Geral só funcione quando todo item tiver preço, frete e ICMS (automáticos ou manuais), para que a Diretoria Geral sempre receba o valor estimado completo.
10. Como Diretoria Administrativa, quero que nenhuma solicitação vá da estimativa direto à Diretoria Geral, qualquer que seja o valor.
11. Como Diretoria Administrativa, quero ver produtos, frete estimado e ICMS estimado em linhas separadas, com o total geral, para entender a composição do custo.
12. Como Diretoria Administrativa, quero que o frete seja simulado até o CEP da escola com a quantidade pedida, para refletir a entrega em Manaus.
13. Como Diretoria Administrativa, quero que, quando a loja não mostrar o frete, ele seja calculado por percentual configurado e marcado a conferir, para não voltar a travar.
14. Como Master, quero configurar o CEP comercial da escola e o percentual de frete padrão, para ajustar a estimativa sem mudar código.
15. Como Master, quero manter a tabela de alíquotas de ICMS (interna do Amazonas, interestadual por estado de origem, exceções) conforme orientação do contador, para que a IA não deduza regra fiscal.
16. Como Master, quero que o cálculo do ICMS só seja ligado depois de eu confirmar a premissa do contador sobre a escola ser ou não contribuinte, para não inflar estimativas com premissa errada.
17. Como Diretoria Administrativa, quero que a IA apenas identifique o estado de origem da loja, aplicando a tabela vigente, e que o histórico guarde qual tabela valia em cada estimativa.
18. Como Diretoria Administrativa, quero que a busca priorize lojas nacionais conhecidas (Mercado Livre, Magazine Luiza, Amazon, Kabum, Leroy Merlin conforme o item), para reduzir pendências.
19. Como Diretora Geral, quero ver o valor estimado com as marcas de origem (automático, a conferir aceito, manual), para decidir a necessidade com contexto, sem que isso seja teto de valor.
20. Como Diretoria Administrativa, quero que assinaturas digitais continuem com estimativa manual, com frete e ICMS como não se aplica.
21. Como Diretoria Administrativa, quero que resultados antigos ou de critérios já substituídos nunca preencham a revisão atual.
22. Como Master, quero que cada preço manual, aceite de valor a conferir e refação de busca fique no histórico com autoria e data.

### E3 — Conferência antes da estimativa

23. Como Diretoria Administrativa, quero conferir quantidades, completude, recomendação, prioridade e critérios de busca antes de qualquer pesquisa, para não pesquisar pedidos que serão rejeitados ou devolvidos.
24. Como Diretoria Administrativa, quero que a estimativa use as quantidades recomendadas na conferência, preservando as solicitadas, para que o valor reflita o que vou propor.
25. Como Diretora Geral, quero ver quantidade solicitada e recomendada lado a lado com o valor estimado.
26. Como Diretoria Administrativa, quero que a revisão da estimativa seja curta (preços, fontes, refazer busca, enviar), sem repetir perguntas da conferência.
27. Como Diretoria Administrativa, quero continuar podendo rejeitar ou devolver ao setor durante a conferência, antes da pesquisa.

### E4 — Cotação automática

28. Como Diretoria Administrativa, quero que, após a aprovação da necessidade, a cotação saia automaticamente para até 3 fornecedores conferidos da categoria e abrangência, sem eu escolher destinatários.
29. Como Diretoria Administrativa, quero que fornecedores locais conferidos sejam convidados primeiro e os nacionais só quando os locais acabarem.
30. Como Diretoria Administrativa, quero que, se algum convidado não enviar proposta em 1 dia útil, o sistema convide outros até completar 3 propostas, em no máximo 3 rodadas (configurável).
31. Como Diretoria Administrativa, quero receber a solicitação com as propostas que chegaram quando as rodadas ou os fornecedores acabarem, mesmo com menos de 3.
32. Como Diretoria Administrativa, quero que a IA classifique cada resposta como proposta ou não proposta para a contagem, sabendo que eu confiro os valores ao escolher a proposta vencedora.
33. Como Diretoria Administrativa, quero que propostas atrasadas sejam aceitas e entrem na comparação.
34. Como Master, quero manter a lista de feriados nacionais e de Manaus/AM usada no cálculo do dia útil.
35. Como Diretoria Administrativa, quero que fornecedor descoberto na internet só receba o primeiro contato depois da minha conferência.
36. Como Diretoria Administrativa, quero comparar propostas com produtos, frete e ICMS em linhas separadas, no mesmo critério da estimativa.
37. Como Diretoria Administrativa, quero escolher a proposta vencedora com justificativa, mantendo o histórico das demais.

### E5 — Execução, recebimento e fechamento

38. Como Diretoria Administrativa, quero que o agente do WhatsApp prepare mensagens de confirmação do pedido, cobrança de prazo e pedido de nota fiscal, e que cada uma só saia depois da minha aprovação.
39. Como Setor, quero confirmar o recebimento na minha solicitação com um botão Recebi e registrar problemas, porque sou quem sabe se chegou certo.
40. Como Master ou Diretoria Administrativa, quero ver o que falta (nota, recebimento, pagamento) antes de fechar o mês, mantendo o fechamento manual.

## Implementation Decisions

- **Resultado por item com marca.** O resultado da pesquisa de cada item passa a ter três desfechos: comprovado (validação atual), a conferir (preço encontrado com evidência incompleta, com o motivo) e pendência de estimativa (sem preço). Erros de infraestrutura continuam em nova tentativa com espera crescente e só viram pendência após esgotar as tentativas.
- **Validação nos dois lados.** A regra de evidência de preço existe na ponte e no Site; a marca a conferir deve ser decidida pela mesma regra compartilhada nos dois, como hoje.
- **Projeção parcial.** A projeção automática da estimativa deixa de exigir todos os itens comprovados: quando todos os itens têm desfecho final, a solicitação sai de Estimativa para a revisão da estimativa (estado atual de análise administrativa até E3).
- **Estimativa por item com origem.** Cada linha (produto, frete, ICMS) guarda valor, origem (automático, a conferir, aceito, manual, não se aplica), fonte/link, autor e data. A estimativa manual atual (tudo ou nada) é substituída por edição por item; o contrato antigo de estimativa manual completa continua aceito para registros históricos.
- **Bloqueio de envio à Diretoria Geral.** A transição para a Diretoria Geral exige toda linha com valor final (a conferir precisa ser aceito ou substituído). Não há rota da estimativa direto à Diretoria Geral (ADR 0001).
- **Configuração do Master.** Novos ajustes: CEP comercial, percentual padrão de frete, tabela de ICMS com vigência e chave liga/desliga do ICMS (desligada até a confirmação do contador; enquanto desligada, a linha de ICMS é registrada como pendente de premissa e não bloqueia — decisão a confirmar no ticket de ICMS).
- **Frete na busca.** O navegador de compras passa a simular frete até o CEP da escola; dados pessoais da conta continuam suprimidos.
- **Prioridade de fontes.** A busca ordena lojas nacionais conhecidas antes de sites desconhecidos, conforme o tipo de item.
- **Assinaturas.** Permanecem fora da estimativa automática; frete e ICMS como não se aplica.
- **E3.** Reordenar: pendente → conferência administrativa → estimativa (quantidades recomendadas) → revisão da estimativa → Diretoria Geral. Regras de rejeição, devolução, reabertura e reanálise mantêm as garantias atuais.
- **E4.** Cotação automática com rodadas, dia útil com feriados, classificação de respostas pela IA, aceite de atrasadas; preserva idempotência, as duas chaves de envio, proteção contra mudança de telefone e primeiro contato humano com fornecedor novo (ADR 0002).
- **Documentação.** Ao implementar cada etapa, atualizar as regras do AGENTS.md e INTEGRACOES.md que ela substitui (ordem do fluxo, seleção manual de destinatários, frete fora do total, tributação não calculada).

## Testing Decisions

- Testar comportamento externo: estado final da solicitação e das linhas da estimativa no banco local após entregar resultados simulados; não testar detalhes internos.
- **Ponto principal:** a conclusão de pesquisa recebida pelo Site (ponte simulada → resultado por item → estado da solicitação), seguindo o teste D1 de integração e o teste de estimativa parcial existentes.
- **Ponto secundário:** a regra compartilhada de evidência de preço, com casos de comprovado, a conferir e pendência, seguindo o teste atual de evidência.
- Transições (envio à Diretoria Geral bloqueado/liberado, edição por item, histórico) no estilo dos testes de fluxo atuais.
- Interface da revisão no padrão do teste de exibição da estimativa parcial.
- Nenhuma busca real, frete real, e-mail ou WhatsApp nos testes; somente porta 5185 e dados fictícios.

## Out of Scope

- Busca real na internet e frete real em testes automáticos.
- Cálculo do ICMS antes da confirmação do contador.
- Teto de valor ou aprovação de valor pela Diretoria Geral.
- Os módulos Estoque, Conhecimento/POPs, Tarefas e Escolar Manager.
- Detectar ciclos da ponte que falham com o processo ativo (fase 2 do monitor).

## Further Notes

- Pendências do usuário: confirmar com o contador se a escola é contribuinte do ICMS; informar o CEP comercial; habilitar o alias proxmox@ em Enviar e-mail como.
- Critério de pronto do módulo: um mês inteiro de ciclos completos sem intervenção do desenvolvedor.
