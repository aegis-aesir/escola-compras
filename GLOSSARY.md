# CEEA Manager — Compras

Processo orçamentário do Colégio Estrelas: do pedido de um setor até o fechamento do mês, com controle de quem pediu, quem aprovou, quanto custou e com qual documento.

## Pessoas e papéis

**Setor**:
Área da escola que pede um item ou serviço.
_Avoid_: Solicitante, departamento

**Diretoria Administrativa**:
Pessoa que confere as solicitações, encaminha à Diretoria Geral, escolhe fornecedores e conduz a execução.
_Avoid_: ADM, administração

**Diretoria Geral**:
Pessoa que aprova ou não a necessidade de uma solicitação. Nunca aprova valor.
_Avoid_: DG (só em texto informal), direção

## Fluxo

**Solicitação**:
Pedido formal de um setor, com itens, quantidades e competência; mantém um único protocolo durante toda a vida, inclusive adiamentos e reaberturas.
_Avoid_: Pedido de compra, requisição

**Conferência administrativa**:
Análise da solicitação pela Diretoria Administrativa antes da estimativa: quantidades, completude, recomendação, prioridade e critérios de busca. Pode rejeitar ou devolver ao setor.
_Avoid_: Parecer, análise ADM

**Estimativa**:
Preço de referência de cada item, levantado na internet automaticamente ou informado pela Diretoria Administrativa, antes da aprovação da necessidade. Não é oferta de fornecedor.
_Avoid_: Orçamento, cotação, pesquisa de preço

**Comprovado / A conferir**:
Marca de cada valor da estimativa: comprovado quando a página da loja sustenta o valor; a conferir quando é aproximado ou deduzido e depende da revisão da Diretoria Administrativa.
_Avoid_: Validado, provisório

**Frete estimado**:
Custo de entrega até o CEP da escola incluído na estimativa, simulado na loja ou calculado por percentual configurado.
_Avoid_: Frete real, frete da proposta

**ICMS estimado**:
Imposto estimado incluído na estimativa como referência de custo: a diferença de alíquota (DIFAL) que a escola paga nas compras de outro estado — alíquota interna do Amazonas menos a interestadual da UF de origem, sobre produto + frete —, pela tabela com vigência mantida pelo Master. Loja do Amazonas e assinaturas digitais: não se aplica. Enquanto o Master não liga o cálculo, fica aguardando contador. Não é apuração fiscal.
_Avoid_: DIFAL apurado, imposto devido

**Pendência de estimativa**:
Item para o qual a pesquisa automática não encontrou preço nenhum; precisa de preço manual antes de a solicitação seguir à Diretoria Geral.
_Avoid_: Erro de pesquisa, item sem preço

**Revisão da estimativa**:
Passagem obrigatória da Diretoria Administrativa depois da estimativa e antes da Diretoria Geral, para confirmar ou completar os preços.
_Avoid_: Segunda conferência, reanálise

**Aprovação da necessidade**:
Decisão da Diretoria Geral de que a solicitação deve ser atendida, total ou parcialmente. Não fixa teto de valor.
_Avoid_: Aprovação do valor, aprovação da compra

**Cotação**:
Pedido de preço enviado a fornecedores reais, pelo WhatsApp, depois da aprovação da necessidade.
_Avoid_: Estimativa, orçamento

**Proposta vencedora**:
Proposta escolhida pela Diretoria Administrativa para a execução da compra.
_Avoid_: Fornecedor escolhido, aprovação da proposta

**Proposta**:
Resposta comercial real de um fornecedor a uma cotação, com preço, condições, fonte e data.
_Avoid_: Orçamento, estimativa

**Rejeição**:
Decisão de não atender a solicitação, tomada pela Diretoria Administrativa antes da Diretoria Geral, ou pela Diretoria Geral. Pode ser reaberta com justificativa.
_Avoid_: Cancelamento, exclusão

**Recebimento**:
Confirmação, pelo setor que pediu, de que o material ou serviço chegou na quantidade e no estado esperados, com registro de problemas quando houver.
_Avoid_: Entrega, aceite da Diretoria Administrativa

**Fechamento do mês**:
Ato manual do Master ou da Diretoria Administrativa que encerra a competência, liberado depois de resolvidas as pendências de nota, recebimento e pagamento.
_Avoid_: Encerramento automático, competência fechada sozinha
