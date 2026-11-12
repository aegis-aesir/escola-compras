# Menu por etapas do processo orçamentário

## Intenção

Reorganizar a navegação lateral para representar o andamento real das solicitações. Para a equipe administrativa, cada pedido deve estar em uma única fila correspondente à etapa atual. Para o setor solicitante, o acompanhamento continua simples: todas as suas solicitações permanecem reunidas e apenas o status indica em qual etapa cada uma está.

## Objetivos

- Exibir no menu administrativo, nesta ordem: **Dashboard**, **Solicitação**, **Análise ADM**, **Estimativa**, **Aprovação Diretoria**, **Cotação**, **Execução** e **Resumo Mensal**.
- Fazer a solicitação sair da fila anterior e entrar na seguinte sempre que seu status avançar.
- Manter para o perfil Setor uma única tela **Minhas solicitações**, com todos os pedidos próprios e o status/etapa atual atualizado.
- Preservar as permissões, transições, aprovações, dados, históricos e integrações existentes.
- Manter o Dashboard apenas como visão geral, sem duplicá-lo como fila operacional.

## Não objetivos

- Não alterar a sequência de aprovação nem criar novos estados no banco.
- Não mudar quem pode iniciar estimativas, aprovar, cotar, executar ou consultar dados financeiros.
- Não enviar mensagens pelo WhatsApp e não modificar as chaves do OpenClaw.
- Não publicar automaticamente esta alteração na produção.

## Organização das etapas

### Administração e Master

| Menu | Registros exibidos |
| --- | --- |
| Dashboard | Indicadores e visão geral, sem ser uma fila |
| Solicitação | Complementações e consultas históricas que ainda pertencem ao cadastro da necessidade; arquivadas ficam em filtro próprio |
| Análise ADM | Pedidos enviados e aguardando a Diretoria Administrativa iniciar a estimativa (`pending`) |
| Estimativa | Pesquisa em andamento (`estimating`) e resultado concluído aguardando conferência e encaminhamento administrativo (`admin_review`) |
| Aprovação Diretoria | Pedidos aguardando decisão da Diretoria Geral (`general_review`) |
| Cotação | Cotação local ou busca nacional (`quoting`, `national`) |
| Execução | Proposta escolhida, pedido realizado e recebimento (`execution`, `approved`, `ordered`, `received`) |
| Resumo Mensal | Consolidação orçamentária, documentos fiscais, pagamentos e fechamento mensal |

Pedidos rejeitados ou adiados não permanecem em filas de andamento. Continuam consultáveis por filtros históricos, com todo o histórico preservado.

### Setor

- O menu mostra **Minhas solicitações**.
- A tela continua exibindo todos os pedidos do próprio usuário, inclusive depois que avançarem para análise, estimativa, aprovação, cotação ou execução.
- O status visível informa a etapa atual sem conceder acesso aos controles internos, estimativas, fornecedores, valores comerciais ou documentos restritos.
- Rascunhos, complementações e criação de nova solicitação continuam disponíveis conforme as regras atuais.

### Diretoria Geral

- O menu mostra **Aprovação Diretoria**.
- A fila contém somente solicitações em `general_review`, já encaminhadas pela Diretoria Administrativa após a estimativa.
- A decisão continua restrita à necessidade, sem aprovação de valor.

### Financeiro

- O menu segue as etapas autorizadas para acompanhamento: Dashboard quando permitido, Solicitação, Execução e Resumo Mensal.
- O perfil permanece somente para consulta e não recebe ações administrativas, comerciais ou de aprovação.

## Funções auxiliares

- **Fornecedores** e **Agente WhatsApp** deixam de ser etapas principais e passam a ser acessos contextuais dentro de **Cotação**.
- **Arquivadas** deixa de ser item principal e passa a ser um filtro/atalho dentro de **Solicitação**, exclusivo conforme as permissões atuais.
- **Configurações** permanece disponível ao Master por meio da área do usuário, sem ocupar uma etapa do processo.
- Essas mudanças são somente de navegação; telas, dados e permissões existentes serão reaproveitados.

## Comportamento e acessibilidade

- O item ativo do menu, título da página e cabeçalho devem usar os novos nomes.
- Contadores devem representar apenas a fila exclusiva daquela etapa.
- Mudanças de etapa devem aparecer após o mesmo recarregamento de dados já usado pelo painel.
- Menu compacto, expandido e móvel continuam funcionando, com rótulos acessíveis e a preferência atual preservada.
- O tema e o botão **Aparência** permanecem inalterados.

## Abordagens consideradas

1. **Navegação adaptada ao perfil — escolhida.** A administração trabalha com filas exclusivas por etapa; o setor acompanha todos os próprios pedidos em uma única tela. É mais simples para quem solicita e mais operacional para quem compra.
2. **Mesmo menu para todos.** Daria ao setor várias telas somente de leitura, mas aumentaria a complexidade e exporia uma estrutura administrativa desnecessária.
3. **Manter as telas atuais e apenas renomear itens.** Seria uma alteração menor, porém continuaria misturando Análise ADM e Aprovação Diretoria e manteria pedidos duplicados entre filas.

## Critérios de aceitação

- Os oito itens aparecem na ordem definida para Master/Diretoria Administrativa, respeitando as permissões de cada perfil.
- Um pedido ativo aparece em apenas uma fila operacional administrativa.
- `pending` aparece em Análise ADM; `estimating` e `admin_review` em Estimativa; `general_review` em Aprovação Diretoria; `quoting` e `national` em Cotação; os estados de compra e recebimento em Execução.
- O setor continua vendo todos os próprios pedidos e o status atualizado.
- A Diretoria Geral continua vendo somente sua fila.
- O Financeiro continua sem permissão de gravação.
- Funções auxiliares continuam acessíveis sem voltar a ocupar o menu principal.
- Testes de navegação, visibilidade por perfil, fluxo, TypeScript e build passam sem mensagens reais a fornecedores.
