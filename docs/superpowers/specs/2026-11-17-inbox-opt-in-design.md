# WhatsApp selecionado e propostas preliminares

Escopo autorizado para execução imediata, sem perguntas adicionais. Mantém o aplicativo, dados existentes, número +559292017107 e conta operacional; default continua desativada. Pesquisa usa pesquisa-web. Nenhum serviço real é iniciado.

Decisão: seleção explícita de um JSON por mensagem, pela CLI local do operador, produz protocolo `selected-message-v1`, ator, data e motivo. O hook automático deixa de capturar conteúdo. O runner ignora backlog sem protocolo; o endpoint também recusa clientes antigos. Não há permissão por contato nem marcador controlável pelo fornecedor. Seleção de anexos é explícita e individual; documentos permanecem privados. Conteúdo original é dado, nunca instrução de execução.

Vínculo: cruzar telefone do fornecedor com código do pedido, receipt respondido/correlação de envio ou único envio confirmado inequívoco anterior à resposta. Evidências conflitantes ou múltiplas opções deixam vínculo pendente. Sugestão explícita do operador fica identificada e exige conferência administrativa.

Proposta preliminar vive na inbox, separada das quotes reais. Extração determinística aceita apenas campos expressos, valores ausentes ficam vazios. Itens/preços/quantidades/frete/total/pagamento/prazo/validade são editáveis. Master/ADM confirma usando quoteSchema e transition quote existentes. Transação condicionada às versões de pedido, mensagem e fornecedor impede duplicação; atualizações do mesmo fornecedor guardam histórico.

Interface: caixa compacta agrupada por pedido/fornecedor, pendências por padrão, busca/filtros e histórico legado separado. Originais e painel técnico abrem sob demanda. Sem migrações, dependências ou mudanças de flags de envio.

Alternativas consideradas: captura geral filtrada na interface viola minimização; seleção por telefone autoriza mensagens futuras sem pedido do usuário; marcador em mensagem permite ao remetente conceder consentimento. CLI por mensagem é a escolha técnica nesta execução.
