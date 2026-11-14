# Entrega atual — todos os contatos e seleção manual — 14/11/2026

Pedido direto do usuário: na janela Preparar mensagem de cotação, acessar todos os contatos e escolher manualmente; sistema deixa relevantes pré-selecionados. Esta orientação posterior substitui a restrição anterior da janela a fornecedores classificados compatíveis. Implementação na branch **codex/compras**, base b6c730b54f0e61ea825067e8031f99f6396e2e30 (main publicada c4584d5 incorporada). SHA final comunicado ao coordenador após commit/push.

- Lista inclui fornecedores, contatos gerais/sem classificação e última prévia WhatsApp concluída; dedupe por telefone, busca, filtros Todos/Sugeridos/Selecionados e páginas de 25. Fornecedores compatíveis são pré-selecionados até 100; demais disponíveis para escolha manual. Limpar/buscar/paginar não reverte escolhas. Telefones inválidos/própria escola/fora do transporte ficam indisponíveis com motivo.
- Nova API de seleção usa referências verificadas e versões/telefone; contatos da prévia só são salvos se escolhidos ao preparar, mantendo sem classificação. Nenhuma promoção automática ou alteração de categorias/abrangências. Modelo genérico permanece preservado.
- Nova fila manual é explícita e auditada, mantém bloqueios de aprovação/etapa/arquivamento/competência/telefone/duas chaves, dedupe e idempotência; tarefas antigas permanecem intactas. Caminhos legados continuam estritos. Resposta de contato geral tem vínculo próprio, sem fornecedor/proposta inventados.

**Verificação:** 39/39 testes da rodada de regressão passaram, incluindo seleção/agenda/parser/sync/fornecedores/integração/ponte/perfis/workflow; HTTP local 5185 passou com referências forjadas, permissões, prévia, preparação manual e repetição, importação somente dos escolhidos e tarefas anteriores inalteradas. Tipos, lint dirigido e build aprovados. Revisão independente encerrou P2 de normalização legada; testes RED/GREEN cobrem esse caso, repetição da seleção da prévia e fechamento da competência entre preparação e claim/retry.

**UI local:** dados exclusivamente fictícios, 56 contatos em três páginas, oito sugeridos inicialmente selecionados, escolha manual de contato sem classificação e fornecedor fora do segmento/abrangência, limpeza e preservação entre buscas/páginas/filtros. Preparação local de dois contatos devolveu sucesso com envio bloqueado. Celular com 390 × 844, diálogo de 373 px e área rolável de 373 px, sem excesso horizontal. Evidências privadas ignoradas: outputs/cotacao-todos-contatos-desktop.jpg e outputs/cotacao-todos-contatos-mobile.jpg. Nada foi preparado/importado/sincronizado/enviado em produção nesta etapa.

**Compartilhados:** app/dashboard.tsx, quotation-message-form.tsx, integration-model.ts, integration-panel.tsx, api/contacts/route.ts e api/data/route.ts; lib/integrations.ts e contact-agenda.ts. Novos app/quotation-contact-model.ts, quotation-contact-selection.ts, quotation-contacts.css; lib/quotation-contacts.ts; scripts quotation-contacts-test/quotation-contacts-http-test/quotation-contact-selection-test; entrada quotation-message-ui-test.mjs delega ao teste atual, pois a expectativa anterior de ausência de pré-seleção foi substituída pelo pedido do usuário. AGENTS/INTEGRACOES/spec/plano atualizados. Sem dependências ou migração.

**Integração:** coordenador deve revisar/integrar/publicar no Site existente. Cliente da ponte não muda: tarefas continuam whatsapp_quote/contact-v1. Não exige restart/pareamento/liberação de envio. Confirmar ambas as chaves desativadas e as mesmas sete tarefas reais blocked/attempts0 após publicação. Não usar o pedido real para preparar mensagens na validação. Esta worktree não alterou main, hospedagem, instalação ou dados reais.

---

# Histórico — agenda de contatos — 14/11/2026

Usuário aprovou implementar sincronização dos contatos conhecidos do WhatsApp e importação CSV/VCF para completar a agenda. Implementado na branch **codex/compras**, worktree Compras/porta **5185**. Base do trabalho: 0a6055979283d4973e9775eb0a037ffdbdb92e12; SHA final da entrega comunicado diretamente ao coordenador após commit. **Não publicado/instalado em produção por este chat.**

- Cotação → Agenda de contatos: fornecedores existentes e novos contatos gerais, busca por nome/empresa/telefone/categoria, filtros, páginas, cadastro/edição e classificação individual/em lote. Somente Master/ADM.
- CSV UTF-8/VCF 3/4: leitura no navegador, prévia, erros por linha/campo, limites de 5 MB / 5.000 números, lotes de 50, progresso e repetição segura. Importação não sobrescreve cadastros. Telefones não recebem nono dígito por inferência.
- WhatsApp: solicitação explícita, prévia e importação selecionada de conversas conhecidas operacional. Adaptador SQL readonly nas duas fontes nativas verificadas no OpenClaw 2026.10.10; extrai só identidade/nome/telefone, sem mensagens/anexos/transcrições/tokens. Cobertura limitada e avisos parciais visíveis. Conferir INTEGRACOES.md.
- Novos contatos entram sem classificação; só fornecedores com segmento e abrangência confirmados participam da seleção compatível atual. Material de manutenção continua buscando lojas de materiais/homecenter/utilidades; serviço procura prestador. Janela de cotação oferece selecionar todos os compatíveis (até 100 por lote) e limpar. Marcar/importar/classificar não prepara mensagens.
- API administrativa e protocolo contacts-v1 separados da fila comercial, HMAC, lease/páginas idempotentes, limites, versões e auditoria. Não exportar lease no snapshot. Deduplicação também nos caminhos legados de fornecedor e descoberta. Telefone alterado não redireciona tarefa antiga; running/uncertain impedem alteração. Sem dependências ou migrações novas.

## Validação

36/36 testes da rodada de regressão aprovados: contact-import, contact-sync (16 casos), contact-agenda, contact-agenda-ui, contact-runner, supplier-import, integration, openclaw, process-navigation, quotation-suppliers, workflow, finance-profile e maintenance-suppliers. HTTP  local 5185 aprovado: autenticação, perfis proibidos, origem/JSON/lotes, classificação, versão, duplicado por API legada, HMAC, sincronização fake/prévia/importação e ausência de novas tarefas/envios. Tipos, lint dos novos TS/TSX e build aprovados. Revisão independente encontrou2 achados P2 de validação (parser/nomes), ambos corrigidos e revalidados.

Navegador local: busca, prévia/status de cobertura parcial, cadastro e classificação de contato fictício conferidos; desktop e390 × 844 sem rolagem horizontal. Corrigidos conflito da classe supplier e contraste do tema escuro com tokens existentes. Evidências privadas fora do Git: outputs/agenda-desktop.jpg e outputs/agenda-mobile.jpg. **Limitação visual:** upload pelo seletor da extensão Chrome não concluído, pois Allow access to file URLs está desativado; parsers CSV/VCF, lotes/erros e escrita foram testados automaticamente e via HTTP. Não afirmar upload visual aprovado.

