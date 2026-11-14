# Importação de respostas WhatsApp — plano de correção

> Execução nesta sessão, na worktree Compras. Escopo: corrigir a importação e validar com o contato de teste autorizado, mantendo sete cotações reais bloqueadas.

**Objetivo:** comprovar mensagem enviada → resposta recebida → hook → ponte → mensagem disponível para conferência no CEEA Manager.

**Diagnóstico:** o plugin WhatsApp instalado exige `channels.whatsapp.accounts.operacional.pluginHooks.messageReceived=true`. Sem a opção, não emite o evento observado por `estrelas-compras`. O hook estava instalado/habilitado; a pasta de entrada permanecia vazia. Conferido no código instalado `shouldEmitWhatsAppMessageReceivedHooks` e na configuração privada, sem divulgar segredos.

**Decisão:** correção de configuração/documentação; não alterar lógica da aplicação, normalização do hook, permissões nem criar propostas automaticamente. Não é necessária uma nova versão do Site para ativar o evento.

## Restrições e verificações

- Somente conta `operacional`, número escolar +55 92 9201-7107. Não ativar o evento globalmente nem na conta pessoal; não alterar modelos, credenciais ou políticas de recebimento.
- Preservar `WHATSAPP_SEND_ENABLED=false` e `ESTRELAS_ENABLE_SEND=false`; não liberar, cancelar ou reenfileirar as sete tarefas reais.
- Teste externo restrito ao número confirmado pelo usuário, com marcador próprio e valores fictícios. Não guardar o telefone pessoal ou o conteúdo real no Git.
- Não iniciar/reiniciar ponte de produção nesta worktree, não integrar main, não publicar.
- Captura futura não implica retroimportação. Mensagem sem fornecedor/protocolo identificáveis fica para conferência; não associar o teste a uma solicitação real.

## Etapas

- [x] Confirmar falha: resposta presente no WhatsApp/log de entrada, ausente na pasta da ponte; opção do plugin ausente.
- [x] Aplicar somente a opção da conta operacional pelo CLI oficial; o CLI informa aplicação sem reiniciar o gateway.
- [x] Validar um novo retorno de teste: arquivo privado com identificador nativo e processamento pela ponte existente (`.json.done`); coordenador confirmou o registro `review` no banco de produção, sem pedido/fornecedor. Leitura direta substituiu a dependência de login; sem inspeção visual do painel.
- [x] Conferir que as sete tarefas continuam com envio desativado, além das duas chaves de envio: coordenador confirmou sete bloqueadas, zero tentativas, nenhum envio confirmado e chave do servidor `false`; launcher da ponte preserva `false`.
- [x] Executar suítes existentes do hook/runner e de integração D1 local; documentar evidências e limitações.
- [x] Atualizar INTEGRACOES.md e entrega; commitar/enviar somente codex/compras e avisar o coordenador com SHA.

**Cobertura de riscos:** eventos de outra conta, grupos/LIDs não resolvidos e datas inválidas continuam rejeitados; duplicatas não criam propostas; envio desativado não chama o gateway; falhas de importação preservam registros privados para revisão.
