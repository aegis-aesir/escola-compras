# Central de Compras — Colégio Estrelas

Escola privada: Centro Educacional Estrelas do Amanhã LTDA. Mercado local: Manaus/AM.
Diretora Geral: Franciluce Lima. Responsável pela diretoria administrativa: ainda não informado.

## Fluxo definido pela escola

1. O setor solicita itens com quantidade, unidade, especificação, justificativa e prazo específico, quando houver.
2. O sistema deve pesquisar referências na internet para gerar uma estimativa com fontes e datas.
3. A diretoria administrativa analisa cada solicitação e encaminha seu parecer.
4. A diretoria geral aprova a necessidade do pedido, sem aprovar valor ou estabelecer teto financeiro.
5. Após essa aprovação, o sistema consulta fornecedores locais do cadastro interno pela categoria de cada item. Quando não houver cadastro compatível, pesquisa na internet, priorizando perfis de empresas no Google Maps em Manaus. A administração confere as fontes e cadastra os contatos antes de preparar as cotações pelo WhatsApp.
6. Após 1 dia útil desde o primeiro contato efetivamente realizado, sem proposta válida, consulta fornecedores nacionais no cadastro e pesquisa na web as categorias sem fornecedor nacional.
7. A diretoria administrativa compara os preços reais e gerencia a execução de cada compra pelo agente WhatsApp.
8. Pedido, acompanhamento e recebimento ficam registrados no histórico.

O envio do setor não inicia a pesquisa sozinho. A solicitação fica aguardando a Diretoria Administrativa, que aciona a estimativa automática pela internet. A ponte processa somente pedidos já iniciados pela administração. Depois do resultado, a administração confere os dados e usa **Salvar e enviar para Diretoria Geral**; essa ação salva a conferência, registra a aprovação administrativa e libera o pedido para a decisão da Diretoria Geral.

Na análise da necessidade, a Diretoria Geral também pode usar **Devolver para apuração administrativa** e informar a pendência. A solicitação volta para `admin_review`, preserva o parecer anterior e só retorna à fila da Diretoria Geral quando a Administração registrar a resposta e reenviar. Pendência, resposta, responsáveis e datas permanecem no histórico do pedido.

Enquanto a solicitação ainda aguarda a decisão da Diretoria Geral, a Diretoria Administrativa pode abrir **Conferência administrativa** e usar **Salvar alterações na análise administrativa**. Uma revisão válida atualiza imediatamente o parecer mostrado à DG, mantém o pedido em `general_review` e registra autoria, data e nova versão no histórico. Depois da aprovação geral, esta regra não altera nem reaproveita a decisão já registrada.

O adiamento preserva o pedido original, a competência e todo o histórico com status `deferred`. Na mesma operação, o sistema cria para o autor uma cópia privada e editável em Meus rascunhos, identificada como **Adiado**, com protocolo de origem, motivo e mês em que poderá ser enviada. O setor pode editar e anexar documentos imediatamente, mas o envio definitivo é bloqueado até a competência seguinte. Ao enviar, a cópia vira um novo protocolo e registra o vínculo `reusedFrom`; o original não é alterado nem retomado.

Não existe reaprovação de valor. A proposta real pode superar a estimativa sem voltar à diretoria geral. A estimativa e o preço real permanecem separados e identificados.

## Implementado no piloto

Arquivar/restaurar solicitação: ação junto ao título dos detalhes, com confirmação em janela própria e foco no motivo. Cancelar ou Escape retorna ao pedido sem gravar; durante o envio, os controles ficam desativados. A confirmação não fica escondida no final de formulários longos.

Estados e permissões de cada etapa, estimativa automática pelo agente coordinator, com fonte HTTP/HTTPS e data por item, e correção manual na análise administrativa, parecer administrativo obrigatório antes da aprovação geral, registro separado da aprovação da necessidade, fornecedores locais/nacionais, propostas reais registradas manualmente, seleção administrativa e acompanhamento da execução.