Nenhuma produção acessada/modificada para este recurso, nenhum contato real importado, ponte de produção iniciada/reiniciada ou mensagem enviada. As sete cotações reais e as duas chaves de envio não foram alteradas. FixtureHTTP confirmou envio local desativado e nenhuma tarefa comercial criada pelas ações da agenda. Dados do teste anterior CE-F18F1D55 permanecem históricos abaixo.

## Arquivos e integração

Novos: app/contact-model.ts, contact-import.ts, contact-agenda.tsx, contact-agenda-operations.tsx, contact-agenda.css; app/api/contacts/route.ts; lib/contact-agenda.ts, contact-sync.ts, contact-validation.ts; integrations/openclaw/contact-phone.mjs, contact-sync.mjs; seis scripts contact-* de teste e plano/spec. Compartilhados: app/dashboard.tsx, process-navigation.ts, quotation-message-form.tsx, api/data/route.ts; lib/integrations.ts, integration-endpoint.ts, supplier-import.ts; integrations/openclaw/client.mjs, runner.mjs; scripts/process-navigation-test.mjs; AGENTS.md e INTEGRACOES.md. Preservar trabalho simultâneo dos outros módulos ao integrar.

Coordenador deve revisar/integrar/publicar servidor no Site existente e atualizar módulos da ponte instalada; reiniciar a tarefa existente mantendo flags desativadas, journals/cofre, operacional e número exato +559292017107. Verificar agenda com Master/ADM, CSV/VCF e primeiro sync explícito; sem fonte/ponte atualizada mostrar pendência real. Não liberar sete cotações, reenviar teste anterior, confirmar equivalência ou selecionar compra. A ativação da sincronização não exige ativar envio. Sem main merge/push/publicação por este chat.

---

# Histórico — teste no pedido CE-F18F1D55 — 14/11/2026

## Autorização e resultado

O usuário escolheu a solicitação existente **CE-F18F1D55 — Material hidráulico para reposição** e esclareceu: registrar normalmente nesse pedido, usando apenas seu próprio número como lojista. Essa orientação posterior autoriza o registro no pedido escolhido e substitui, para esta nova etapa, o uso exclusivo do protocolo fictício anterior. As sete cotações destinadas a lojas reais devem continuar bloqueadas.

- Conferido o pedido: 4 registros para mictório, em Cotação local, aprovação da necessidade preservada e nenhuma proposta antes do teste.
- Realizado um único envio isolado pelo CLI oficial OpenClaw, conta `operacional`, para o contato confirmado do coordenador. Identificador do envio: `3EB0E4B6674700FC518642`. Nenhuma chave de envio foi alterada, nenhuma das sete tarefas foi liberada e nenhum serviço foi iniciado/reiniciado. O envio isolado não usou o despacho da fila bloqueada.
- Resposta `CE-F18F1D55 — TESTE LOJISTA` recebida em 14/11/2026 às **11:37:54 de Manaus**, identificador nativo `3EB09AA5FC65E6E5277189`; arquivo privado processado como `.json.done` pela ponte existente.
- Vínculo automático confirmado no painel: **Pedido CE-F18F1D55** e **Fornecedor TESTE — Loja do Coordenador — NÃO COMPRAR**, pelo protocolo no texto e telefone cadastrado. Não foi necessário cadastrar outro contato ou alterar a categoria do fornecedor.
- Proposta registrada no próprio **CE-F18F1D55**: 4 × R$ 50,00 = R$ 200,00; frete R$ 20,00; total **R$ 220,00**; outras despesas zero, conferidas pela composição do total; Pix à vista; entrega literal de **5 dias úteis**, preservada nas condições; validade de sete dias desde o recebimento, até 21/11/2026.
- A resposta informa marca/modelo e estoque fictícios e diz expressamente **compatibilidade não confirmada**. Aplicada a regra normal do cadastro: equivalência técnica não confirmada e proposta pendente para comparação/seleção. Garantia, nota fiscal e regularidade não foram presumidas. Não foi selecionada proposta para execução nem registrado pedido de compra ou pagamento.
- Nova mensagem marcada como **Conferida**, com autoria Master, valores, referência à proposta no pedido, identificadores nativos e pendência técnica registrada na nota. As outras mensagens recebidas não foram conferidas por esta operação.
- Inspeção visual final: as sete tarefas de lojas reais permanecem com **Envio desativado** e o servidor continua indicando envio desativado. Aprovação, itens, solicitação, competência e históricos anteriores foram preservados; não houve arquivamento/reanálise do pedido.
- Após o usuário avisar que respondeu, uma leitura final da inbox localizou a mesma mensagem de 11:37:54, sem resposta posterior desse contato com o protocolo naquele momento.

Evidências privadas fora do Git: `outputs/whatsapp-import/ce-f18f1d55-cotacao-registrada.jpg` e `outputs/whatsapp-import/ce-f18f1d55-conferencia-concluida.jpg`. Telefone pessoal, conteúdo privado da inbox e credenciais não foram copiados para o repositório. As restrições do sandbox exigiram execução autorizada do CLI e leitura da mensagem de teste fora do sandbox; nenhum bloqueio de aprovação foi contornado.

Entrega somente documental: `docs/modulos/compras/ENTREGA.md`, branch `codex/compras`, base `ade6c163bca72638486680f6fdc1e5ff3874d705`. SHA final informado ao coordenador. Sem mudanças de código, migrações, dependências ou publicação necessária; validação operacional pela UI e recibos nativos. Preservar a proposta de teste registrada no pedido a pedido do usuário; não repetir envio, liberar as sete tarefas ou confirmar equivalência sem informação técnica.

---

# Histórico — teste de conferência e registro da cotação em pedido fictício — 14/11/2026

## Escopo autorizado e resultado

Após validar a importação, o usuário autorizou testar a conferência da resposta e o registro da cotação, usando somente seu contato e mantendo as sete cotações reais bloqueadas. Executado pelo painel autenticado como Master, sem mudança de funcionalidades, permissões, configuração de envio, serviços ou publicação.

