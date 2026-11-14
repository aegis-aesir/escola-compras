# Todos os contatos na preparação da cotação

Pedido direto do usuário em 14/11/2026: mostrar todos os contatos nessa janela e permitir seleção manual, deixando pré-selecionados os considerados relevantes. Esta regra substitui a restrição anterior da janela a fornecedores classificados/compatíveis; a compatibilidade passa a sugerir destinatários, sem impedir a escolha administrativa explícita dos demais.

Uma lista pesquisável e paginada reúne fornecedores, contatos gerais/sem classificação e contatos da última prévia WhatsApp concluída, deduplicados por telefone. Os fornecedores compatíveis pelas regras atuais ficam sugeridos e inicialmente selecionados (até 100); os demais ficam disponíveis e desmarcados. Busca/filtros/paginação não apagam escolhas. Limpar seleção não é revertido por atualização automática. Telefones inválidos e o número da própria escola aparecem indisponíveis para envio.

Preparar é uma confirmação explícita dos destinatários escolhidos, inclusive os não sugeridos. A API revalida referências, versão/telefone, pedido aprovado, etapa, arquivamento e competência aberta. Não aceita telefone arbitrário. Contatos escolhidos da prévia são salvos como sem classificação, sem promover pessoas a fornecedores ou alterar categorias/abrangências. Tarefas guardam a escolha manual/autoria/data e destinatário estável. A elegibilidade para esse contato explícito dispensa compatibilidade comercial, preservando os outros bloqueios. Edição de telefone não redireciona tarefa e é recusada durante envio running/uncertain.

As rotas legadas de fornecedores conservam validação estrita. Respostas de contatos gerais continuam sujeitas à conferência humana, com vínculo de contato separado de fornecedor; cadastro de proposta não é automaticamente criado. Nenhuma compra, equivalência, prazo local ou abrangência é inferida de contato sem classificação.

Alternativa descartada: converter todos os contatos em fornecedores, pois alteraria o cadastro e suas recomendações. A abordagem escolhida acompanha o pedido do usuário: agenda ampla, sugestão automática e escolha administrativa por cotação. Sem novo provedor, dependência, migração, importação em massa ou conexão WhatsApp.

Testes somente locais na porta 5185, com bancos/transportes fictícios. Preservar as sete tarefas reais e ambas as chaves de envio desativadas. Entrega na branch codex/compras ao coordenador, responsável por revisar/integrar/publicar e atualizar a ponte se necessário.
