# Solicitação única no adiamento

Escopo aprovado pelo usuário: manter uma única solicitação/protocolo, editável pelo setor quando adiada, com versões anteriores e decisões preservadas. Reapresentação inicia nova rodada de análise, estimativa e aprovação. Implementação nativa autorizada, sem nova rodada de confirmação.

## Abordagens

Escolhida: editar e reapresentar o próprio pedido; cada rodada anterior fica em histórico imutável. Alternativa descartada: apenas agrupar visualmente pedido e cópia, mantendo duas entradas independentes.

## Comportamento

- Adiar mantém status Adiado e cria somente uma revisão de preenchimento dentro do pedido. Campos e anexos podem ser revisados pelo autor e Master, com salvamento automático e Escape protegido.
- Setor reapresenta a partir do mês seguinte à competência adiada; Master pode antecipar com justificativa. Competência da nova rodada é calculada no servidor em Manaus; formulário/competência/decisões anteriores ficam no histórico.
- Mesmo ID, protocolo, autoria, data inicial e anexos. Nova rodada limpa decisões/execução/estimativa ativas e exige todo o fluxo novamente. Tarefas anteriores não valem para a nova revisão.
- Apenas Master arquiva uma solicitação; o arquivamento abrange revisão e histórico, bloqueando edição/reapresentação. Rascunhos novos ainda não enviados mantêm sua regra própria.
- Cópias legadas ainda não enviadas, ativas ou arquivadas, são incorporadas ao pedido de origem, conservando seu conteúdo, ID de origem, versões, arquivos e auditoria. Não apagar bytes de R2. Não alterar pedidos independentes já enviados ou suas notas fiscais.
- Resumo mensal usa a última rodada de cada competência e mantém fechamentos existentes. Bloquear alteração/reapresentação de mês fechado sem reabertura.
- Setor vê seus próprios dados e decisões públicas; snapshots internos continuam restritos. Financeiro continua restrito à aprovação da necessidade. Sem mensagens reais, sem mudanças em credenciais/canais/hospedagem.

## Limites e implementação

Metadados em `deferredEdit`, `roundHistory` e `deferredDraftHistory`; cópias legadas passam a `request_revision`, com arquivos vinculados ao pedido original e chave física preservada. Conversão atômica e idempotente com controle de versão. Endpoints antigos não podem reenviar a cópia incorporada.