- Criada a solicitação **exclusivamente fictícia CE-A53B0E94**, título `TESTE WA — conferência e cotação — 14/11/2026`, com 4 registros para mictório fictícios, marca Teste T1, e categoria exclusiva `TESTE COTAÇÃO COORDENADOR`.
- Criado somente o fornecedor `TESTE — Loja do Coordenador — NÃO COMPRAR`, nessa categoria exclusiva e com o telefone previamente confirmado pelo próprio usuário. O telefone pessoal não é versionado nesta entrega.
- Preparação administrativa pelo fluxo disponível: formulário, referência manual explicitamente fictícia, conferência administrativa e decisão de necessidade de teste pelo Master. A abertura da pesquisa necessária para disponibilizar o registro manual gerou uma pesquisa do item fictício; houve retorno para revisão, sem substituir a estimativa manual já salva. Não foi preparada mensagem de cotação nem acionado envio pelo WhatsApp nesta etapa.
- Conferidos os dados da resposta `TESTE-WA-20261114-IMPORTACAO`: 4 × R$ 50,00 = R$ 200,00; frete R$ 20,00; total **R$ 220,00**; 4 unidades disponíveis; Pix à vista; prazo literal **5 dias úteis**; validade de 7 dias desde 14/11, registrada até 21/11/2026.
- Proposta salva no pedido fictício, exclusivamente para o fornecedor de teste. O comparativo exibiu BRL 220,00, cobertura de 4 unidades a BRL 50,00, subtotal BRL 200,00 e frete BRL 20,00. Nenhuma proposta registrada no pedido real CE-F18F1D55.
- A resposta importada foi marcada como **Conferida** com autoria Master e nota de conferência referenciando o protocolo fictício, o fornecedor e os valores. Como chegou antes dos cadastros, os IDs de vínculo automático permanecem não identificados; a referência manual ficou documentada na nota e no campo Documento / anexo / referência da proposta. Não foi alterada essa lógica do sistema.
- Conferência visual final: as mesmas sete tarefas de CE-F18F1D55 permanecem com **Envio desativado**, e o painel informa envio do servidor desativado. Nenhuma liberação, cancelamento, reenvio ou nova tarefa de WhatsApp foi acionada.

## Limites e estado preservado

O campo numérico de entrega aceita somente um número de dias, sem unidade útil/corrida. Foi registrado 5, preservando expressamente **5 DIAS ÚTEIS, sem conversão para dias corridos** nas condições e ressalvas. Não foram inventadas garantia, nota fiscal, regularidade ou disponibilidade imediata; campos sem informação permaneceram não informados. Outras despesas de zero foram conferidas pela igualdade do total informado com itens mais frete.

Não foi acionado **Selecionar para execução**, nem registrado pedido de compra, execução, nota, pagamento ou recebimento. A quantidade mínima configurada de três propostas não foi alterada. A solicitação e o fornecedor fictícios permanecem identificados para consulta do teste; não foram arquivados/excluídos. A categoria exclusiva evita compatibilidade desse contato com materiais dos pedidos reais.

Evidências privadas, fora do Git: `outputs/whatsapp-import/cotacao-teste-registrada.png` (proposta e cobertura) e `outputs/whatsapp-import/conferencia-teste-concluida.png` (nota de conferência e sete bloqueios). A verificação desta etapa foi operacional pela UI; não houve alteração de código que exigisse repetir build ou testes automatizados.

- Branch: `codex/compras`; base desta etapa: `1a6ca82a09c75e5edeeb2552e84f17f876f6ab40`.
- Arquivo versionado nesta etapa: somente este registro. SHA final informado na resposta/aviso ao coordenador.
- Sem migrações, dependências, contratos compartilhados novos ou publicação necessária. Coordenador deve integrar apenas a documentação e preservar os dados fictícios para conferência, sem repetir teste ou habilitar envio.

---

# Histórico — importação de respostas WhatsApp — 14/11/2026

## Falha, causa e correção aplicada

O teste autorizado chegou ao WhatsApp operacional e recebeu resposta, mas não gerou arquivo na inbox nem registro no CEEA Manager. O hook `estrelas-compras` estava instalado e habilitado. O plugin WhatsApp instalado exige também `channels.whatsapp.accounts.operacional.pluginHooks.messageReceived=true`; a opção estava ausente e seu padrão é `false`.

Diagnóstico confirmado no código instalado (`shouldEmitWhatsAppMessageReceivedHooks`/`emitWhatsAppMessageReceivedHooksIfEnabled`) e na configuração privada. O dispatch do canal suprime a emissão genérica duplicada, portanto a habilitação do hook por si só não produz os eventos.

Aplicada pelo CLI oficial **somente** a opção da conta operacional. O gateway registrou `config hot reload applied (channels.whatsapp.accounts.operacional.pluginHooks)` às 10:19:51 de 14/11/2026 em Manaus. Não houve reinício do gateway, início/reinício da ponte, publicação, alteração das chaves de envio, políticas do canal, modelos, credenciais ou contas. O número escolar permanece +55 92 9201-7107. A opção global e a da conta pessoal permanecem ausentes; a conta pessoal não foi usada como origem de envio.

**Não foi necessário alterar código da aplicação/hook/runner.** Esta entrega versiona a configuração obrigatória e o procedimento de validação, sem guardar configuração privada, telefone pessoal, credenciais ou conteúdo da resposta no Git.

- Branch: `codex/compras`; base: `c6331f8e80aadc687c39d4e7fcfbde504e812b62`.
- SHA desta entrega: informado na resposta e ao coordenador; este arquivo integra o próprio commit.
- Arquivos: `INTEGRACOES.md`, este registro e `docs/superpowers/plans/2026-11-14-importacao-whatsapp.md`.
- Sem migração, dependência, API/contrato, mudança de permissões ou build/publicação do Site.

## Evidências e validação

- Antes: evento de entrada confirmado nos logs do canal e resposta visível no WhatsApp; pasta de entrada da ponte vazia; `messageReceived` ausente.
- Depois: novo teste isolado, autorizado pelo usuário, com marcador `TESTE-WA-20261114-IMPORTACAO`; envio pela conta operacional e retorno fictício do contato confirmado.
- A resposta entrou no hook com identificador nativo, conta operacional e destino escolar correto. O arquivo privado passou a `.json.done`: a ponte existente recebeu confirmação de sucesso do endpoint do CEEA Manager. Recebimento em 14/11/2026 às 10:21:06 (Manaus).
- `node --test scripts/openclaw-test.mjs scripts/agent-routing-test.mjs`: **PASS, 17 testes**, incluindo conta/número, rejeição de grupos/datas inválidas, journal idempotente e ausência de chamada de envio quando desativado.
- `node scripts/integration-test.mjs`: **PASS**, D1 temporário isolado; recebimento idempotente, nenhuma proposta automática, ambas as chaves de envio e resultados incertos preservados.
- Inspeção após o teste: captura operacional `true`; opções global/pessoal ausentes; launcher da ponte continua com `ESTRELAS_ENABLE_SEND=false`; tarefa já existente continua em execução.
- Conferência independente pelo coordenador no banco de produção: mensagem de teste em `review` (**Conferir**), conta operacional, sem `requestId`/`supplierId`; sete cotações bloqueadas, zero tentativas e nenhuma confirmação de envio. `WHATSAPP_SEND_ENABLED=false` confirmado em produção. Essa leitura complementa o `.done`; não houve login nem inspeção visual do painel nesta etapa.
- Conferência visual adicional após o usuário entrar como Master: **Cotação → Agente WhatsApp** mostra as sete cotações com **Envio desativado**, envio do servidor desativado e a resposta de teste em **Conferência pendente**. Ao expandir o registro, o texto fictício está completo, pedido/fornecedor não identificados e nenhum resultado de conferência preenchido. Nenhuma proposta foi registrada e **Marcar como conferida** não foi acionado. Captura privada em `outputs/whatsapp-import/painel-validado.png`, fora do Git.

