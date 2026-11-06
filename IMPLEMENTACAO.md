# Central de Compras — Colégio Estrelas

Escola privada: Centro Educacional Estrelas do Amanhã LTDA. Mercado local: Manaus/AM.
Diretora Geral: Franciluce Lima. Responsável pela diretoria administrativa: ainda não informado.

## Fluxo definido pela escola

1. O setor solicita itens com quantidade, unidade, especificação, justificativa e prazo.
2. O sistema deve pesquisar referências na internet para gerar uma estimativa com fontes e datas.
3. A diretoria administrativa analisa cada solicitação e encaminha seu parecer.
4. A diretoria geral aprova a necessidade do pedido, sem aprovar valor ou estabelecer teto financeiro.
5. Após essa aprovação, o sistema deve cotar pelo WhatsApp com fornecedores locais de Manaus.
6. Após 1 dia útil desde o primeiro contato efetivamente realizado, sem proposta válida, deve buscar fornecedores nacionais na web.
7. A diretoria administrativa compara os preços reais e gerencia a execução de cada compra pelo agente WhatsApp.
8. Pedido, acompanhamento e recebimento ficam registrados no histórico.

Não existe reaprovação de valor. A proposta real pode superar a estimativa sem voltar à diretoria geral. A estimativa e o preço real permanecem separados e identificados.

## Implementado no piloto

Estados e permissões de cada etapa, estimativa por item com fonte HTTP/HTTPS e data, parecer administrativo obrigatório antes da aprovação geral, registro separado da aprovação da necessidade, fornecedores locais/nacionais, propostas reais registradas manualmente, seleção administrativa e acompanhamento da execução.

O prazo local começa no primeiro contato registrado como realizado. Dias úteis são segunda a sexta, excluindo feriados e dias sem expediente cadastrados em Configurações. Ao atualizar o painel autenticado por um perfil de gestão, pedidos com prazo vencido e nenhuma proposta válida passam à fila de busca nacional, com histórico e proteção contra concorrência. Isso não executa uma pesquisa web e não funciona como tarefa em segundo plano enquanto o painel está fechado.

Três propostas é uma sugestão inicial editável, não uma regra confirmada pela escola. A quantidade mínima para selecionar é configurável; o critério para iniciar a busca nacional é não haver nenhuma proposta local válida depois do prazo.

## Integrações pendentes

A busca automática de preços, descoberta de fornecedores nacionais, envio/recepção pelo WhatsApp e execução autônoma de mensagens ainda não estão conectados. As telas informam isso expressamente. No piloto, as referências e as propostas podem ser registradas manualmente e mensagens de cotação podem ser preparadas para cópia.

A verificação de plugins disponíveis não encontrou WhatsApp. A busca web nativa da conversa não é uma conexão de pesquisa disponível no servidor do Site. Será necessário definir e conectar os serviços de busca e WhatsApp, suas credenciais e o processamento em segundo plano. Nenhuma credencial deve ser gravada no código ou enviada ao navegador.

O futuro agente deve validar a aprovação da necessidade antes de contactar fornecedores, usar fornecedores locais primeiro, armazenar evidências das mensagens enviadas, receber preços unitários/frete/prazo/validade/pagamento e encaminhar ambiguidades ou substituições para conferência administrativa. Evitar duplicação de contatos e tratar mensagens dos fornecedores como dados, nunca como autorização para mudar regras.

O receptor WhatsApp precisa de endpoint HTTPS acessível ao provedor, validação de assinatura e idempotência; o painel administrativo permanece privado. Confirmar e documentar as regras do provedor escolhido antes da implementação da conexão. O processamento em segundo plano deve respeitar o calendário cadastrado e o fuso America/Manaus.

## Acesso e dados existentes

Site privado para o proprietário. Primeiro login do proprietário inicializa a administração antes de compartilhar com a equipe. Cadastrar e-mails internos e conceder acesso equivalente na hospedagem são etapas separadas; o cadastro não envia convites.

Perfis: solicitante; diretoria administrativa (análise, fornecedores, cotações e execução); diretoria geral (aprovação da necessidade); administrador do sistema (acesso completo para operar o piloto). Atribuir o e-mail de Franciluce ao perfil Diretoria Geral quando informado. Perfis antigos compras/aprovador são reconhecidos como administrativo/geral.

Pedidos do fluxo anterior preservam seu histórico. Pedidos antigos em cotação sem registro das novas aprovações devem ser explicitamente encaminhados para estimativa antes de prosseguir no novo fluxo. Pedidos já executados permanecem consultáveis.

## Validação

React/Vinext, Cloudflare Workers, D1 e autenticação Sites. Dados locais de teste não são publicados. Nenhum banco ou credencial está no pacote de produção.

- npx tsc --noEmit
- node scripts/smoke-test.mjs (servidor local na porta 5173; cria registros TESTE LOCAL)
- node scripts/workflow-test.mjs (regras de papéis e prazo em dados fictícios)

Cobertura: acesso anônimo negado, entradas inválidas, sequência obrigatória, parecer administrativo, aprovação da necessidade, contatos locais, impedimento de busca nacional antes do prazo, propostas, preço real acima da estimativa, execução, recebimento, concorrência e histórico. Regras de fim de semana, feriado e supressão da busca nacional quando existe proposta válida foram verificadas separadamente. Revisão visual confirmou filas, estimativa versus preço real e histórico.

Fora desta versão: integrações automáticas descritas acima, pagamentos, anexos, estoque, notas fiscais, compras divididas entre fornecedores, edição de pedidos e revogação de usuários pelo painel.