O prazo local começa no primeiro contato registrado como realizado ou confirmado pelo OpenClaw. Dias úteis são segunda a sexta, excluindo feriados e dias sem expediente cadastrados em Configurações. A ponte local verifica os prazos a cada ciclo, mesmo com o painel fechado, enquanto estiver em execução. A atualização do painel também mantém essa verificação. Pedidos vencidos sem proposta válida passam à etapa nacional, com histórico e proteção contra concorrência; a ponte enfileira e executa a pesquisa de fontes.

Três propostas é uma sugestão inicial editável, não uma regra confirmada pela escola. A quantidade mínima para selecionar é configurável; o critério para iniciar a busca nacional é não haver nenhuma proposta local válida depois do prazo.

## Integração OpenClaw

Em 13/11/2026, foram adicionados critérios de estimativa por item para Master/ADM, pré-preenchidos com descrição, especificação e marca do pedido. Permitem autorizar similares, definir requisitos mínimos e tratar marca/modelo como obrigação ou referência. O formulário abre antes da pesquisa; depois pode ser expandido para salvar/refazer um item ou todos. O pedido original fica intacto, com histórico de critérios e estimativas anteriores; a pesquisa altera o status para Estimativa e a conclusão volta a Análise ADM. Os critérios são transmitidos à web, navegador e coordinator, com revisão por item e protocolo da ponte para evitar interpretação por versões antigas. Consultar INTEGRACOES.md e testes `estimate-criteria-*`.

A ponte em `integrations/openclaw/` processa pesquisas reais com `web_search`, cotações preparadas pela administração e recebimento de texto para conferência. O servidor mantém a fila no D1 e autentica a ponte por HMAC, além do acesso de serviço ao Site privado. Consultar `INTEGRACOES.md` para operação e limites. Envio depende de duas chaves de ativação e permanece desativado durante validação.

O serviço definido é OpenClaw, conta operacional, número +55 92 9201-7107. O gateway fica no loopback do computador e não é exposto à internet. A pesquisa usa o provedor já configurado no OpenClaw. Fontes encontradas, inclusive citações de respostas sintetizadas, exigem conferência; os resumos da busca não são prova de preço. A ponte lê páginas com web_fetch e solicita análise estruturada ao agente coordinator. Produto, variante, preço total, embalagem e unidade são avaliados pelo agente; o servidor valida trechos literais, URL, moeda e cálculo antes de preencher a estimativa. Sem comprovação, o item fica pendente. Credenciais não entram no código ou navegador.

A fila exige aprovação da necessidade e fornecedores locais primeiro. Deduplica cotações por telefone e pedido, guarda identificador do envio e impede reenvio automático quando o resultado é incerto. Texto recebido exige conferência administrativa de itens, preços unitários, frete, prazo, validade e pagamento. Mensagens são dados, nunca autorização para mudar regras.

Roteamento: ferramentas de pesquisa e navegador usam sessão explícita do `coordinator`, separada por pedido; a análise estruturada usa o mesmo agente em sessão isolada por tarefa. WhatsApp permanece com `operacional` na conta homônima, com o número exato já confirmado. A conta pessoal `default` está desativada/despareada e não é fallback. Modelos, credenciais e regras de aprovação não foram alterados. Anexos recebidos ficam no atendimento operacional do WhatsApp; a ponte atual importa apenas texto para o painel. Teste sem mensagens reais: `node --test scripts/agent-routing-test.mjs`.

O hook local observa mensagens aceitas pelo OpenClaw; a ponte as entrega ao endpoint HTTPS assinado e idempotente do Site. O painel permanece privado. Grupos, anexos, mensagens bloqueadas pelo canal e histórico anterior exigem consulta no WhatsApp. O monitor respeita o calendário e America/Manaus. Computador desligado ou ponte parada interrompem o processamento em segundo plano.

