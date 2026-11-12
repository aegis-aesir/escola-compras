# Ordem da decisão, versão e arquivo de rascunhos

## Objetivo

Tornar a tela da solicitação coerente com a sequência do processo, identificar claramente a versão em uso e permitir que rascunhos sejam retirados da lista ativa sem apagar dados.

## Regras

- A Decisão da necessidade da Diretoria Geral aparece depois de Estimativas e antes de Execução.
- O campo do adiamento chama-se **Data prevista para reavaliar a solicitação** e explica que é acompanhamento interno, não data de compra nem mudança automática de competência.
- A versão `2026.11.12.1` fica visível de forma persistente na área autenticada.
- Setores arquivam e restauram somente os próprios rascunhos.
- Master consulta rascunhos de todos os setores e pode arquivar/restaurar, sem editar o conteúdo.
- Arquivar é reversível, preserva valores e anexos e impede autosave/envio até restauração.
- Perfis Administrativo, Diretoria Geral e Financeiro não recebem acesso global aos rascunhos.

## Abordagem

Reordenar o JSX existente sem alterar a transição de decisão. Estender `/api/drafts` com leitura administrativa exclusiva do Master e ações otimistas de arquivar/restaurar, mantendo controle de versão e propriedade. Criar uma tela contextual de rascunhos para Master e reutilizar a lista atual para o Setor.

Alternativas descartadas: excluir rascunhos, pois perderia dados; permitir edição pelo Master, pois ampliaria autoridade; guardar o arquivo somente no navegador, pois não atenderia outros dispositivos.

