# Formulários de orçamento e controles das diretorias

O sistema incorpora os três modelos e os controles da documentação anterior, conforme escopo aprovado em 10/11/2026. A hospedagem, usuários, senhas e registros existentes são preservados. Os arquivos originais na unidade Z não são modificados; as duas solicitações preenchidas na planilha mestra não são importadas automaticamente.

## Setores

Em Solicitações → Nova solicitação, escolha Orçamento mensal, Solicitação emergencial ou Assinaturas digitais. Preencha identificação, finalidade, classificação, itens, verificações e declaração. A classificação reúne previsão e recorrência em um único campo: Prevista recorrente, Prevista pontual, Não prevista recorrente ou Não prevista pontual.

O número, autor, data/hora e mês de referência são registrados pelo servidor. Nos novos envios, o mês é o do primeiro preenchimento/envio em America/Manaus, e não o da data necessária para entrega. Complementações mantêm o mês original. Protocolo, códigos/vínculos de complementação, contato, centro de custo e vínculo operacional/pedagógico não são solicitados ao setor. Formulários anteriores continuam consultáveis com suas respostas originais; não há reclassificação automática.

O emergencial pede ocorrência, riscos, justificativa da imprevisibilidade e solução. Assinaturas aceitam várias plataformas com plano, quantidade de licenças, ciclo e vigência. O preço é por licença e por ciclo; o total considera licenças e ciclos. Câmbio exige taxa e data/base explícitas; valores ausentes são apresentados como incompletos.

O setor pode informar preços e documentos já disponíveis como referências preliminares, separadas da estimativa pesquisada e da cotação oficial. Referências e anexos são opcionais nos três modelos: não é necessário declarar disponibilidade nem justificar ausência. A declaração não representa aprovação da despesa. O setor consulta somente suas solicitações e não recebe propostas oficiais, cadastro interno de fornecedores, financeiro ou fechamento.

Após salvar, o pedido abre para envio de anexos. Quando a administração devolver com motivo e prazo, use Complementar e reenviar formulário, responda às pendências e confirme novamente a declaração. O histórico anterior é preservado; o pedido volta à estimativa. O setor não altera pedido já aprovado.

Na complementação, os anexos opcionais aparecem dentro da mesma janela e permanecem vinculados à solicitação original. O setor pode acompanhar o histórico da própria solicitação; eventos fiscais e documentos marcados para uso interno continuam restritos. A avaliação das quantidades permanece quando o setor não altera as quantidades; a completude e a identificação da conferência são preenchidas novamente depois da resposta.

## Administração

Os detalhes do pedido reúnem conferência e parecer da necessidade em um único bloco, além de execução, conferência de recebimento e encaminhamento documental ao financeiro. A avaliação financeira informativa foi retirada em 11/11/2026: disponibilidade, impacto no caixa, responsável e data financeiros não são mais exigidos para encaminhar à Diretoria Geral. Salve a conferência e a recomendação antes de encaminhar; dados pessoais ou integrações em assinaturas continuam exigindo validação técnica concluída. Os dados financeiros antigos ficam preservados no armazenamento e histórico, sem campos de preenchimento ou exposição à DG.

Para reavaliar uma solicitação **Não aprovada**, Master ou Diretoria Administrativa abre o pedido em Solicitações e usa **Reabrir para análise → Justificativa da reabertura → Confirmar reabertura**. A recusa e o parecer anteriores ficam no histórico; o pedido mantém seus itens, identidade e competência. Com estimativa existente, retorna à análise administrativa; sem ela, passa primeiro pela pesquisa. A recomendação e a prioridade validada devem ser novamente preenchidas antes de uma nova decisão da DG. O setor e a DG consultam o histórico da reabertura sem acesso aos controles internos anteriores. Pedidos com aprovação ou propostas de compra exigem conferência do histórico antes de qualquer reabertura; não são alterados por essa ação. Meses fechados continuam exigindo reabertura do mês.