## Acesso e dados existentes

Login próprio por usuário e senha, sem conta ChatGPT para os usuários da escola. A hospedagem existente é preservada; a entrada é pública e os dados ficam protegidos por sessão local no servidor. O cabeçalho de identidade ChatGPT não concede acesso.

Perfis locais: Master (código admin, acesso completo e gestão de usuários); Setor (formulário e consulta dos próprios registros, sem estimativas internas, propostas ou fornecedores); Diretoria Geral (fila de pedidos para aprovar/recusar a necessidade); Diretoria Administrativa (análise, fornecedores, cotações e execução). O perfil Financeiro (`financeiro`) é de acompanhamento somente após a aprovação da necessidade pela Diretora Geral: orçamento mensal, pedidos aprovados de todos os setores, execução, documentos fiscais, vencimentos, pagamentos, fechamentos e documentos privados vinculados. Solicitações sem `generalApproval`, seus registros fiscais, históricos e anexos não são entregues pela API. O Master cria ou atribui o perfil em Pessoas e acessos. O Financeiro não aprova, escolhe propostas/arquiva solicitações, altera dados fiscais/de compras, anexa, opera WhatsApp ou gerencia usuários. A API também não entrega usuários/integrações. A diretoria geral não cria solicitações. Usuários antigos por e-mail permanecem nos registros históricos e não autenticam automaticamente.

Pedidos do fluxo anterior preservam seu histórico. Pedidos antigos em cotação sem registro das novas aprovações devem ser explicitamente encaminhados para estimativa antes de prosseguir no novo fluxo. Pedidos já executados permanecem consultáveis.

## Validação

Aparência: o botão **Aparência** no cabeçalho está disponível para todos os perfis. Oferece tema claro, escuro ou automático (acompanha o dispositivo) e destaques em Preto, Roxo, Azul, Rosa, Violeta, Anil, Laranja, Azul-petróleo, Bronze, Menta e Verde. A seleção usa opções retangulares em três colunas, com indicador marcado e foco de teclado; mantém os identificadores das preferências anteriores. O tema escuro usa fundos cinza-carvão mais escuros, sem a base azul anterior; cores de destaque continuam independentes. A escolha é pessoal, salva neste navegador e sincronizada entre abas; não altera configurações da escola nem registros de compras.

React/Vinext, Cloudflare Workers, D1, autenticação local e hospedagem Sites. Dados locais de teste não são publicados. Nenhum banco ou credencial está no pacote de produção.

- npx tsc --noEmit
- node scripts/smoke-test.mjs (servidor local na porta 5173; cria registros TESTE LOCAL)
- node scripts/workflow-test.mjs (regras de papéis e prazo em dados fictícios)

Cobertura: acesso anônimo negado, entradas inválidas, sequência obrigatória, parecer administrativo, aprovação da necessidade, contatos locais, impedimento de busca nacional antes do prazo, propostas, preço real acima da estimativa, execução, recebimento, concorrência e histórico. Regras de fim de semana, feriado e supressão da busca nacional quando existe proposta válida foram verificadas separadamente. Revisão visual confirmou filas, estimativa versus preço real e histórico.

Validação adicional da devolução e do adiamento: `node scripts/budget-flow-test.mjs`, `node scripts/deferred-draft-test.mjs`, `node scripts/general-return-ui-test.mjs` e, com o servidor local, `node scripts/general-return-deferred-draft-http-test.mjs`. Os testes usam somente dados fictícios e não enviam mensagens externas.