O teste não contém protocolo de solicitação real nem cria cadastro de loja fictícia. A mensagem deve ficar em **Mensagens recebidas para conferência**, sem vínculo automático ou proposta. Não associar os valores fictícios ao pedido real. Não foi acionado preparo, liberação, cancelamento, seleção ou reenvio das sete cotações reais.

## Orientação ao coordenador

### Conferência concluída pelo coordenador — 14/11/2026

Consulta exclusivamente de leitura ao D1 e às variáveis de execução pelo conector Sites, sem operar a interface autenticada ou a ponte:

- O registro com marcador `TESTE-WA-20261114-IMPORTACAO` existe em `integration_inbox`, estado `review` (para conferência), conta `operacional`, destinado ao número escolar exato. Recebido às **10:21:06** e registrado às **10:21:11**, em Manaus. `requestId` e `supplierId` ausentes: sem vínculo com solicitação ou fornecedor.
- As sete tarefas de cotação verificadas estão em `blocked` (Envio desativado), todas com `attempts=0`, sem `providerMessageId` e sem `sentAt`.
- A variável de produção `WHATSAPP_SEND_ENABLED` permanece `false`, revisão de ambiente 1. O launcher versionado mantém `ESTRELAS_ENABLE_SEND=false`.
- Nenhum novo envio/teste, liberação, cancelamento, reprocessamento, vínculo ou alteração de produção foi feito nesta conferência. Gateway e ponte não foram iniciados/reiniciados. Não houve publicação, migração ou incremento da versão da aplicação.

A pendência de confirmação de existência e estado foi encerrada por leitura do banco pelo coordenador. A inspeção visual adicional posterior, feita no chat de Compras após o login do usuário, está registrada nas evidências acima. A mensagem fictícia permanece para análise humana e não deve virar proposta ou vínculo real. Revisão documental independente aprovada; escopo integrado somente no Git.

Revisar/integrar a documentação desta branch. A configuração local já foi corrigida e validada pela importação e leitura independente de produção; **não repetir o envio**, não reinstalar/reiniciar a ponte e não publicar apenas para aplicar esta opção. Preservar as sete tarefas com envio desativado. Em outra instalação, aplicar a opção somente na conta operacional, conforme `INTEGRACOES.md`, mantendo as duas chaves de envio em `false`. Eventos anteriores não são retroimportados automaticamente.

---

# Histórico — distinguir material de manutenção de serviço — 13/11/2026

## Problema e resultado

O usuário mostrou que a compra de **registro para mictório**, com categoria ampla Manutenção, listava empresas de manutenção predial em vez de lojas de materiais de construção, hidráulica, homecenter e utilidades. A causa era a correspondência literal da categoria tanto no catálogo quanto na descoberta/fila.

A compatibilidade agora deriva um segmento de fornecimento sem regravar o pedido. Categorias explícitas de material ou serviço prevalecem. Somente na família ampla Manutenção, descrições objetivas de produto (como registro/torneira) e de serviço (instalação/conserto/mão de obra) ajudam a distinguir o que será cotado. Material procura varejo de construção, hidráulica, ferragens, homecenter e utilidades; prestador cadastrado apenas como Manutenção não é vendedor de materiais por padrão. Empresa com categorias explícitas de materiais e serviços pode atender aos dois. Prestador hidráulico com indicação de serviço continua disponível para instalação hidráulica.

A mesma regra alimenta checkboxes, preparação singular/múltipla, descoberta interna/web, registro de fontes conferidas e elegibilidade antes da retirada da tarefa. Cadastro de prestador não suprime pesquisa de lojas; buscas incluem descrição do material e termos de venda/varejo. Tarefas `queued` antigas que não correspondam ao segmento atual são canceladas com auditoria no polling; nenhum registro é apagado e não há reenvio de mensagens concluídas/incertas.

- Branch: `codex/compras`; worktree exclusiva `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\compras`; porta `5185`.
- Base: `56860b1db3abda221682321350a23a2efe67ebb3` (seleção múltipla/modelo genérico, entregue anteriormente).
- SHA final desta correção: informado na resposta e no aviso ao coordenador; conferir com `git log -1 --format=%H`. Este arquivo integra o próprio commit.

## Arquivos compartilhados e contratos

- `app/supplier-discovery.ts`: regras de segmentos relacionados de manutenção; novas funções `supplierCategoryForItem`, `requestSupplierCategories`, `supplierSearchTerms`; sugestões de categorias específicas; compatibilidade por item. `requestCategories` continua disponível com o comportamento original. Correspondência das demais categorias permanece normalizada e exata.
- `lib/integrations.ts`: descoberta, elegibilidade, consulta contextual e rechecagem interna usam o mesmo segmento; contatos incompatíveis não são preparados/retirados nem pelo contrato singular anterior.
- `app/supplier-discovery-panel.tsx`: mostra o segmento procurado, busca manual no Maps contextual e confirmação explícita do segmento ao cadastrar fonte; abre conferência de categorias quando a intenção está ambígua.
- `app/quotation-message-form.tsx`: explica material/serviço, varejo compatível e ambiguidade na seleção.
- Novos `scripts/maintenance-suppliers-test.mjs` e `scripts/maintenance-suppliers-http-test.mjs`.
- `scripts/quotation-suppliers-test.mjs`, `scripts/quotation-message-ui-test.mjs`: fixtures agora representam lojas para material, incluindo um prestador que não deve aparecer.
- `AGENTS.md`, `FORMULARIOS-E-CONTROLES.md`, `INTEGRACOES.md` e este registro: orientação vigente e entrega.

Não há migração, nova dependência, variável ou mudança de autenticação/modelos/credenciais/conta/número/DB/R2/domínio. Não há mudança de rota ou formato de `IntegrationJob`; o significado de `category` em descoberta passa a ser o segmento de fornecimento derivado, usado consistentemente pela API/painel. O cadastro conferido de nova fonte utiliza esse segmento, preservando a categoria original do item. Contrato relevante para o coordenador: a função compartilhada `matchingSuppliers` reconhece os segmentos relacionados de materiais de manutenção e serviços, enquanto outras categorias mantêm a comparação anterior. Conciliar eventuais consumidores dos outros módulos antes de integrar.

## Testes executados e resultados reais

Todos os comandos usaram workdir explícito nesta worktree, sem pesquisa ou envio real.

