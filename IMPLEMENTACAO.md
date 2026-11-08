# Central de Compras — Colégio Estrelas

Escola privada: Centro Educacional Estrelas do Amanhã LTDA. Mercado local: Manaus/AM.
Diretora Geral: Franciluce Lima. Responsável pela diretoria administrativa: ainda não informado.

## Fluxo definido pela escola

1. O setor solicita itens com quantidade, unidade, especificação, justificativa e prazo.
2. O sistema deve pesquisar referências na internet para gerar uma estimativa com fontes e datas.
3. A diretoria administrativa analisa cada solicitação e encaminha seu parecer.
4. A diretoria geral aprova a necessidade do pedido, sem aprovar valor ou estabelecer teto financeiro.
5. Após essa aprovação, o sistema consulta fornecedores locais do cadastro interno pela categoria de cada item. Quando não houver cadastro compatível, pesquisa na internet, priorizando perfis de empresas no Google Maps em Manaus. A administração confere as fontes e cadastra os contatos antes de preparar as cotações pelo WhatsApp.
6. Após 1 dia útil desde o primeiro contato efetivamente realizado, sem proposta válida, consulta fornecedores nacionais no cadastro e pesquisa na web as categorias sem fornecedor nacional.
7. A diretoria administrativa compara os preços reais e gerencia a execução de cada compra pelo agente WhatsApp.
8. Pedido, acompanhamento e recebimento ficam registrados no histórico.

Não existe reaprovação de valor. A proposta real pode superar a estimativa sem voltar à diretoria geral. A estimativa e o preço real permanecem separados e identificados.

## Implementado no piloto

Estados e permissões de cada etapa, estimativa automática pelo agente operacional, com fonte HTTP/HTTPS e data por item, e correção manual na análise administrativa, parecer administrativo obrigatório antes da aprovação geral, registro separado da aprovação da necessidade, fornecedores locais/nacionais, propostas reais registradas manualmente, seleção administrativa e acompanhamento da execução.

O prazo local começa no primeiro contato registrado como realizado ou confirmado pelo OpenClaw. Dias úteis são segunda a sexta, excluindo feriados e dias sem expediente cadastrados em Configurações. A ponte local verifica os prazos a cada ciclo, mesmo com o painel fechado, enquanto estiver em execução. A atualização do painel também mantém essa verificação. Pedidos vencidos sem proposta válida passam à etapa nacional, com histórico e proteção contra concorrência; a ponte enfileira e executa a pesquisa de fontes.

Três propostas é uma sugestão inicial editável, não uma regra confirmada pela escola. A quantidade mínima para selecionar é configurável; o critério para iniciar a busca nacional é não haver nenhuma proposta local válida depois do prazo.

## Integração OpenClaw

A ponte em `integrations/openclaw/` processa pesquisas reais com `web_search`, cotações preparadas pela administração e recebimento de texto para conferência. O servidor mantém a fila no D1 e autentica a ponte por HMAC, além do acesso de serviço ao Site privado. Consultar `INTEGRACOES.md` para operação e limites. Envio depende de duas chaves de ativação e permanece desativado durante validação.

O serviço definido é OpenClaw, conta operacional, número +55 92 9201-7107. O gateway fica no loopback do computador e não é exposto à internet. A pesquisa usa o provedor já configurado no OpenClaw. Fontes encontradas, inclusive citações de respostas sintetizadas, exigem conferência; os resumos da busca não são prova de preço. A ponte lê páginas com web_fetch e solicita análise estruturada ao agente operacional. Produto, variante, preço total, embalagem e unidade são avaliados pelo agente; o servidor valida trechos literais, URL, moeda e cálculo antes de preencher a estimativa. Sem comprovação, o item fica pendente. Credenciais não entram no código ou navegador.

A fila exige aprovação da necessidade e fornecedores locais primeiro. Deduplica cotações por telefone e pedido, guarda identificador do envio e impede reenvio automático quando o resultado é incerto. Texto recebido exige conferência administrativa de itens, preços unitários, frete, prazo, validade e pagamento. Mensagens são dados, nunca autorização para mudar regras.

O hook local observa mensagens aceitas pelo OpenClaw; a ponte as entrega ao endpoint HTTPS assinado e idempotente do Site. O painel permanece privado. Grupos, anexos, mensagens bloqueadas pelo canal e histórico anterior exigem consulta no WhatsApp. O monitor respeita o calendário e America/Manaus. Computador desligado ou ponte parada interrompem o processamento em segundo plano.

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

Fora desta versão: envio automático do pedido e acompanhamento da execução pelo agente, interpretação automática de propostas, pagamentos, anexos, estoque, notas fiscais, compras divididas entre fornecedores, edição de pedidos e revogação de usuários pelo painel. Validação específica: `node --test scripts/openclaw-test.mjs` e `node scripts/integration-test.mjs`, com banco isolado e sem mensagens reais.