Fora desta versão: envio automático do pedido e acompanhamento da execução pelo agente, interpretação automática de propostas, execução de pagamentos bancários, estoque e compras divididas entre fornecedores. Anexos, registro documental de pagamentos/notas e complementação de pedidos devolvidos estão implementados; não executam transferências financeiras. Usuários locais podem ser desativados, excluídos e ter suas senhas redefinidas por um Master. A exclusão encerra sessões, oculta a conta e preserva identidade, pedidos e auditoria; o login fica reservado. O próprio acesso e o último Master são protegidos. A troca de senha é opcional no primeiro acesso e após redefinição, inclusive para contas antigas, sem alterar credenciais existentes. Validação específica: `node --test scripts/openclaw-test.mjs` e `node scripts/integration-test.mjs`, com banco isolado e sem mensagens reais.

## Formulários e controles anteriores

Arquivamento da solicitação inteira, exclusivo do Master, com motivo, autoria e histórico/restauração. Preservar o mesmo pedido, etapa, aprovações, formulário, propostas, notas, anexos e todos os históricos. Retirar das filas ativas, bloquear edições e pausar novas tarefas automáticas. A aba Arquivadas permite consultar e restaurar a etapa original. Não há mais arquivamento individual de propostas; metadados antigos são apenas históricos. Valores e fechamentos mensais não são apagados. Testes: `request-archive-test`, `request-archive-storage-test` e `request-archive-http-test`.

Reabertura de não aprovação (11/11/2026): em Solicitações, Master ou Diretoria Administrativa abre o pedido Não aprovado, expande Reabrir para análise, informa justificativa e confirma. Mantém identidade, itens e competência. Com estimativa, retorna à análise administrativa; sem estimativa, retorna à pesquisa. Exige novo parecer e nova decisão da DG. Recusa, parecer e controles anteriores ficam em reopeningHistory e na auditoria; o histórico público do pedido não expõe controles internos anteriores. Somente pedidos rejeitados sem aprovação/propostas de compra podem ser reabertos; versão e mês fechado continuam protegidos. Testes: `node scripts/reopen-request-test.mjs` e, com servidor local, `node scripts/reopen-request-http-test.mjs`.

Ajuste de 11/11/2026: avaliação financeira informativa retirada do painel e da exigência de encaminhamento. Dados anteriores preservados, sem exposição à DG. Comparação e escolha comercial administrativa somente após a aprovação da necessidade e o recebimento de propostas reais; estimativas não habilitam essa etapa. A escolha continua administrativa, com propostas válidas/comparáveis, quantidade configurada, exceção documentada e justificativa de preço superior. Não altera as chaves de envio nem automatiza a interpretação de propostas. Validação: `node scripts/administrative-stages-test.mjs`.

Compatibilidade com os nove arquivos de referência: três formulários estruturados, referências preliminares separadas, declaração autenticada, correções com histórico, conferência/parecer, decisões de escopo, comparativo de propostas, execução, matriz fiscal e fechamento mensal. Consultar `FORMULARIOS-E-CONTROLES.md`. Os dois pedidos preenchidos na planilha antiga não foram importados automaticamente. Registros legados não recebem campos ou declarações inventadas.

Em 11/11/2026, a conferência e o parecer administrativos foram reunidos em um único bloco. Antes da Diretoria Geral, a administração registra avaliação das quantidades, completude adicional, pendências, recomendação e prioridade validada. Foram retirados da interface e dos bloqueios o escopo recomendado em texto, valor recomendado, análise administrativa, justificativa, condições/ajustes e observações do parecer; seus valores anteriores permanecem preservados no histórico.

Também em 11/11/2026, o painel passou a separar Conferência administrativa, Execução e Prestação de contas. A devolução para complementação usa diretamente as pendências e o prazo da conferência e salva ambos junto com a mudança para correção. Execução e prestação mantêm as mesmas chaves históricas, apenas distribuídas em blocos próprios.

Nos pedidos estruturados, formulário e anexos foram reunidos no único colapsável **Formulário Orçamentário**, sem uma caixa externa redundante. A ordem é formulário, anexos e avaliação documental opcional; permissões e arquivos privados permanecem inalterados.