- `node scripts/maintenance-suppliers-test.mjs`: primeiro **falhou como esperado**, retornando o prestador e omitindo lojas; após a correção, **PASS**. Abrange lojas de construção/homecenter/utilidades/hidráulica, fornecedor misto, categorias explícitas prioritárias, serviço hidráulico especializado, categoria ausente/ambígua, pedido intacto, busca de lojas apesar de prestador no cadastro, tarefas genéricas/incompatíveis antigas e cadastro nacional de fonte fictícia no segmento material.
- `node scripts/maintenance-suppliers-http-test.mjs`: **PASS em 127.0.0.1:5185**. API autenticada local aceitou três lojas para registro/material, recusou prestador no contrato singular e múltiplo, aceitou prestador para instalação e recusou loja nesse serviço. Categoria original Manutenção preservada; tarefas bloqueadas por envio desativado. Pedidos fictícios arquivados ao final, sem excluir registros.
- `node scripts/quotation-suppliers-http-test.mjs`: **PASS** na mesma porta local, mantendo aprovação, permissões, versão, arquivo, idempotência e seleção múltipla.
- **PASS** em `supplier-discovery-test.mjs`, `quotation-suppliers-test.mjs`, `quotation-message-ui-test.mjs`, `integration-test.mjs`, `request-sections-test.mjs`, `finance-profile-test.mjs` e `quote-comparison-test.mjs` (9 testes).
- `node --test scripts/openclaw-test.mjs scripts/agent-routing-test.mjs`: **PASS, 17 testes**, com transporte simulado.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `npm.cmd run build` e `git diff --check`: **PASS**.
- Revisão independente encontrou três casos de precedência/fornecedor misto/hidráulica; foram reproduzidos em regressões com falha, corrigidos e retestados. Rechecagem final: **aprovada, sem regressões diretamente relacionadas**.
- Navegador em 127.0.0.1:5185, fixture React com dados fictícios: a cotação de Registro para mictório apresentou as duas lojas compatíveis de construção/homecenter, omitindo o prestador presente na fixture e preservando um único modelo genérico. Captura em `outputs/quotation-message-ui/materiais-sem-prestadores.png`, fora do Git.

## Limitações, configuração e próximos passos

As regras são determinísticas e limitadas aos segmentos de manutenção descritos; não constituem classificação universal por IA nem comprovam estoque, equivalência técnica ou atendimento integral. Sem categoria ou com intenção não identificável, é necessária conferência administrativa. Nenhum cadastro ou pedido real foi reclassificado, e nenhuma tarefa de produção foi alterada neste chat. O polling em produção aplicará a elegibilidade atual após a publicação; fontes antigas permanecem consultáveis, mas não podem cadastrar fornecedor se já não corresponderem ao segmento atual.

Sem configuração/migração a aplicar. Não iniciar pesquisas reais, reativar conta default, alterar modelos/chaves de envio ou reiniciar a ponte para testar. O coordinator continua responsável pelas pesquisas; operacional pelo WhatsApp, número exato +55 92 9201-7107. A alteração não habilita envio.

O coordenador deve revisar o diff/contratos, integrar e publicar pelo Sites existente. Verificar localmente com envio desativado: item categoria Manutenção/descrição Registro para mictório → lojas de materiais; Serviço de instalação → prestadores; categoria explícita → prioridade da classificação; conferir ausência de alteração automática dos itens originais. Rodar os dois novos testes e os de fornecedores/seleção. Mensagens reais não são necessárias para essa validação.

---

# Histórico — fornecedores por checkbox e modelo genérico — 13/11/2026

Commit anterior: `56860b1db3abda221682321350a23a2efe67ebb3`. Para a entrega atual, prevalece a seção acima.

## Pedido e comportamento resultante

O usuário solicitou que **Fornecedor**, na janela **Preparar mensagem de cotação**, liste todos os fornecedores compatíveis com o material em checkboxes. Esclareceu que a mensagem preparada deve ser um único modelo genérico, personalizado pelo OpenClaw ao despachar para cada contato.

O seletor único foi substituído por `QuotationMessageForm`: todos os fornecedores cadastrados com categoria compatível aparecem, ordenados por nome, inicialmente desmarcados, com telefone, abrangência e itens relacionados. A correspondência reaproveita `matchingSuppliers` (categoria exata após normalizar caixa, acentos e espaços; várias categorias separadas por vírgula/ponto e vírgula). Em `quoting`, somente locais; em `national`, locais e nacionais, preservando a elegibilidade anterior. Itens sem categoria não recebem classificação inferida; fontes externas exigem conferência/cadastro. Compatibilidade por categoria não garante estoque/equivalência ou atendimento integral.

Há um único modelo genérico da solicitação aprovada, com `{{contato}}`. No despacho, a ponte substitui o primeiro marcador pelo contato/nome cadastrado que foi registrado na tarefa. É personalização determinística do cumprimento, sem reescrita livre por IA ou mudança de modelo/credencial. O conteúdo dos itens, quantidades, prazo e condições permanece literal. O pedido e seus históricos não são regravados por essa preparação.

**Mudança de comportamento importante:** o botão **Preparar cotações no OpenClaw** passa a preparar tarefas na fila existente para os contatos explicitamente marcados (até 100 por vez). Selecionar checkboxes ou copiar o modelo não prepara nem envia. Com ambas as chaves já habilitadas, a ponte pode processar a fila; com envio desativado, as tarefas ficam bloqueadas. Não foi habilitada nenhuma chave nesta entrega. A confirmação visual informa preparação, não envio. Repetir a preparação mantém a idempotência existente por pedido/telefone.

- Branch: `codex/compras`; worktree `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\compras`; porta `5185`.
- Base: `1077b8b5390074d6be25852d1ba0375505ecf521` (Cotação colapsável e ícones).
- SHA final: informado na resposta e no aviso ao coordenador; este arquivo integra o próprio commit. Conferir com `git log -1 --format=%H`.

## Arquivos compartilhados, contratos e implantação

- Novo `app/quotation-message-form.tsx`; `app/dashboard.tsx` passa fornecedores, estado de gravação, erro e callback de preparação ao componente e remove o formulário antigo de destinatário único.
- `app/supplier-discovery.ts`: função aditiva `compatibleQuotationSuppliers`, usada tanto na apresentação quanto na validação do lote.
- `app/api/data/route.ts`: `prepare_openclaw` aceita `supplierIds` (1–100 UUIDs únicos); mantém o contrato legado `supplierId`. Master/ADM, aprovação, etapa, versão, arquivamento e fechamento mensal continuam protegidos pelos controles existentes.
- `lib/integrations.ts`: valida toda a seleção e os telefones antes de iniciar a preparação, reaproveita a fila/idempotência e registra o modelo genérico e o contato em tarefas novas. Falha operacional no meio da gravação pode deixar tarefas já preparadas; a repetição usa a idempotência existente e não reenfileira envios incertos.
- `app/integration-model.ts`: novo campo opcional `quotationTemplate: {version: 'contact-v1', text: string, contact: string}` em `IntegrationJob`.
- `app/model.ts`: exportação aditiva `quotationMessageTemplate`; `quotationMessage(request, supplier)` mantém assinatura e texto personalizado anterior.
- Novo `integrations/openclaw/quotation-template.mjs`; `integrations/openclaw/client.mjs` personaliza no despacho. Mensagens antigas sem template mantêm `message`. Tarefas novas também mantêm `message` já endereçado para compatibilidade com pontes anteriores, sem marcador no cumprimento.
- `app/redesign.css`: regras específicas da lista de fornecedores e dimensões dos checkboxes; sem mudança dos demais controles.
- Novos testes: `scripts/quotation-suppliers-test.mjs`, `scripts/quotation-message-ui-test.mjs`, `scripts/quotation-suppliers-http-test.mjs`.
- `FORMULARIOS-E-CONTROLES.md`, `INTEGRACOES.md` e este arquivo: uso, contratos e entrega.

