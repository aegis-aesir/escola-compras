# Envio único de teste e cancelamento explícito — 14/11/2026

Branch `codex/compras`, base `80abea9`. O coordenador integra, publica no Site existente e atualiza a ponte instalada. Esta worktree só executou testes fictícios, sem envio ou alteração de produção. Sem migração ou dependência nova.

O usuário autorizou um envio somente ao número de teste confirmado. O coordenador comunicou depois autorização para cancelar sete lojas e um teste; após identificar conflito entre chats, obteve a orientação direta mais recente: **cancelar somente as sete lojas e manter os dois testes**, pois o usuário não sabe qual número funcionará. Essa regra substitui cancelar oito. Preservar ambos não autoriza dois envios. A tarefa/destino de qualquer envio único deve ser confirmada operacionalmente antes de configurar o grant. IDs, números e configuração concreta ficam apenas na comunicação privada, fora do Git.

## Cancelar somente as sete lojas antes do teste

Em Agente WhatsApp, Master/ADM podem marcar tarefas específicas, informar motivo e cancelar o lote. A API `/api/data` recebe `{action:'cancel_quotation_jobs',jobs:[{id,version}],reason}`; não existe operação “cancelar todas”. Nenhum item começa marcado. Na operação atual, selecionar somente as sete lojas e preservar ambos os testes.

O servidor lê os registros completos e recusa qualquer tarefa ausente, versão divergente, tentativa anterior, recibo, envio, lease, autorização de teste já consumida, estado running/uncertain/done/review/cancelled, pedido arquivado ou competência fechada. Somente blocked/queued/failed com attempts=0 e nenhum indício de envio são aceitos. Verificações de versão de todas as tarefas/pedidos e competência aberta ocorrem novamente no UPDATE atômico. Qualquer conflito altera zero tarefas e gera zero auditorias.

Cancelamento lógico muda somente estado, data, versão e metadados `cancellation`; mensagem, contato, pedido e histórico ficam preservados. Auditoria por tarefa, mesma transação. Não permite retry automático nem restaura envios. Confirmar sete canceladas e dois testes ainda blocked/attempts0 antes de qualquer autorização abaixo.
## Configuração temporária pareada

Manter **WHATSAPP_SEND_ENABLED=false** no servidor e **ESTRELAS_ENABLE_SEND=false** na ponte. Não usar liberação global nem envio CLI paralelo.

Configurar no servidor `WHATSAPP_TEST_SEND_GRANT` como JSON. No cofre DPAPI já existente, acrescentar propriedade `testSendGrant` com o mesmo objeto. O launcher exporta essa propriedade como `ESTRELAS_TEST_SEND_GRANT`. Preservar todos os demais campos do cofre, tokens, contas e modelos. Não imprimir o cofre, segredo ou objeto concreto em logs/documentos compartilhados.

Campos exatos do objeto:

| Campo | Valor operacional |
| --- | --- |
| jobId | ID completo da única tarefa whatsapp_quote confirmada |
| version | Versão atual antes do claim, inteiro positivo |
| target | Número confirmado exatamente como armazenado, com +DDI; sem inferir nono dígito |
| issuedAt | Horário UTC atual em ISO; não pode ser futuro |
| expiresAt | UTC ISO posterior, no máximo 15 minutos após issuedAt |

Os cinco valores devem coincidir nas duas pontas. Campo ausente, JSON inválido, divergência ou prazo vencido mantém o envio bloqueado. A presença de configuração restrita desativa o caminho global na ponte e faz o servidor recusar qualquer outra tarefa WhatsApp, mesmo se uma chave global estiver indevidamente true. O modo local nunca recebe autorização de envio.

Atualizar ponte **antes de configurar a autorização**, incluindo o novo `integrations/openclaw/test-send-grant.mjs`, client, runner e launcher. Reinício e operação somente pelo coordenador, preservando mutex, estado/journal e inbox existentes. Não iniciar segunda ponte na worktree.

## Retirada, envio e retorno

O claim aceita somente o ID/versão/destino exatos, blocked/queued, attempts0, sem recibo/lease/testSend. Mantém aprovação, etapa, telefone atual do contato, versões do pedido/contato, arquivamento e fechamento mensal. Um único CAS muda a tarefa para running, incrementa attempts/versão e registra lease/testSend. O mesmo CAS atualiza somente esse rascunho para o modelo curto atual e guarda mensagem/template anteriores em `messageHistory`, com motivo e auditoria.

Se o pedido ou contato deixar de ser elegível, a autorização restrita apenas recusa a retirada e preserva o rascunho bloqueado. Não aplica cancelamento automático ao teste nem afrouxa a elegibilidade de tarefas legadas sem seleção manual.

A ponte verifica novamente autorização vigente, ID/destino, versão pós-claim, tentativa1, lease e marcador. Personaliza contact-v1 e usa a conta operacional pelo transporte existente, com idempotência por tarefa. Journal e confirmação nativa continuam obrigatórios. Sem confirmação confiável, manter uncertain e conferir manualmente: nunca repetir o envio. Recibo após expiração não é descartado se ainda pertence ao lease válido.

Após o resultado, remover a autorização do servidor e do cofre e reiniciar a ponte sem o campo; preservar as duas chaves globais false. Conferir um único envio/tentativa no teste e nenhum nas sete canceladas. O usuário responde no WhatsApp com a referência do pedido. A importação continua entrando para conferência; não cria proposta, compra ou aprovação automaticamente.

## Validação local

- `scoped-test-send-test`: grant pareado e expirável; servidor/ponte isolados não autorizam; alvo/versão divergentes; tentativa/recibo/lease/estados inseguros; mês fechado; duas retiradas concorrentes resultam em uma; modelo curto/histórico; transporte simulado; nenhuma outra tarefa alterada.
- `cancel-quotation-jobs-test`: permissões, motivo, versão, estados inseguros, recibos/leases, arquivamento, fechamento, conflitos de pedido/competência entre leitura e gravação, sete canceladas/oito auditorias/nona intacta, repetição recusada.
- `cancel-quotation-jobs-http-test` em 5185: autenticação real local, recusas de perfis, motivo/versão, cancelamento e tarefas anteriores intactas; inclui preparação/seleção local de contatos.
- Regressões `integration-test`, `openclaw-test` (9), `contact-runner-test`, `quotation-contact-selection-test`, `workflow-test`; tipos e build.
- Revisão independente sem achados críticos/importantes, com confirmação adicional da atomicidade SQL em SQLite. Nenhum dado real usado nos testes.

Lint dirigido ainda apresenta oito erros e oito avisos anteriores nos arquivos compartilhados; comparação com HEAD confirma as mesmas regras e quantidades, sem novos achados. Não declarar lint geral aprovado.

Pendências de operação: publicação/instalação, sete cancelamentos reais, configuração do grant, envio nativo e retorno. Resultados locais não comprovam entrega WhatsApp real.