Na devolução ao setor, a janela Complementar solicitação também lista e envia anexos opcionais antes do novo aceite. Os arquivos usam o mesmo ID do pedido. O histórico da própria solicitação fica visível ao setor, sem documentos internos ou eventos fiscais vinculados; a gestão e o Financeiro mantêm a auditoria completa autorizada. Quando o setor não altera as quantidades, a avaliação e as quantidades recomendadas da conferência permanecem preenchidas. Completude adicional, pendências, prazo, responsável e data são limpos para a nova conferência; mudança de quantidade também exige nova avaliação quantitativa.

Simplificação de 10/11/2026: novos formulários usam classificação única em vez de origem/natureza/previsão e retiram códigos, contato, centro de custo, vínculo e declarações de disponibilidade/ausência de referências. Referências e anexos são opcionais. Competência calculada pelo servidor no mês do primeiro envio em America/Manaus, preservada nas complementações. Formulários anteriores mantêm sua leitura original e histórico. Testes adicionais: `budget-simplification-test` e, com servidor local, `budget-simplification-http-test`.


Ajuste de 11/11/2026: data necessária é opcional nos três formulários; preencher apenas quando houver prazo específico. O ciclo é mensal e a execução depende da disponibilização do saldo no início do mês de referência, sem atribuir automaticamente um dia de compra. Preservar competência e datas já registradas. Indicador de recebimento no prazo considera apenas pedidos com data específica. Quantidades de novos itens e complementações devem ser inteiras positivas (1 a 100000); valores monetários continuam com centavos e registros históricos não são arredondados.


Rascunhos automáticos (11/11/2026): novas solicitações incompletas ficam em records com kind=request_draft/status=draft, privadas do autor, fora de aprovações, indicadores e integrações. Acesso por Meus rascunhos ou Nova solicitação → Continuar. Salvamento após 600 ms sem edição, fila serial e controle de versão; cópia local por usuário protege o fechamento antes da resposta do servidor. Escape não fecha o formulário. No envio definitivo, validar todas as regras e converter atomicamente o mesmo registro em request; repetição com o mesmo ID retorna a solicitação existente. A competência é do primeiro envio definitivo em Manaus, não da criação do rascunho. Aceite deve ser confirmado novamente. Complementações existentes mantêm o fluxo atual e proteção contra Escape; não são novos rascunhos. Testes locais: scripts/request-drafts-test.mjs e scripts/optional-needed-date-test.mjs; sem mensagens reais ou alteração de dados de produção.


Anexos no preenchimento do setor (11/11/2026): seção opcional antes do aceite nas novas solicitações, disponível após salvar automaticamente o rascunho. Sem escolha de visibilidade para o setor; documentos da solicitação. Rascunhos e seus arquivos são privados do autor, inclusive perante outros perfis; a conversão para pedido preserva o mesmo ID e os anexos, passando às permissões normais da solicitação. Manter R2 privado, 5 MB/arquivo, 20 arquivos, validação do conteúdo e bloqueios de etapa/arquivamento/fechamento.


Conferência administrativa simplificada (11/11/2026): retirar da interface e dos bloqueios completude, necessidade/finalidade, estoque, duplicidade, compatibilidade com mercado, fornecedor/condições, prioridade adequada e prazos de análise. Quantidades e possibilidade de reduzir/adiar permanecem. Prioridade validada inicia com a prioridade do pedido, preserva escolha já salva e pode ser alterada. Documentos suficientes e observações ficam em avaliação opcional junto aos anexos; não exigir anexos ou cotação pelo setor. Conferências técnicas específicas, parecer e aprovação da necessidade permanecem. Manter campos antigos no contrato de armazenamento e nos registros, sem migrar ou apagar dados históricos.


