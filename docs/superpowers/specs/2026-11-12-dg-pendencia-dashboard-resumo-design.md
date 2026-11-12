# Pendência, Dashboard e Resumo da Diretoria Geral

## Intenção

Facilitar a decisão da Diretoria Geral: a devolução para apuração administrativa deve ser uma opção da própria decisão, e o perfil deve acompanhar o processo pelo Dashboard e pelo Resumo Mensal.

## Regras

- A opção `Devolver para apuração administrativa` integra o seletor da decisão da necessidade.
- Ao escolhê-la, a Diretoria Geral informa obrigatoriamente a pendência; o pedido volta para `admin_review`, preservando parecer, pendência e histórico.
- Não haverá um colapsável separado apenas para essa devolução.
- O perfil `geral` terá no menu, nesta ordem: Dashboard, Aprovação Diretoria e Resumo Mensal.
- Dashboard e Resumo Mensal são somente consulta para a Diretoria Geral. Cotação, compra, execução, documentos fiscais e fechamento continuam sem ações de edição nesse perfil.
- O Resumo Mensal deve usar os registros necessários para apresentar a posição do processo sem conceder permissão para alterá-los.

## Abordagem

Aproveitar a transição `return_to_admin` já protegida e auditada, mudando somente sua apresentação e despacho no formulário de decisão. Ampliar as visualizações permitidas e a leitura de dados de acompanhamento do perfil `geral`, mantendo as proteções de escrita existentes no servidor e nos componentes.

Alternativas descartadas: manter um painel separado, porque contraria a interface solicitada; criar uma segunda tela de devolução, porque duplicaria a decisão e o histórico; liberar as telas administrativas completas, porque ampliaria permissões além do acompanhamento solicitado.