Devolver exige motivo e prazo. Adiar mantém uma única solicitação/protocolo em `deferred`, sem transferir o mês automaticamente; a revisão editável com autosave e anexos fica em `deferredEdit`. O autor usa **Revisar e reapresentar solicitação adiada** a partir de `availableMonth` (normalmente o mês seguinte à competência adiada); o Master pode antecipar com justificativa. `reapply_deferred` preserva a rodada anterior em `roundHistory`, mantém ID/protocolo/autoria/anexos, calcula a competência do novo envio no servidor em Manaus e retorna a `pending` para nova estimativa/análise/decisão da necessidade. Mês fechado exige reabertura. Cópias legadas ainda não enviadas são incorporadas ao histórico, sem apagar arquivos ou consolidar pedidos independentes já enviados; `resume_request` orienta a reapresentação completa. A área mensal consulta as rodadas de cada competência sem duplicar o pedido. Pedidos antigos permanecem sem competência até classificação administrativa explícita.

## Financeiro

Perfil de consulta atribuído por um Master: acompanha pedidos de todos os setores somente quando a necessidade já tem aprovação da Diretora Geral (`generalApproval`), além do orçamento mensal, execução, notas, tributos, vencimentos, pagamentos, fechamentos/versões e anexos privados vinculados aos pedidos permitidos. Solicitações sem aprovação, seus registros fiscais, históricos e anexos não são entregues ao Financeiro. Rascunhos, revisões privadas e rodadas sem aprovação também ficam fora da projeção. Use Consultar na linha do documento fiscal para ver os detalhes e pendências autorizados. Não registra nem altera documentos/pagamentos, aprova, escolhe fornecedores, arquiva solicitações, anexa, opera WhatsApp ou gerencia usuários. A API não entrega usuários, cadastro separado de fornecedores ou informações da integração; as permissões também são verificadas no armazenamento de anexos.

## Diretoria Geral

Aprova a necessidade integral, parte identificada de itens/quantidades, medida provisória emergencial, adia ou rejeita, com motivo e condições. A aprovação parcial reduz efetivamente o escopo que segue às cotações; o pedido original permanece no histórico. A medida provisória não autoriza a solução definitiva, que precisa de solicitação vinculada e fluxo próprio.

Não há campo de teto financeiro, aprovação de valor ou reaprovação por preço real acima da estimativa. Parecer e estimativa são contexto informativo. O perfil não administra fornecedores, compras ou pagamentos.

O campo **Prazo pertinente à decisão** foi removido do preenchimento por solicitação do usuário em 13/11/2026. Aprovação integral, parcial, medida provisória e rejeição não apresentam campo de prazo. Somente **Adiar** apresenta **Data prevista para reavaliar a solicitação**, obrigatória e registrada em `needDecision.due`. É um prazo de acompanhamento: não agenda compra, não muda automaticamente a competência e não define a liberação da reapresentação, que usa `availableMonth`. Datas de decisões anteriores permanecem preservadas e consultáveis.

## Pesquisa e propostas

Nos detalhes da solicitação, **Cotação** é um bloco colapsável entre a decisão da Diretoria Geral e Execução. Reúne Registrar cotação, Preparar mensagem, Comparativo de propostas e Versões anteriores das propostas, conforme as permissões e a etapa existentes. Abre automaticamente nas etapas de cotação local/nacional de pedidos ativos; antes delas, informa que as propostas reais dependem da aprovação da necessidade. Setor não recebe o bloco; Financeiro e pedidos arquivados mantêm somente consulta. Os cabeçalhos colapsáveis da solicitação, incluindo os históricos, usam ícones Lucide de 16 px com alinhamento uniforme.