Avaliação unificada de quantidades (11/11/2026): substitui Quantidades adequadas e Possibilidade de reduzir/adiar por Avaliação das quantidades (Adequadas/Inadequadas/Podem ser reduzidas), com quantidade recomendada inteira por item. Branco mantém o solicitado; zero não recomenda o item. Redução não permite aumento; alteração exige recomendação diferente e preserva itens originais. DG recebe as recomendações como contexto, mantendo sua decisão de escopo. A completude das informações adicionais admite Suficientes, Complementação necessária ou Não necessárias; pendências impedem encaminhamento até complementação. Dados opcionais não se tornam globalmente obrigatórios. Campos anteriores preservados no armazenamento; reabertura exige nova avaliação, com a anterior no histórico.

O detalhamento de uma complementação usa somente Pendências e esclarecimentos. O campo anterior de informações adicionais/observações permanece apenas no histórico e não aparece na interface. Se a completude estiver como Complementação necessária, o parecer não segue à DG e Pendências e esclarecimentos deve informar o que será solicitado ao setor.

## Interface global de 12/11/2026

A área autenticada passou a usar uma navegação lateral na cor de destaque, compacta por padrão e expansível para 264 px. A preferência fica somente no navegador, na chave `estrelas-sidebar-v1`; valor ausente ou inválido retorna ao modo compacto. Em telas de até 900 px a navegação abre como painel sobreposto e, em até 600 px, campos e ações principais ficam em uma coluna. A marca oficial está em `public/estrela-2026.png` e permanece sobre suporte branco nos temas claro e escuro.

O cabeçalho mostra saudação, data de Manaus, área ativa e mantém Aparência, alteração de senha e saída. A camada final `app/redesign.css` padroniza cartões, métricas, tabelas, formulários, histórico, anexos, diálogos e painéis de orçamento sem mudar eventos, payloads, permissões ou regras. O componente `app/dashboard-shell.tsx` concentra somente navegação e sessão; `app/dashboard-shell-state.ts` contém a normalização da preferência e a data local testável.

### Menu por etapas do processo orçamentário

O menu administrativo segue a sequência **Dashboard → Solicitação → Análise ADM → Estimativa → Aprovação Diretoria → Cotação → Execução → Resumo Mensal**. As filas são exclusivas: `pending` e `admin_review` ficam em Análise ADM; `estimating`, em Estimativa; `general_review`, em Aprovação Diretoria; `quoting` e `national`, em Cotação; `execution`, `approved`, `ordered` e `received`, em Execução. Após concluir a pesquisa, o pedido retorna para a conferência em Análise ADM antes da Diretoria Geral. Ao avançar, o pedido sai da fila anterior sem perder histórico.

O perfil Setor continua com uma única área **Minhas solicitações**, que mostra todos os pedidos próprios e atualiza somente o status visível. A Diretoria Geral recebe Dashboard, Aprovação Diretoria e Resumo Mensal em modo de consulta. O Financeiro mantém Solicitação, Execução e Resumo Mensal em modo de acompanhamento. Fornecedores e Agente WhatsApp são acessos contextuais de Cotação; Arquivadas fica dentro de Solicitação; Configurações fica na área do usuário Master. A matriz está em `app/process-navigation.ts` e é validada por `node scripts/process-navigation-test.mjs`.

Na decisão da Diretoria Geral, **Devolver para apuração administrativa** passou a ser uma opção do mesmo seletor usado para aprovar, adiar ou rejeitar. A escolha abre diretamente o campo obrigatório de pendência e chama a transição auditada `return_to_admin`; o colapsável separado foi removido. O pedido volta para `admin_review`, preserva o parecer e sai da fila da DG até novo encaminhamento.

Validações próprias: `node scripts/redesign-shell-test.mjs` e `node scripts/redesign-styles-test.mjs`. A inspeção visual foi feita em desktop e 390 px, nos temas claro e escuro, com menu compacto, expandido e móvel. O lint global ainda possui dívida anterior em arquivos não relacionados; o novo shell passa isoladamente em ESLint. Nenhuma mensagem real foi enviada na validação.

