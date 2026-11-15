# Contatos, exclusão recuperável e reenvio de cotações

Pedido direto: liberar envio normal a qualquer contato escolhido, excluir contato/cotação já realizada para novos testes, avisar quando aquele pedido já foi enviado ao contato. Implementar no sistema existente; coordenador publica e ativa servidor/ponte após conferir a fila. Não disparar mensagens nem excluir dados reais durante desenvolvimento.

Decisões de implementação: exclusão lógica recuperável com `removed:{at,by,reason}`, versões e auditoria; histórico comercial, recibos e mensagens originais preservados. Não haverá apagamento no WhatsApp. Contato removido sai da agenda ativa, sugestões e seleção, sem reaparecer pela prévia/importação. Lixeira com restauração explícita. Recusar remoção de contato com cotação ativa pendente/em processamento/incerta; orientar remover/cancelar o rascunho primeiro. Cadastros históricos continuam resolvendo nomes.

Cotação aqui significa tarefa/mensagem no painel Agente WhatsApp, conforme contexto do botão de preparação. Propostas comerciais, pedidos e pagamentos não são excluídos. Remover tarefa concluída preserva seu estado/recibo; remover rascunho nunca enviado também o cancela. Running/uncertain e situações ambíguas não permitem remoção/reenvio. Restaurar histórico nunca libera envio.

Antes de preparar, mostrar data do último envio daquele pedido/telefone, inclusive se excluído da lista. Reenvio exige confirmação explícita com referência/versionamento do último envio, revalidada pelo servidor. Nova tentativa cria novo ID e recibo próprio; a anterior não é reaberta. UUID de preparação mantém repetição de rede idempotente. Guardas atômicos do pedido, contato, competência e todas as tarefas do mesmo destino impedem dois preparos concorrentes. Rascunho bloqueado e nunca tentado só pode ser colocado na fila por nova escolha explícita do usuário, com ambas liberações ativas.

Envio normal: servidor e ponte habilitados pelo coordenador, cofre com booleano estrito `enableSend`; launcher respeita esse campo, mantém teste local incapaz de enviar e não reaproveita grants temporários. Habilitar não reabre tarefas canceladas nem coloca rascunhos antigos na fila. As sete lojas já canceladas permanecem assim. Usuário opera os novos botões.

Abordagens consideradas: apagar linhas e perder recibos (descartada); reabrir tarefa concluída e perder idempotência/histórico (descartada); exclusão recuperável mais nova identidade e confirmação de reenvio (adotada como decisão de implementação para cumprir o pedido mantendo rastreabilidade).

Verificar permissões Master/ADM, referência/versão stale, origem, agenda/prévia/importação, remoção/restauração, reenvio confirmado/não confirmado, repetição de rede, concorrência, competência fechada, contatos alterados/removidos, recibos antigos preservados e ausência de transporte real nos testes.
