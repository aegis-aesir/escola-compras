# Envio normal, aviso de reenvio e exclusão recuperável — 15/11/2026

Autorizações diretas do usuário: liberar envio para qualquer contato escolhido; implementar excluir contato/cotação já realizada para novos testes; avisar quando aquele pedido já foi enviado ao contato. O envio normal substitui a necessidade operacional do grant por tarefa. Isso não autoriza disparar para a agenda inteira, reabrir tarefas antigas nem apagar recibos.

## Comportamento entregue

- Agenda: Excluir e Lixeira, com motivo, confirmação por nome/telefone, versão e auditoria. Restaurar é explícito e não envia mensagens. Contato removido não aparece nas escolhas, sugestões ou prévia WhatsApp; importação e sincronização preservam o tombstone e não o recriam. Nomes continuam disponíveis para históricos. Telefones legados usam a normalização existente, sem inventar nono dígito.
- Agente WhatsApp: Excluir cotação da lista e Lixeira de cotações. Mensagem e recibo concluídos ficam intactos. Remover um rascunho nunca tentado também o cancela; restaurar mantém esse estado, sem enfileirar. Running/uncertain e estados ambíguos não permitem exclusão/reenvio. Propostas comerciais, solicitação e pagamentos não são excluídos.
- Seleção: histórico de envios por pedido/telefone, com data e contato, inclusive registros excluídos. Uma caixa obrigatória confirma o reenvio. Mudança da seleção limpa a confirmação. Servidor exige referência/versão do recibo atual; confirmação antiga ou ausente retorna409. Nova tentativa recebe outro ID e recibo, sem reabrir o envio anterior.
- `preparationId` UUID reaproveitado nas repetições de rede evita duplicação. Inserção e liberação de rascunho guardam atomicamente pedido, contato, competência e o conjunto de tarefas do destino. Rotas legada/nova compartilham o writer; o legado mantém compatibilidade estrita. `retry_integration` não libera WhatsApp: o usuário deve usar a seleção e o aviso de reenvio. Pesquisas mantêm a repetição existente.

Excluir contato com tarefa pendente/em processamento/incerta é recusado. Primeiro cancele ou exclua o rascunho no painel e confira estados incertos. Contato e recibos históricos nunca são apagados fisicamente. Nenhuma ação da Lixeira apaga mensagem no WhatsApp.

## Publicação e ativação pelo coordenador

1. Revisar e integrar `codex/compras`, publicar no Site existente. Sem migração ou dependência nova; campos aditivos em records.data.
2. Conferir no estado atual todos os WhatsApp queued/blocked/running/uncertain e os destinatários/autorizações. Não converter backlog em queued. Preservar as sete lojas já canceladas, o teste concluído e o outro bloqueado. A ativação geral não reabre esses registros.
3. Atualizar a instalação da ponte, especialmente start-windows.ps1. Preservar cofre, tokens, conta operacional, modelos, estado/journal e inbox. Não usar a worktree ou outro runner de produção.
4. Por autorização do usuário nesta entrega, definir no cofre existente **enableSend: true como booleano**. Strings e campo ausente mantêm false. Launcher exporta ESTRELAS_ENABLE_SEND conforme esse booleano. Definir WHATSAPP_SEND_ENABLED=true no servidor e aplicar a variável na versão publicada. Grants temporários WHATSAPP_TEST_SEND_GRANT/testSendGrant devem continuar ausentes.
5. Reiniciar somente a tarefa existente e confirmar um launcher/runner, heartbeat e ambas liberações. Local/teste continua impedido de enviar. Não fazer disparo de validação real ou exclusão de registros reais nesta publicação: o usuário operará os botões.

Se houver tarefas queued sem autorização atual, não ativar até isolá-las conforme escopo concreto, sem excluir dados por conta própria. Bloqueadas não são automaticamente liberadas: uma nova escolha explícita na preparação pode colocá-las na fila se nunca tentadas e seguras. Canceladas sem envio precisam sair para a Lixeira antes de novo preparo.

## Validação e revisão

PASS: quotation-repeat-test (consentimento, novo ID, nonce repetido, nonces concorrentes, recibo/fechamento/contato alterados entre leitura e batch, ambiguidade, empate de horários e corrida legado/manual); quotation-removal-test; contact-removal-test/ui-test; persistent-send-config-test executa apenas expressão de configuração com credenciais fictícias; integration-test; quotation-suppliers/contacts/contact-selection; scoped-test-send-test; cancel-quotation-jobs; agenda/sync; Financeiro e workflow. HTTP5185: contact-removal e quotation-removal, com autenticação, perfis, origem, motivos/versões, restauração, novo preparo e envio desativado.

Os testes HTTP compartilham o banco local e devem rodar em sequência. Uma execução paralela causou interferência entre fixtures e falhou na comparação da fila; repetição sequencial passou sem alterar a asserção. Um403 de origem retornado pelo framework em texto é aceito como tal no harness HTTP, mantendo a conferência do status403.

Navegador local: aviso mostra contato/data/pedido; submit sem consentimento não chama preparo; consentimento produz UUID/ref versionada; mudança de seleção limpa confirmação. Contato fictício foi excluído/restaurado; tarefa fictícia foi excluída/restaurada com estado cancelado e envio off. Evidência privada ignorada: outputs/quotation-repeat-confirmation-ui.jpg; fixture outputs/quotation-resend-ui.html bloqueia APIs reais. Arquivo temporário de public removido antes do pacote final.

Quatro problemas reproduzidos pela revisão independente foram corrigidos e viraram regressão: histórico failed tentado, recibo alterado na promoção blocked, dupla fila entre legado/manual e bypass por retry_integration. Rechecagem independente sem P1/P2 restantes. Tipos/build passaram; lint dos arquivos novos e UI nova passou. Arquivos compartilhados conservam problemas antigos de lint, sem declarar lint geral aprovado.

Implementação/testes não alteraram flags, cofre, ponte, hospedagem ou registros de produção. Ativação real e versão publicada devem ser confirmadas pelo coordenador após a entrega.