Em **Preparar mensagem de cotação**, os fornecedores compatíveis aparecem em uma lista de checkboxes, inicialmente desmarcados, com categoria, abrangência, telefone e itens compatíveis. Para manutenção, o direcionamento distingue material e serviço: **registro para mictório**, por exemplo, procura lojas de materiais de construção, hidráulica, ferragens, homecenter e utilidades; **serviço de instalação** procura prestadores. Um prestador cadastrado apenas como Manutenção não é considerado vendedor de materiais. O cadastro explícito de materiais/serviços prevalece; lojas com categoria ampla podem ser reconhecidas por evidência comercial no nome. A descrição só auxilia quando a categoria do item é ampla; categorias explícitas de material ou serviço prevalecem, e itens sem categoria ou ambíguos exigem conferência. Essa classificação de busca não regrava o pedido original. Outros segmentos mantêm correspondência normalizada existente. Locais em `quoting`; locais e nacionais em `national`. A compatibilidade não confirma estoque/equivalência técnica; fontes da web exigem conferência/cadastro antes de entrar na seleção.

Há um único **Modelo genérico da mensagem**, preservando o pedido aprovado. `{{contato}}` é substituído pelo contato ou nome cadastrado de cada fornecedor no despacho pela ponte OpenClaw. **Preparar cotações no OpenClaw** registra uma tarefa por contato selecionado, com validação no servidor e idempotência por pedido/telefone; até 100 fornecedores por preparação. Marcar checkboxes ou copiar o modelo não enfileira nem envia. A preparação pode ser processada pela ponte quando ambas as chaves de envio já estiverem habilitadas; com envio desativado, as tarefas ficam bloqueadas. O aviso de preparação não comprova entrega da mensagem. As permissões Master/ADM, aprovação da necessidade, versão, arquivamento, mês fechado e prazo da etapa nacional permanecem aplicáveis.

A pesquisa continua integrada ao OpenClaw e separada das referências do setor. Para assinaturas, o protocolo atual de evidências não comprova o período de cobrança: as fontes são levantadas, e a administração registra a referência por licença para toda a vigência após conferência. Um preço mensal nunca é projetado silenciosamente como preço da vigência.

A comparação e escolha comercial administrativa, originadas do mapa de cotações, aparecem somente após aprovação da necessidade e recebimento de propostas reais, inclusive em pedidos legados. Não são preenchidas durante a análise inicial nem com base apenas nas estimativas. O servidor impede alterações comerciais antecipadas; valores históricos inalterados são preservados. A origem automática ou o registro administrativo de uma proposta recebida não altera essas regras.

As propostas oficiais registram quantidades ofertadas, moeda, base por ciclo ou por vigência, conversão quando aplicável, condições, garantia, documentos e avaliação comparativa. Propostas parciais, tecnicamente incomparáveis ou com conversão pendente não podem ser selecionadas como atendimento integral. A quantidade mínima de propostas continua configurável, com exceção justificada, evidência e autoria registradas. Escolha de preço superior exige justificativa objetiva.

Abra a solicitação pelo título ou pela seta. Como Master, clique em **Arquivar solicitação**, informe o motivo e confirme. Consulte o pedido inteiro em **Arquivadas**; use **Restaurar solicitação** com justificativa para retomar a etapa original. Arquivamento da solicitação inteira, exclusivo do Master, com motivo, autoria e histórico/restauração. Preservar o mesmo pedido, etapa, aprovações, formulário, propostas, notas, anexos e todos os históricos. Retirar das filas ativas, bloquear edições e pausar novas tarefas automáticas. A aba Arquivadas permite consultar e restaurar a etapa original. Não há mais arquivamento individual de propostas; metadados antigos são apenas históricos. Valores e fechamentos mensais não são apagados.

Manaus permanece primeiro; a busca nacional exige um dia útil desde contato local realizado sem proposta válida. Preparar rascunho não inicia prazo. Testes não enviam mensagens reais e não alteram o número operacional +55 92 9201-7107.

## Anexos