Sem dependências, migrações, novas rotas, configuração ou segredo a aplicar. Conta `operacional`, número exato +55 92 9201-7107, conta `default` desativada, provedores/modelos, DB/R2/domínio, chaves de envio, lease, journal e idempotencyKey preservados. O coordenador deve conciliar alterações nos arquivos compartilhados e revisar o comportamento do novo botão antes de publicar. Atualizar o código da ponte para personalização no despacho, sem limpar journals ou reenviar tarefas; a ponte anterior continua recebendo `message` completo como fallback. O chat de Compras não reiniciou nem iniciou a ponte de produção.

## Verificações executadas e resultados

Todos os comandos usaram workdir explícito desta worktree.

- Antes da implementação, `node scripts/quotation-suppliers-test.mjs`: **falha esperada**, pela ausência da seleção de todos os fornecedores compatíveis.
- `node scripts/quotation-suppliers-test.mjs`: **PASS**. Categorias normalizadas, todos os locais compatíveis, etapa nacional, aprovação/arquivo, categorias ausentes, validação do lote antes de preparar, duas tarefas sem duplicação, modelo único, contato individual no despacho, marcador literal na especificação preservado, fallback legado e bloqueio de envio. D1 temporário e transporte completamente simulado.
- `node scripts/quotation-message-ui-test.mjs`: **PASS**. Checkboxes, ausência de seleção automática, um único textarea genérico e controle de etapas; gera fixture React interativa em `outputs/quotation-message-ui/` (ignorado).
- `node scripts/quotation-suppliers-http-test.mjs`: **PASS em http://127.0.0.1:5185**. Fluxo autenticado local com usuários fictícios: negativa para Setor/DG e antes da aprovação, incompatibilidade/nacional na etapa local, lista inválida sem preparação parcial, duas tarefas bloqueadas, repetição idempotente, versão, preservação de itens/aprovação e bloqueio de arquivado. O teste confirmou envio local desativado antes de criar dados.
- `node scripts/integration-test.mjs`: **PASS**, D1 isolado, duas chaves, assinaturas, concorrência, prazo, envios incertos e idempotência.
- `node --test scripts/openclaw-test.mjs scripts/agent-routing-test.mjs`: **PASS, 17 testes**. Nenhum transporte real.
- `node scripts/supplier-discovery-test.mjs`, `node scripts/quote-comparison-test.mjs` (9 testes), `node scripts/request-sections-test.mjs` e `node scripts/finance-profile-test.mjs`: **PASS**.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `npm.cmd run build` e `git diff --check`: **PASS**.
- Navegador: fixture React dos componentes reais, dados fictícios e callback de preparação simulado, servida somente em 127.0.0.1:5185. Duas seleções mudaram o contador de 0→1→2, mantendo um único modelo; confirmação simulada recebeu os dois IDs. Alinhamento dos checkboxes corrigido e conferido. Captura local `outputs/quotation-message-ui/fornecedores-modelo.png`, fora do Git. Servidores temporários encerrados após os testes.
- Revisão independente de código, somente leitura: **aprovada, sem achados acionáveis**. Conferiu guards, compatibilidade, idempotência, snapshot/template e fallback legado; teste em memória também confirmou substituição apenas do primeiro marcador e rejeição de versão desconhecida.

Nenhuma pesquisa ou mensagem real foi executada. O teste HTTP criou apenas usuários/fornecedores/solicitação/tarefas fictícios na base local; a solicitação de teste foi arquivada e os registros preservados. Não houve cópia de banco/segredo/anexo da pasta principal nem alteração de dados de produção. O envio real e a atualização da ponte de produção não foram testados.

## Pendências e passos para o coordenador

Sem pendência de implementação neste escopo. Revisar/integrar a branch e publicar no Site existente conforme COORDENACAO.md; operação de produção permanece com o coordenador.

Para verificar localmente, usar servidor em 127.0.0.1:5185, envio desativado e solicitação fictícia aprovada na etapa de cotação. Abrir Cotação → Preparar mensagem; conferir lista por categoria, marcar dois fornecedores e observar um único modelo. Confirmar a preparação e conferir duas tarefas bloqueadas em Agente WhatsApp; repetir sem duplicar. Testar também item sem categoria, fornecedor incompatível, limite da etapa nacional e bloqueios de perfil/arquivo/mês. Não realizar envios reais para validar a interface ou o modelo. A personalização da ponte pode ser conferida por `quotation-suppliers-test.mjs`, que usa transporte falso.

---

# Histórico — Cotação colapsável e ícones — 13/11/2026

Commit anterior: `1077b8b5390074d6be25852d1ba0375505ecf521`. Para a entrega atual, prevalece a seção acima.

## Escopo e resultado

O usuário solicitou um bloco colapsável de Cotação nos detalhes da solicitação e ícones padronizados nos cabeçalhos, pois apenas Formulário Orçamentário tinha ícone.

O novo componente `RequestQuotationPanel` reúne as ações existentes Registrar cotação/Preparar mensagem, comparativo e histórico de versões das propostas. É inserido no painel após a decisão da DG e antes de Execução; o painel legado também recebe o conteúdo. O bloco abre por padrão em `quoting`/`national` quando ativo. Fora dessas etapas permanece consultável e, sem propostas, explica a separação entre propostas comerciais e estimativas. Setor não recebe o bloco. Ações continuam restritas a Master/ADM, etapa compatível e pedido ativo; Financeiro e arquivados mantêm consulta, e versões antigas nunca oferecem seleção.

Os cabeçalhos de formulário, conferência, estimativas, cotação, execução, prestação de contas, históricos, fontes, categorias e detalhes de propostas usam ícones da biblioteca Lucide já instalada, com 16 px e espaçamento de 8 px. Não foram criadas novas regras de compra, APIs ou contatos externos. A decisão da DG continua sendo sobre necessidade e escopo.

- Branch: `codex/compras`; worktree exclusiva `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\compras`; porta `5185`.
- Base: `7a9a9dd7fade1e41c9343db5a7a62bb8d91abee7`, correção anterior do prazo já enviada.
- SHA final: informado na resposta do chat; conferir com `git log -1 --format=%H`. Este arquivo integra o próprio commit.

## Arquivos compartilhados e contratos

