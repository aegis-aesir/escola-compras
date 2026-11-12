# Financeiro após aprovação da Diretoria Geral

## Intenção

O perfil Financeiro deve acompanhar somente solicitações cuja necessidade já tenha sido aprovada pela Diretora Geral. A autorização continua sendo da necessidade, sem teto de valor.

## Escopo aprovado

- A regra é aplicada no servidor pela presença de `generalApproval`, não apenas na interface.
- Uma solicitação aprovada continua visível ao Financeiro nas etapas posteriores, inclusive cotação, execução, recebimento e consulta histórica.
- Notas, pagamentos, anexos privados, fechamentos e atividades entregues ao Financeiro devem estar limitados às solicitações aprovadas que ele pode consultar.
- Solicitações ainda em preenchimento, estimativa, análise administrativa, aguardando decisão da Diretoria Geral, rejeitadas ou adiadas sem aprovação não são entregues ao perfil Financeiro.
- Master, Diretoria Administrativa, Diretoria Geral e Setor mantêm as permissões existentes.
- O Financeiro permanece estritamente somente leitura.

## Abordagens consideradas

1. **Filtro de autorização no servidor por `generalApproval` — escolhida.** Protege listagens, históricos, anexos e registros vinculados mesmo que o usuário tente chamar a API diretamente.
2. **Filtro apenas na interface.** Rejeitada porque esconderia dados visualmente sem impedir acesso direto aos endpoints.
3. **Filtro por status posterior à aprovação.** Rejeitada porque duplica a regra do fluxo e pode falhar quando novos estados forem adicionados; `generalApproval` é o registro autoritativo da decisão favorável.

## Restrições

- Preservar dados, hospedagem, D1, R2, credenciais e histórico existentes.
- Não migrar nem apagar registros.
- Não alterar o fluxo de aprovação nem enviar mensagens reais pelo WhatsApp.
- Solicitações aprovadas e posteriormente arquivadas continuam preservadas; sua exposição segue as telas permitidas ao Financeiro e a regra de `generalApproval`.
