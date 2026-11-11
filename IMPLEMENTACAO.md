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

Estados e permissões de cada etapa, estimativa automática pelo agente coordinator, com fonte HTTP/HTTPS e data por item, e correção manual na análise administrativa, parecer administrativo obrigatório antes da aprovação geral, registro separado da aprovação da necessidade, fornecedores locais/nacionais, propostas reais registradas manualmente, seleção administrativa e acompanhamento da execução.

O prazo local começa no primeiro contato registrado como realizado ou confirmado pelo OpenClaw. Dias úteis são segunda a sexta, excluindo feriados e dias sem expediente cadastrados em Configurações. A ponte local verifica os prazos a cada ciclo, mesmo com o painel fechado, enquanto estiver em execução. A atualização do painel também mantém essa verificação. Pedidos vencidos sem proposta válida passam à etapa nacional, com histórico e proteção contra concorrência; a ponte enfileira e executa a pesquisa de fontes.

Três propostas é uma sugestão inicial editável, não uma regra confirmada pela escola. A quantidade mínima para selecionar é configurável; o critério para iniciar a busca nacional é não haver nenhuma proposta local válida depois do prazo.

## Integração OpenClaw

A ponte em `integrations/openclaw/` processa pesquisas reais com `web_search`, cotações preparadas pela administração e recebimento de texto para conferência. O servidor mantém a fila no D1 e autentica a ponte por HMAC, além do acesso de serviço ao Site privado. Consultar `INTEGRACOES.md` para operação e limites. Envio depende de duas chaves de ativação e permanece desativado durante validação.

O serviço definido é OpenClaw, conta operacional, número +55 92 9201-7107. O gateway fica no loopback do computador e não é exposto à internet. A pesquisa usa o provedor já configurado no OpenClaw. Fontes encontradas, inclusive citações de respostas sintetizadas, exigem conferência; os resumos da busca não são prova de preço. A ponte lê páginas com web_fetch e solicita análise estruturada ao agente coordinator. Produto, variante, preço total, embalagem e unidade são avaliados pelo agente; o servidor valida trechos literais, URL, moeda e cálculo antes de preencher a estimativa. Sem comprovação, o item fica pendente. Credenciais não entram no código ou navegador.

A fila exige aprovação da necessidade e fornecedores locais primeiro. Deduplica cotações por telefone e pedido, guarda identificador do envio e impede reenvio automático quando o resultado é incerto. Texto recebido exige conferência administrativa de itens, preços unitários, frete, prazo, validade e pagamento. Mensagens são dados, nunca autorização para mudar regras.

Roteamento: ferramentas de pesquisa e navegador usam sessão explícita do `coordinator`, separada por pedido; a análise estruturada usa o mesmo agente em sessão isolada por tarefa. WhatsApp permanece com `operacional` na conta homônima, com o número exato já confirmado. A conta pessoal `default` está desativada/despareada e não é fallback. Modelos, credenciais e regras de aprovação não foram alterados. Anexos recebidos ficam no atendimento operacional do WhatsApp; a ponte atual importa apenas texto para o painel. Teste sem mensagens reais: `node --test scripts/agent-routing-test.mjs`.

O hook local observa mensagens aceitas pelo OpenClaw; a ponte as entrega ao endpoint HTTPS assinado e idempotente do Site. O painel permanece privado. Grupos, anexos, mensagens bloqueadas pelo canal e histórico anterior exigem consulta no WhatsApp. O monitor respeita o calendário e America/Manaus. Computador desligado ou ponte parada interrompem o processamento em segundo plano.

## Acesso e dados existentes

Login próprio por usuário e senha, sem conta ChatGPT para os usuários da escola. A hospedagem existente é preservada; a entrada é pública e os dados ficam protegidos por sessão local no servidor. O cabeçalho de identidade ChatGPT não concede acesso.

Perfis locais: Master (código admin, acesso completo e gestão de usuários); Setor (formulário e consulta dos próprios registros, sem estimativas internas, propostas ou fornecedores); Diretoria Geral (fila de pedidos para aprovar/recusar a necessidade); Diretoria Administrativa (análise, fornecedores, cotações e execução). A diretoria geral não cria solicitações. Usuários antigos por e-mail permanecem nos registros históricos e não autenticam automaticamente.

Pedidos do fluxo anterior preservam seu histórico. Pedidos antigos em cotação sem registro das novas aprovações devem ser explicitamente encaminhados para estimativa antes de prosseguir no novo fluxo. Pedidos já executados permanecem consultáveis.

## Validação

Aparência: o botão **Aparência** no cabeçalho está disponível para todos os perfis. Oferece tema claro, escuro ou automático (acompanha o dispositivo) e destaques em violeta, azul, verde, rosa e laranja. A escolha é pessoal, salva neste navegador e sincronizada entre abas; não altera configurações da escola nem registros de compras.

React/Vinext, Cloudflare Workers, D1, autenticação local e hospedagem Sites. Dados locais de teste não são publicados. Nenhum banco ou credencial está no pacote de produção.

- npx tsc --noEmit
- node scripts/smoke-test.mjs (servidor local na porta 5173; cria registros TESTE LOCAL)
- node scripts/workflow-test.mjs (regras de papéis e prazo em dados fictícios)

Cobertura: acesso anônimo negado, entradas inválidas, sequência obrigatória, parecer administrativo, aprovação da necessidade, contatos locais, impedimento de busca nacional antes do prazo, propostas, preço real acima da estimativa, execução, recebimento, concorrência e histórico. Regras de fim de semana, feriado e supressão da busca nacional quando existe proposta válida foram verificadas separadamente. Revisão visual confirmou filas, estimativa versus preço real e histórico.

Fora desta versão: envio automático do pedido e acompanhamento da execução pelo agente, interpretação automática de propostas, execução de pagamentos bancários, estoque e compras divididas entre fornecedores. Anexos, registro documental de pagamentos/notas e complementação de pedidos devolvidos estão implementados; não executam transferências financeiras. Usuários locais podem ser desativados, excluídos e ter suas senhas redefinidas por um Master. A exclusão encerra sessões, oculta a conta e preserva identidade, pedidos e auditoria; o login fica reservado. O próprio acesso e o último Master são protegidos. A troca de senha é opcional no primeiro acesso e após redefinição, inclusive para contas antigas, sem alterar credenciais existentes. Validação específica: `node --test scripts/openclaw-test.mjs` e `node scripts/integration-test.mjs`, com banco isolado e sem mensagens reais.

## Formulários e controles anteriores

Compatibilidade com os nove arquivos de referência: três formulários estruturados, referências preliminares separadas, declaração autenticada, correções com histórico, conferência/parecer/financeiro, decisões de escopo, comparativo de propostas, execução, matriz fiscal e fechamento mensal. Consultar `FORMULARIOS-E-CONTROLES.md`. Os dois pedidos preenchidos na planilha antiga não foram importados automaticamente. Registros legados não recebem campos ou declarações inventadas.

Simplificação de 10/11/2026: novos formulários usam classificação única em vez de origem/natureza/previsão e retiram códigos, contato, centro de custo, vínculo e declarações de disponibilidade/ausência de referências. Referências e anexos são opcionais. Competência calculada pelo servidor no mês do primeiro envio em America/Manaus, preservada nas complementações. Formulários anteriores mantêm sua leitura original e histórico. Testes adicionais: `budget-simplification-test` e, com servidor local, `budget-simplification-http-test`.