- Novo: `app/request-quotation-panel.tsx`, composição visual das ações/comparativo/histórico existentes.
- `app/dashboard.tsx`: passa o bloco pelo novo encaixe `quotations` de `BudgetRecordPanel`; remove o conteúdo avulso duplicado.
- `app/budget-record-panel.tsx`: encaixe opcional `quotations`, inclusive no legado; ícones nos cabeçalhos.
- `app/workflow-panel.tsx`, `app/estimate-criteria-panel.tsx`, `app/supplier-discovery-panel.tsx`: ícones em estimativas, critérios e consulta de fornecedores.
- `app/quote-commercial-fields.tsx`: ícones nos detalhes das propostas, reaproveitando a mesma comparação/seleção.
- `app/request-history.tsx`, `app/request-archive-details.tsx`: ícones nos históricos e informações preservadas.
- `app/redesign.css`: alinhamento/espaçamento dos ícones limitado aos cabeçalhos colapsáveis do detalhe de solicitação.
- Novo: `scripts/request-sections-test.mjs`, regressão de renderização/ordem/ícones e consulta por perfil/arquivamento; gera fixture visual fictícia em `outputs/request-sections/` (ignorado).
- `scripts/general-return-ui-test.mjs`, `scripts/request-form-layout-test.mjs`: expectativas de cabeçalhos atualizadas para admitir ícones, mantendo as verificações de ordem e comportamento.
- `FORMULARIOS-E-CONTROLES.md` e este arquivo: orientação e entrega.

O único contrato de componente ampliado é a propriedade opcional `quotations?: ReactNode` do painel; nenhum contrato de dados/API foi alterado. Sem migrações, configurações, segredos, dependências ou alteração de modelos, rotas, autenticação, menu ou permissões. O coordenador deve conciliar alterações concorrentes nos componentes e no CSS compartilhado antes de integrar.

## Verificações e resultados reais

Todos os comandos foram executados com workdir explícito nesta worktree.

- Regressão antes da implementação: `node scripts/request-sections-test.mjs` **falhou como esperado**, pela ausência de Cotação depois da decisão e antes da execução.
- Após a implementação, **PASS** nas oito suítes: `request-sections-test.mjs`, `general-return-ui-test.mjs`, `request-form-layout-test.mjs`, `redesign-styles-test.mjs`, `estimate-criteria-ui-test.mjs`, `quote-comparison-test.mjs` (9 testes), `budget-flow-test.mjs` e `finance-profile-test.mjs`. As duas últimas preservam decisões estruturadas e Financeiro somente após aprovação, sem gravações indevidas. Testes usam dados fictícios e, quando necessário, D1/R2 temporários isolados.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **PASS**.
- `npm.cmd run build`: **PASS**.
- `git diff --check`: **PASS**.
- Revisão conforme `react-best-practices`: componentes no escopo do módulo, sem efeitos/fetches novos; cabeçalhos nativos `details/summary`, ícones decorativos, callbacks e bloqueios de perfil/etapa/arquivamento preservados.
- Verificação visual no navegador em `http://127.0.0.1:5185/ui-check.html`: fixture gerada com os componentes reais e estilos do projeto, dados fictícios e sem autenticação/produção. Cotação foi observada aberta com ações/comparativo; ao recolher, o conteúdo deixou de aparecer. Ícones e alinhamento dos sete cabeçalhos visíveis conferidos. Captura local em `outputs/request-sections/cotacao-icones.png`, fora do Git. Servidor temporário de arquivos, sem ponte ou processamento de pesquisas.

Limite: a checagem visual usa HTML renderizado dos componentes e interação nativa dos colapsáveis, não um fluxo autenticado completo do aplicativo. Não houve envio de mensagens, pesquisa externa, dados reais, migração ou publicação. As abas de produção não foram operadas.

## Pendências e verificação pelo coordenador

Sem pendência de implementação neste escopo. Revisar o SHA/branch informados, conciliar os arquivos compartilhados e publicar somente pelo fluxo do coordenador.

Para conferir localmente: executar `node scripts/request-sections-test.mjs` para gerar a fixture ou iniciar o aplicativo em `http://127.0.0.1:5185` com dados fictícios. Abrir solicitação ativa em Cotação e conferir a ordem Formulário → Conferência → Estimativas → decisão da DG (quando aplicável) → Cotação → Execução → Prestação de contas. Recolher/expandir Cotação e verificar ações, comparativo e histórico. Conferir ausência de ações no Financeiro/arquivados e ausência do bloco para Setor. Não usar pesquisas/envios reais para validar a organização visual.

---

# Histórico — remoção do prazo da decisão — 13/11/2026

Commit da entrega anterior: `7a9a9dd7fade1e41c9343db5a7a62bb8d91abee7`. Para a entrega atual, prevalece a seção acima.

## Escopo e comportamento resultante

O usuário relatou que não conseguia apagar os segmentos da data no campo **Prazo pertinente à decisão** e solicitou remover o campo. O controle nativo de data parcialmente preenchido bloqueava o envio por validação do navegador, mesmo sendo opcional.

O campo foi retirado da aprovação integral, aprovação parcial, medida provisória e rejeição. Somente **Adiar** mantém **Data prevista para reavaliar a solicitação**, obrigatória conforme a regra vigente. Ao mudar de Adiar para outra decisão, o controle é desmontado e deixa de participar da validação e do FormData. Não foi incluído botão para limpar a data.

Datas de decisões anteriores continuam consultáveis. API, contrato de armazenamento, permissões, validações do servidor, competência, histórico e fluxo de solicitação única permanecem preservados.

- Branch: `codex/compras`.
- Worktree: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\compras`.
- Porta reservada: `5185`.
- Base desta correção: `b30ce17282a4769db5995ec127a46129f5ff579f` (entrega documental anterior, já enviada).
- SHA final da correção: informado na resposta do chat; este arquivo integra o próprio commit. Conferir com `git log -1 --format=%H`.

## Arquivos alterados e dependências

- `app/budget-record-panel.tsx`: componente compartilhado do painel de Compras; exibe o controle de data somente no adiamento e ajusta a ajuda de competência para referir-se à solicitação.
- `scripts/general-return-ui-test.mjs`: regressão no HTML renderizado da aprovação, garantindo ausência do campo de prazo.
- `scripts/budget-flow-test.mjs`: mantém verificação de adiamento com data e acrescenta rejeição de adiamento sem data.
- `FORMULARIOS-E-CONTROLES.md`: descrição atual da remoção do campo e preservação das datas históricas.
- `docs/modulos/compras/ENTREGA.md`: registro desta correção; entrega anterior preservada abaixo como histórico.

Sem dependências novas, migrações, configurações, segredos, mudanças de modelos, estilos, menu ou rotas. Sem contratos novos com outros módulos. O coordenador deve conciliar eventuais mudanças concorrentes no painel/documentação.

## Testes executados e resultados reais

Todos os comandos usaram workdir explícito desta worktree, sem servidor ou ponte de produção.

- Antes da alteração, `node scripts/general-return-ui-test.mjs` **falhou como esperado**: “aprovar a necessidade não deve apresentar campo de prazo”, comprovando a presença do controle no HTML renderizado.
- Após a alteração, `node scripts/general-return-ui-test.mjs`: **PASS**.
- `node scripts/budget-flow-test.mjs`: **PASS**, incluindo obrigatoriedade da data apenas no adiamento e decisões estruturadas existentes.
- `node scripts/single-request-test.mjs`: **PASS**, com dados fictícios e D1 temporário isolado; protocolo único, reapresentação, novas aprovações, privacidade dos snapshots e incorporação idempotente de cópia legada com anexo preservado.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **PASS**.
- `npm.cmd run build`: **PASS**, build Vinext concluído.
- `git diff --check`: **PASS**.

Validação da interface por renderização de HTML, sem verificação interativa no navegador nesta etapa. Nenhum dado real foi acessado ou alterado, e nenhuma pesquisa ou mensagem externa foi executada. Não houve publicação.

## Pendências e passos para o coordenador

Sem pendência de implementação neste escopo. Revisar e integrar somente a branch/SHA informados; publicação continua exclusiva do coordenador.

Na validação local em `http://127.0.0.1:5185`, usar solicitação fictícia em `general_review`. Conferir que aprovação integral, parcial, medida provisória (em emergencial) e rejeição não exibem prazo; Adiar exibe a data de reavaliação e impede envio sem ela. Alternar de Adiar com data incompleta para Aprovar: o controle deve desaparecer, permitindo registrar a decisão quando os demais campos obrigatórios estiverem preenchidos. Consultar decisões anteriores para confirmar que datas já gravadas continuam visíveis. Não enviar mensagens a fornecedores para verificar esta mudança.