Armazenados em R2 privado, vinculados ao pedido e protegidos por sessão/perfil. Documentos da solicitação são visíveis ao autor e à DG durante sua análise; documentos internos ficam somente com a gestão. O setor anexa apenas em estimativa ou complementação.

Limites: 20 arquivos por pedido, 5 MB por arquivo; PDF, PNG, JPG/JPEG, DOCX, XLSX, PPTX, XML, TXT e CSV. Tipos/conteúdo e tamanho são conferidos no servidor. O download é privado e forçado como anexo, sem execução no domínio do sistema. Meses fechados exigem reabertura para alteração de documentos.

Nos detalhes do pedido, Consultar o formulário enviado e Anexos da solicitação formam um único cartão. A consulta do formulário aparece primeiro; abaixo ficam a lista, o envio de arquivos e, para a administração, a avaliação opcional dos documentos.

## Notas, pagamentos e fechamento

Orçamento mensal apresenta valores do setor, recomendados, referência dos pedidos com necessidade aprovada, contratado e realizado, além de agrupamentos, indicadores, calendário e transferências de competência. Valores ausentes não são inventados; múltiplas notas não duplicam o realizado do pedido.

Uma nota por registro, com revisão/histórico: fornecedor, documento, emissão, valor, vencimento, aceite, CNPJ, XML ou equivalente, orientação contábil, tributo/guia, liberação e pagamento. O sistema registra o pagamento efetuado; não transfere dinheiro. Liberação/pagamento exigem aprovação da necessidade e requisitos documentais aplicáveis. N/A exige justificativa/evidência e orientação formal; a matriz fiscal não calcula tributos nem substitui a Contabilidade.

O fechamento guarda a posição conhecida do mês e as ações/encaminhamentos. Entregas e parcelas futuras podem continuar, com responsável, próxima ação, prazo e saldo/valor a confirmar. Pendências impeditivas bloqueiam conclusão. Reabrir exige motivo e versão atual, preservando a posição anterior. Alterações de pedidos/notas/documentos de mês concluído exigem reabertura.

O calendário usa America/Manaus e os feriados cadastrados: prazos fixos do mês anterior são antecipados ao dia útil anterior, e o relatório vence no quinto dia útil do mês seguinte. O sistema avisa atrasos e não muda a competência por conta própria.

## Verificação local

Testes da reabertura: `node scripts/reopen-request-test.mjs`; com servidor local, `node scripts/reopen-request-http-test.mjs`.

Testes isolados: `node scripts/administrative-stages-test.mjs`, `node scripts/budget-test.mjs`, `node scripts/budget-flow-test.mjs`, `node scripts/budget-files-test.mjs`, `node scripts/budget-records-test.mjs`, `node scripts/quote-comparison-test.mjs`. Nesta worktree Compras, com servidor somente em http://127.0.0.1:5185: `node scripts/budget-http-test.mjs` e `node scripts/smoke-test.mjs`. A porta é resolvida pelo manifesto do módulo; não usar a porta 5173 do coordenador.

Os testes usam dados fictícios, armazenamento local/temporário e não chamam fornecedores. Verificação de tipos e build continuam nos comandos existentes.


Ajuste de 11/11/2026: data necessária é opcional nos três formulários; preencher apenas quando houver prazo específico. O ciclo é mensal e a execução depende da disponibilização do saldo no início do mês de referência, sem atribuir automaticamente um dia de compra. Preservar competência e datas já registradas. Indicador de recebimento no prazo considera apenas pedidos com data específica. Quantidades de novos itens e complementações devem ser inteiras positivas (1 a 100000); valores monetários continuam com centavos e registros históricos não são arredondados.