### Ordem da decisão, versão e arquivo de rascunhos (12/11/2026)

A decisão da Diretoria Geral aparece entre Estimativas e Execução. O campo de adiamento foi renomeado para **Data prevista para reavaliar a solicitação**, entendido como acompanhamento interno, não como data de compra e sem mudança automática de competência. A versão `2026.11.12.1`, centralizada em `app/system-version.ts`, aparece no menu autenticado e no rodapé.

O setor pode arquivar seus próprios rascunhos ativos em **Meus rascunhos**. A consulta e a restauração dos arquivados são exclusivas do Master; o servidor oculta o conteúdo e os anexos do setor, e os IDs próprios ocultos impedem que cópias locais antigas reapareçam. O arquivo é reversível e preserva conteúdo e anexos; bloqueia autosave e envio definitivo até restauração. O Master possui **Solicitação → Rascunhos e arquivadas → Rascunhos ativos**, consulta todos os autores/setores e pode arquivar ou restaurar podendo revisar e encaminhar com aceite próprio. A consulta global exige `GET /api/drafts?scope=all`; o GET comum continua restrito aos rascunhos do usuário. Validação principal: `node scripts/request-drafts-test.mjs`, `node scripts/process-navigation-test.mjs` e `node scripts/general-return-ui-test.mjs`.


Poderes do Master (13/11/2026): em **Solicitação → Rascunhos e arquivadas → Rascunhos ativos**, o Master abre o formulário de qualquer rascunho, completa/revisa campos, informa justificativa e confirma o aceite em seu próprio nome. `master_submit_draft` preserva autor/setor originais e ID/anexos, grava o rascunho anterior no histórico, permite antecipar cópia adiada ou encaminhar arquivado e mantém validação obrigatória, versões e mês aberto. Em qualquer solicitação, **Reenviar para análise administrativa** (`master_reanalysis`) exige justificativa, restaura arquivados, preserva snapshot completo em `reanalysisHistory` e invalida as decisões ativas para exigir novo parecer/aprovação. Com estimativa, retorna a `admin_review`; sem, a `pending`, para a administração iniciar a pesquisa. Propostas anteriores passam ao histórico, documentos fiscais permanecem vinculados e fechamento mensal continua exigindo reabertura justificada. A cópia adiada ainda não enviada é arquivada atomicamente ao reenviar o original. Outros perfis mantêm suas permissões. Testes: `master-reanalysis-test.mjs`, `master-forward-http-test.mjs` e `general-return-deferred-draft-http-test.mjs`. Nenhuma mensagem real durante testes.


Área unificada do Master (13/11/2026): **Solicitação → Rascunhos e arquivadas** abre **Solicitações e rascunhos**, com Rascunhos ativos e uma única lista **Arquivadas**. Esta última mistura solicitações e rascunhos arquivados, identificando o tipo/etapa, autor, setor e data, com busca comum e ordenação por arquivamento. Rascunhos mantêm encaminhar/restaurar; solicitações abrem os detalhes completos para consulta, restauração e reanálise. Não separar arquivos por tipo. Dados, endpoints e permissões permanecem iguais. Composição em `app/master-record-list.ts`; teste: `node scripts/unified-archives-test.mjs`.


## Solicitação única e ações dos arquivados — 13/11/2026

Regra atual aprovada pelo usuário, substituindo a criação de cópia no adiamento: manter o mesmo registro `request`, ID, protocolo, autor, setor, data inicial e anexos. Adiar mantém `deferred` e inicia `deferredEdit` (revisão com autosave de 600 ms, backup por usuário/rodada e Escape protegido). Autor/Setor e Master usam **Revisar e reapresentar solicitação adiada**. Setor pode editar/anexar antes, mas envia somente a partir de `availableMonth` (mês seguinte à competência adiada); Master pode antecipar com justificativa. Mês fechado continua exigindo reabertura.

