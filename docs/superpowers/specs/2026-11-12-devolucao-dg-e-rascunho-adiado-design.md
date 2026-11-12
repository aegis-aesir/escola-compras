# Devolução pela Diretoria Geral e rascunho de pedido adiado

## Intenção

Permitir que a Diretoria Geral devolva uma solicitação à Diretoria Administrativa para apuração de uma pendência antes de decidir a necessidade. Quando uma solicitação for adiada, preservar o pedido original e criar automaticamente uma cópia privada e editável para o setor reutilizar em outro mês.

## Objetivos

- A Diretoria Geral informa uma pendência e devolve somente pedidos que estejam em `general_review`.
- O pedido volta para a análise administrativa, preservando formulário, itens, estimativa, parecer anterior e auditoria.
- A Diretoria Administrativa registra uma resposta à pendência e reenvia o mesmo pedido à Diretoria Geral.
- Cada devolução e resposta fica registrada no histórico, com autoria e data.
- Qualquer adiamento válido mantém o pedido original com status `deferred` e cria uma única cópia em `request_draft` para o autor original.
- O rascunho adiado é privado, editável pelo setor, identificado como **Adiado** e vinculado ao protocolo original.
- A nova solicitação criada a partir da cópia recebe um novo protocolo e mantém a referência ao pedido original.

## Não objetivos

- Não transformar o pedido original em rascunho, não apagar seu histórico e não reutilizar sua aprovação.
- Não copiar decisão da Diretoria Geral, aprovação, parecer ativo, estimativa, propostas, execução ou dados fiscais para a nova solicitação.
- Não enviar mensagens pelo WhatsApp nem iniciar pesquisas automáticas durante os testes.
- Não duplicar arquivos privados do pedido original. Eles permanecem no histórico original; o setor pode anexar novos documentos ao rascunho.

## Abordagens consideradas

### 1. Criação automática e atômica — escolhida

O adiamento atualiza o pedido original e cria a cópia privada na mesma operação de banco. A cópia recebe um identificador próprio e vínculo determinístico com o adiamento, impedindo duplicidade em repetição ou falha de rede. É a opção escolhida porque não depende de uma ação posterior do setor.

### 2. Criação sob demanda

O setor precisaria clicar em “Criar rascunho” depois do adiamento. É tecnicamente mais simples, mas permite que o reaproveitamento seja esquecido e não corresponde à decisão do usuário.

### 3. Transformar o pedido original em rascunho

Foi descartada porque mistura competências, altera o protocolo histórico e coloca em risco pareceres, auditoria e documentos já registrados.

## Devolução da Diretoria Geral

Na tela da Diretoria Geral haverá a ação **Devolver para apuração administrativa**, com uma pendência obrigatória de pelo menos cinco caracteres. A ação:

1. exige pedido em `general_review`, sem aprovação ativa;
2. registra a pendência, autoria e data em uma estrutura própria;
3. preserva a estimativa e uma cópia do parecer administrativo anterior no histórico;
4. retira o pedido da fila da Diretoria Geral e o devolve para `admin_review`;
5. mostra a pendência em destaque para a Diretoria Administrativa.

Ao reenviar, a Diretoria Administrativa deve informar uma resposta à pendência. O sistema registra responsável, data e resposta no histórico, atualiza o parecer ativo e devolve o mesmo pedido para `general_review`. A Diretoria Geral volta a enxergá-lo com a pendência e a resposta anteriores. A devolução não vai ao setor e não usa o fluxo de complementação do formulário.

## Adiamento e cópia editável

Ao confirmar um adiamento, o sistema grava no pedido original o motivo, autoria, data, prazo pertinente quando informado e o identificador do rascunho criado. Na mesma transação, insere uma única cópia `request_draft` pertencente ao `authorId` original.

A cópia contém título, setor, justificativa, prioridade/formulário preenchível, itens, especificações e referências preliminares do escopo solicitado. Para pedidos parcialmente tratados, usa o escopo original quando disponível. Não contém estimativa interna, parecer administrativo, decisão, aprovação, propostas, fornecedores, execução ou registros fiscais.

O rascunho aparece em **Meus rascunhos** com o rótulo **Adiado**, o protocolo de origem, o motivo e a indicação de reutilização no mês seguinte. Ele pode ser editado imediatamente, mas o envio definitivo só é liberado a partir do primeiro dia do mês seguinte ao mês de referência efetivo do pedido, ou ao mês do adiamento quando não houver referência válida. Se for enviado depois, a competência segue a regra vigente do sistema: mês do primeiro envio definitivo em Manaus.

Ao enviar, o rascunho é convertido em uma nova solicitação com novo protocolo, status inicial normal e referência ao pedido adiado. O pedido original permanece `deferred`. A Diretoria Administrativa não retoma nem altera automaticamente o pedido original.

## Dados, segurança e compatibilidade

- Registros antigos com status `deferred` continuam válidos; não será criada cópia retroativa automaticamente.
- A criação usa controle de versão do pedido e vínculo do rascunho para impedir duplicidade.
- Somente o autor original consulta e edita o rascunho; Master, diretorias e Financeiro não recebem seu conteúdo enquanto ele não for enviado.
- O setor continua vendo o pedido original adiado em **Minhas solicitações**, além da cópia em **Meus rascunhos**.
- Auditoria registra devolução, resposta administrativa, adiamento e conversão da cópia em nova solicitação.
- Credenciais, hospedagem, dados existentes e integrações permanecem inalterados.

## Validação

- Testes de domínio para devolução, resposta obrigatória, reenvio e preservação de histórico.
- Testes HTTP para permissões da Diretoria Geral e Administrativa.
- Testes de rascunho para criação atômica, privacidade, edição, prevenção de duplicidade, bloqueio antes do mês permitido e conversão em novo pedido.
- Regressão de complementação pelo setor, adiamento legado, navegação por filas, TypeScript e build de produção.