Rascunhos automáticos (11/11/2026): novas solicitações incompletas ficam em records com kind=request_draft/status=draft, privadas do autor, fora de aprovações, indicadores e integrações. Acesso por Meus rascunhos ou Nova solicitação → Continuar. Salvamento após 600 ms sem edição, fila serial e controle de versão; cópia local por usuário protege o fechamento antes da resposta do servidor. Escape não fecha o formulário. No envio definitivo, validar todas as regras e converter atomicamente o mesmo registro em request; repetição com o mesmo ID retorna a solicitação existente. A competência é do primeiro envio definitivo em Manaus, não da criação do rascunho. Aceite deve ser confirmado novamente. Complementações existentes mantêm o fluxo atual e proteção contra Escape; não são novos rascunhos. Testes locais: scripts/request-drafts-test.mjs e scripts/optional-needed-date-test.mjs; sem mensagens reais ou alteração de dados de produção.


Anexos no preenchimento do setor (11/11/2026): seção opcional antes do aceite nas novas solicitações, disponível após salvar automaticamente o rascunho. Sem escolha de visibilidade para o setor; documentos da solicitação. Rascunhos e seus arquivos são privados do autor, inclusive perante outros perfis; a conversão para pedido preserva o mesmo ID e os anexos, passando às permissões normais da solicitação. Manter R2 privado, 5 MB/arquivo, 20 arquivos, validação do conteúdo e bloqueios de etapa/arquivamento/fechamento.


Conferência administrativa simplificada (11/11/2026): retirar da interface e dos bloqueios completude, necessidade/finalidade, estoque, duplicidade, compatibilidade com mercado, fornecedor/condições, prioridade adequada e prazos de análise. Quantidades e possibilidade de reduzir/adiar permanecem. Prioridade validada inicia com a prioridade do pedido, preserva escolha já salva e pode ser alterada. Documentos suficientes e observações ficam em avaliação opcional junto aos anexos; não exigir anexos ou cotação pelo setor. Conferências técnicas específicas, parecer e aprovação da necessidade permanecem. Manter campos antigos no contrato de armazenamento e nos registros, sem migrar ou apagar dados históricos.


Avaliação unificada de quantidades (11/11/2026): substitui Quantidades adequadas e Possibilidade de reduzir/adiar por Avaliação das quantidades (Adequadas/Inadequadas/Podem ser reduzidas), com quantidade recomendada inteira por item. Branco mantém o solicitado; zero não recomenda o item. Redução não permite aumento; alteração exige recomendação diferente e preserva itens originais. DG recebe as recomendações como contexto, mantendo sua decisão de escopo. A completude das informações adicionais admite Suficientes, Complementação necessária ou Não necessárias; pendências impedem encaminhamento até complementação. Dados opcionais não se tornam globalmente obrigatórios. Campos anteriores preservados no armazenamento; reabertura exige nova avaliação, com a anterior no histórico.

O campo Pendências e esclarecimentos concentra o detalhamento das informações adicionais ausentes. A opção Complementação necessária exige esse texto e deve ser resolvida pela devolução ao setor antes do encaminhamento à Diretoria Geral.

# Ajuste da conferência administrativa em 11/11/2026

Conferência administrativa e parecer foram integrados em um único bloco. Permanecem a avaliação das quantidades, a completude das informações adicionais, Pendências e esclarecimentos, recomendação administrativa e prioridade validada. Itens/escopo recomendado em texto, valor recomendado, análise administrativa, justificativa do parecer, condições e ajustes e observações do parecer foram retirados da interface e não bloqueiam o encaminhamento. A síntese do parecer é registrada no ato de encaminhar à Diretoria Geral. Registros históricos dos campos retirados não são apagados.

Conferência administrativa, Execução e Prestação de contas são exibidas separadamente. Execução registra contratação, fornecedor, datas, responsável e situação. Prestação de contas registra valor realizado, recebimento/aceite, documento fiscal, encaminhamento ao financeiro e diferenças. Quando a conferência indicar Complementação necessária, a administração preenche Pendências e esclarecimentos e Prazo para complementação no mesmo bloco e usa Salvar e devolver ao setor; não existe outro formulário duplicado para esses dados.