---

# Histórico — entrega documental anterior — 13/11/2026

Commit desta entrega anterior: `b30ce17282a4769db5995ec127a46129f5ff579f`. O texto abaixo registra o escopo e as verificações da etapa documental anterior; para o campo de prazo e a entrega atual, prevalece a seção acima.

## Identificação e escopo

- Branch: `codex/compras`.
- Worktree: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\compras`.
- Porta local: `5185`, host `127.0.0.1`.
- Base auditada: `2b0d4e7ea83d6d7e4afaf176a3c319cf4263aa6e`.
- O SHA final do commit documental consta na resposta de entrega do chat; conferir com `git log -1 --format=%H`. Este arquivo integra o próprio commit.

O usuário solicitou explicar o campo **Prazo pertinente à decisão** e corrigir as inconsistências documentais sobre adiamento, porta local de Compras e permissões do Financeiro, conforme o código e as regras atuais. A entrega altera somente Markdown. O comportamento do aplicativo permanece o existente.

## Correções realizadas

- Adiamento: os guias passam a descrever uma única solicitação/protocolo, com revisão em `deferredEdit`, reapresentação por `reapply_deferred`, rodada anterior em `roundHistory`, nova competência calculada no servidor em Manaus e retorno a `pending` para nova estimativa e aprovações. O autor respeita `availableMonth`; o Master pode antecipar com justificativa; mês fechado exige reabertura. Cópias legadas ainda não enviadas são incorporadas ao histórico por `consolidateDeferredDrafts`, preservando anexos. Pedidos independentes já enviados não são consolidados. As descrições antigas de criação de novo protocolo e retomada direta foram corrigidas, inclusive nos parágrafos sobre poderes do Master.
- Ambiente: os guias de uso e testes indicam `http://127.0.0.1:5185` para esta worktree. A porta `5173` continua documentada como a do checkout principal do coordenador. Nenhum manifesto, launcher, hook ou configuração foi alterado.
- Financeiro: os guias de acesso e formulários deixam explícita a leitura somente de pedidos com `generalApproval` e registros autorizados vinculados, sem pedidos/rodadas sem aprovação, rascunhos ou revisões privadas. Permanecem os bloqueios de gravação de compras/fiscais/anexos e a ausência de usuários, cadastro separado de fornecedores e integração na resposta do perfil.
- Campo da decisão: documentação de `needDecision.due` como data opcional associada à decisão da DG. Em **Adiar**, é obrigatória e representa a data prevista para reavaliar. Não agenda compra, altera competência automaticamente ou define a liberação de reapresentação (`availableMonth`). O rótulo e a interface não foram alterados.

## Arquivos compartilhados alterados

- `AGENTS.md`: instrução de porta/testes e descrição atual dos poderes do Master no adiamento.
- `IMPLEMENTACAO.md`: fluxo atual do adiamento e endereço de testes.
- `CONTINUAR-NO-VSCODE.md`: abertura da worktree correta, porta/testes e adiamento.
- `FORMULARIOS-E-CONTROLES.md`: adiamento, Financeiro, campo da decisão e testes locais.
- `ACESSOS-LOCAIS.md`: restrição do Financeiro e porta dos testes HTTP.
- `INTEGRACOES.md`: endereço local do smoke test de Compras.
- `README.md`: distinção entre a porta do módulo e a do coordenador.
- `docs/modulos/compras/ENTREGA.md`: este registro.

Não há alterações em menu, layout, componentes, modelos, permissões executáveis, estilos, dependências, rotas, banco ou integrações. Não há mudança de contrato entre módulos. Os documentos compartilhados precisam ser conciliados pelo coordenador se outras branches também os alterarem. Especificações e planos históricos em `docs/superpowers/` não foram reescritos; a orientação operacional vigente está nos guias acima e em `AGENTS.md`.

## Verificações executadas e resultados

Todos os comandos foram executados com workdir explícito nesta worktree.

- `git rev-parse --show-toplevel`, `git branch --show-current`, `git status --short`: raiz/branch corretas e árvore inicialmente limpa.
- Conferência direta com `app/budget-record-panel.tsx`, `app/budget-workflow.ts`, `app/deferred-request.ts`, `app/deferred-draft.ts`, `lib/deferred-requests.ts`, `app/master-reanalysis.ts`, `app/access.ts`, `app/api/data/route.ts` e os helpers de ambiente: textos alinhados às regras implementadas.
- Verificação Node em memória importando `scripts/module-workspace.mjs`: **PASS** para branch `codex/compras`, porta `5185`, base `http://127.0.0.1:5185` e rejeição da porta `5173` pelo launcher do módulo. Nenhum servidor foi iniciado.
- Verificação Python em memória: **PASS** para presença de 5185 nos sete guias, ausência das instruções antigas de novo protocolo/cópia adiada nos textos revisados, restrições `generalApproval`/revisões privadas nos dois guias financeiros e diff restrito aos sete arquivos Markdown antes da inclusão deste registro. Nenhum arquivo de teste foi criado.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **PASS**, código de saída 0.
- `git diff --check`: **PASS**, sem erros de whitespace.

Build, testes HTTP, testes de interface e integrações reais não foram executados: a alteração é exclusivamente documental. Não foram criados dados fictícios, usuários, bancos ou anexos. Não houve pesquisa, mensagem externa, uso da ponte de produção, migração ou publicação. A operação atual em produção não foi verificada.

## Pendências, configuração e verificação pelo coordenador

Não há pendência de implementação neste escopo, migração, variável, segredo ou configuração a aplicar. Integração na main e publicação pertencem exclusivamente ao coordenador; esta entrega envia somente `codex/compras`.

Para revisar, conferir o SHA informado no chat e o diff do commit: somente os oito arquivos Markdown acima devem constar. Comparar os textos de adiamento com `reapplyDeferredRequest`/`consolidateDeferredDrafts`, o Financeiro com `canFinanceReadRequest`/`financeProjection` e a porta com `.ceea-worktree.json`/`localDevelopmentBase`. Na consulta do guia de formulários, conferir também a explicação do prazo da decisão. Não é necessário testar com dados reais para revisar esta entrega.