`reapply_deferred` grava a rodada anterior completa em `roundHistory`, mantém o protocolo e volta a `pending`, com nova competência calculada no servidor em Manaus, nova revisão de pesquisa e novas aprovações obrigatórias. Limpar somente decisões/estimativa/gestão/escopo ativos; preservar históricos, documentos e autoria. O endpoint legado `resume_request` orienta usar a reapresentação completa. `requestsForMonth` fornece a última rodada da competência para resumo/fechamento sem duplicar o pedido; fechamentos já salvos permanecem preservados.

Compatibilidade: `consolidateDeferredDrafts` incorpora cópias legadas **ainda não enviadas**, ativas ou arquivadas, ao `deferredDraftHistory` do original, com controle de versão e transação idempotente. A cópia física passa a `request_revision`; nada é apagado. Arquivos passam ao ID original mantendo chave/bytes R2 e `originalRequestId`; auditoria da cópia integra o histórico. Não consolidar pedidos independentes já enviados ou notas fiscais. Ocorre automaticamente nos acessos autenticados a dados/rascunhos/anexos. Backups locais de IDs incorporados são descartados; endpoints antigos não podem reenviar essas cópias.

Em **Arquivadas**, Master recebe ações por tipo: rascunho → **Encaminhar para o setor** (restaura para o autor continuar, sem envio administrativo) e **Excluir**; solicitação → **Encaminhar ao diretor ADM** (justificativa, nova análise e histórico preservado) e ícone Consultar. Exclusão exige confirmação explícita, Master, versão atual e rascunho arquivado. Exclusão lógica em `deleted_request_draft`, com autoria/data/auditoria e bytes preservados; removido do painel, sem restauração/envio ou acesso aos arquivos pelos endpoints normais. Não executar exclusões em produção durante testes.

Permissões dos snapshots: Master/ADM mantêm registros completos; Setor/DG recebem somente os campos permitidos de cada rodada. Financeiro não recebe revisões/rascunhos ou rodadas sem aprovação da necessidade. Operacional/default, modelos, credenciais, DB/R2/domínio e chaves de envio não mudam. Nenhuma mensagem real nos testes.

Testes: `single-request-test.mjs`, `single-request-http-test.mjs`, `general-return-deferred-draft-http-test.mjs`, `master-forward-http-test.mjs`, `budget-flow-test.mjs`, `budget-records-test.mjs`, `request-drafts-test.mjs`, `finance-profile-test.mjs`, tipos e build Sites. Verificação visual local: revisão com autosave/recuperação e ações de arquivo; confirmação de exclusão cancelada na UI, exclusão testada somente em dados fictícios locais.


## Nome e confirmação de exclusão — 13/11/2026

Nome do produto: **CEEA Manager**, aplicado no título da aba, marca do menu, login, rodapé, aparência e carregamento. Manter Colégio Estrelas como instituição e preservar domínio, IDs, DB/R2, usuários, regras e integrações.

Correção de exclusão: a confirmação inline acima da tabela ficava fora do viewport quando o Master clicava nas linhas inferiores. Substituída por `DraftDeleteDialog`, com `showModal`, foco inicial em Cancelar, bloqueio durante processamento e erro focado dentro da janela. Sucesso aparece em aviso fixo visível. API, exclusão lógica e permissões permanecem iguais. Teste do componente em `scripts/draft-delete-dialog-test.mjs`; testar também confirmação, cancelamento, conflito de versão e resultado no navegador com dados locais.

Em 13/11 o usuário autorizou testar a exclusão de qualquer rascunho real. Foi excluído um único rascunho sem título do Setor de teste, arquivado em 12/11 às 20:14:01; mensagem de sucesso e redução de 8 para 7 registros confirmadas. Essa autorização foi específica ao teste desta sessão, não permite excluir outros registros arbitrariamente em trabalhos futuros. Nenhuma solicitação foi excluída.
