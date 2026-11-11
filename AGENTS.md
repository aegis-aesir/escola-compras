# Colégio Estrelas — instruções para continuar o projeto

Responda em português do Brasil, com linguagem simples. Leia `IMPLEMENTACAO.md` e `CONTINUAR-NO-VSCODE.md` antes de alterar o sistema. Trabalhe neste projeto existente; não gere outro aplicativo nem recrie a hospedagem.

## Regras definidas pelo usuário

- Escola privada: Centro Educacional Estrelas do Amanhã LTDA / Colégio Estrelas, Manaus/AM.
- Fluxo: solicitação dos setores → estimativa de preços na internet → análise da diretoria administrativa → aprovação da necessidade pela diretoria geral → cotações reais com fornecedores locais pelo WhatsApp → busca nacional após 1 dia útil sem proposta local válida → execução gerenciada pela diretoria administrativa com apoio do agente WhatsApp → recebimento.
- Diretora Geral: Franciluce Lima. Ela aprova o pedido, não o valor. Não criar teto financeiro ou reaprovação por diferença entre estimativa e preço real.
- Estimativa e proposta comercial real são registros diferentes, com fontes e datas.
- Solicitações não aprovadas podem ser reabertas por Master ou Diretoria Administrativa, com justificativa. Preservar recusa/parecer anteriores em reopeningHistory; manter pedido, itens e competência. Com estimativa existente, voltar à análise administrativa; sem ela, à estimativa. Limpar a decisão ativa e os campos obrigatórios do parecer para exigir novo parecer e nova decisão da DG. Não reaproveitar aprovação anterior, alterar credenciais ou enviar mensagens para testar.
- Fornecedores: consultar primeiro o cadastro interno pela categoria de cada item e pela abrangência. Sem cadastro compatível, pesquisar na internet; para Manaus, priorizar perfis de empresas do Google Maps. Fontes externas exigem conferência antes do cadastro/contato. Não adivinhar categorias de pedidos antigos: a administração deve defini-las no painel.
- Login próprio por usuário e senha. Perfis Master (admin), Setor (solicitante), Diretoria Geral (geral), Diretoria Administrativa (administrativo) e Financeiro (financeiro, somente acompanhamento). E-mail/conta ChatGPT não são necessários para entrar. A Diretoria Geral apenas aprova/recusa a necessidade. Consulte ACESSOS-LOCAIS.md. WhatsApp: OpenClaw, conta `operacional`, número +55 92 9201-7107.
- Financeiro consulta pedidos de todos os setores, orçamento, execução, notas/pagamentos, fechamentos e anexos privados, sem gravar dados de compras/fiscais, aprovar, selecionar, arquivar, enviar WhatsApp ou gerenciar usuários. Dados de usuários e integração não são entregues a esse perfil.
- Arquivamento da solicitação inteira, exclusivo do Master, com motivo, autoria e histórico/restauração. Preservar o mesmo pedido, etapa, aprovações, formulário, propostas, notas, anexos e todos os históricos. Retirar das filas ativas, bloquear edições e pausar novas tarefas automáticas. A aba Arquivadas permite consultar e restaurar a etapa original. Não há mais arquivamento individual de propostas; metadados antigos são apenas históricos. Valores e fechamentos mensais não são apagados.
- Três cotações é apenas a sugestão inicial configurável, ainda não regra confirmada pela escola.

## Estado real e próximos passos

Há um piloto funcional com banco D1, autenticação e permissões, formulários, estimativas automáticas com extração pelo agente coordinator e correção administrativa, duas etapas de direção, registro de propostas, contatos e execução. A ponte OpenClaw está implementada: fila assinada, pesquisa de fontes, recebimento de texto para revisão, cotações com proteção contra duplicidade e monitoramento de prazo. Verificar o contato recente da ponte e as duas chaves de envio antes de afirmar que está operacional. Envio real permanece desativado na configuração inicial; pedido e acompanhamento pelo agente ainda não estão automatizados. Não simular resultados como se fossem reais.

Leia `INTEGRACOES.md` para operar e validar a integração. Credenciais ficam no servidor e em cofre Windows DPAPI fora do projeto. Preserve idempotência, histórico e revisão de informações ambíguas. Não enviar mensagens reais a fornecedores durante testes sem autorização específica. Não solicitar credenciais no chat; orientar configuração segura quando necessária.

Separação dos agentes: pesquisa web, fornecedores, páginas, navegador `compras` e estimativas usam `coordinator`, explicitamente por sessão. O agente `operacional` fica com o WhatsApp da conta `operacional`, inclusive respostas/anexos no canal. A ponte importa texto para revisão; anexos do WhatsApp não são enviados à pesquisa. A conta pessoal `default` foi desativada e despareada: não reativar nem usar como fallback. Preservar modelos e credenciais existentes.

A hospedagem Sites tem entrada pública na tela de login, por decisão do usuário para permitir contas locais sem ChatGPT. Dados e operações exigem sessão local e permissões no servidor. Contas iniciais: master, setor.teste e diretoria.geral. Senhas de acesso ficam no cofre DPAPI fora do projeto; a troca é opcional, inclusive para contas antigas e senhas redefinidas. Masters podem excluir acessos de outros usuários; preservar identidade/histórico, reservar o login e proteger o próprio acesso e o último Master. Leia `ACESSOS-LOCAIS.md`.

## Código, validação e publicação

- Interface: `app/dashboard.tsx`, `app/workflow-panel.tsx`, `app/globals.css`.
- Regras e tipos: `app/model.ts`, `app/workflow.ts`.
- API: `app/api/data/route.ts`. Banco: `db/` e `drizzle/`.
- React/Vinext + Cloudflare Workers/D1. Preservar a integração de build Sites.
- `npm.cmd run dev -- --hostname 127.0.0.1` inicia o ambiente local; `npm.cmd run build` gera o pacote.
- Validar mudanças de regras com `node scripts/workflow-test.mjs`; tipos com `node node_modules/typescript/bin/tsc --noEmit`.
- `node scripts/smoke-test.mjs` exige servidor local na porta 5173 e cria registros fictícios apenas no banco local.
- Não repetir migrações já aplicadas. Banco local e produção são separados.
- `.openai/hosting.json` contém a identidade da hospedagem. Não modificar o ID ou criar outro Site.
- Usar o fluxo oficial Sites para publicar quando suas ferramentas estiverem disponíveis. A extensão VS Code pode não fornecer as ferramentas do app; nesse caso preparar o código local e informar o bloqueio de publicação. Não tentar `wrangler deploy` para substituir a hospedagem atual.
- Não guardar tokens em código, arquivos de configuração compartilhados, logs, commits ou arquivos de passagem de contexto.
- Preservar alterações do usuário. Nunca limpar o banco ou apagar arquivos para resolver um erro sem avaliar o conteúdo e o escopo.

## Compatibilidade com os formulários anteriores

Escopo aprovado em 10/11/2026: consultar `FORMULARIOS-E-CONTROLES.md` e `docs/superpowers/specs/2026-11-10-compatibilidade-formularios-design.md`. Setores têm apenas formulários mensal/emergencial/assinaturas digitais e próprias complementações. Administração mantém conferência e parecer da necessidade, comparação comercial somente após a aprovação da necessidade e o recebimento de propostas reais, execução, documentos fiscais e fechamento. A avaliação financeira informativa foi retirada em 11/11/2026; não exigir disponibilidade/impacto no caixa/responsável/data para encaminhar à DG. Preservar os registros financeiros anteriores sem expô-los novamente no formulário ou à DG. DG decide necessidade integral/parcial, medida provisória emergencial, adiamento ou rejeição; nunca teto de valor. Preserve `originalScope`, competência original e histórico nas reduções/transferências.

Anexos privados usam R2 `BUCKET`, sem mudar D1 `DB` ou project_id. Não disponibilizar documentos originais ou arquivos internos como assets públicos. O envio de mensagens continua desativado nos testes. A pesquisa de assinaturas reúne fontes, mas preços de referência por licença para a vigência são conferidos pela administração; o protocolo automático atual não comprova ciclo/vigência.

Simplificação solicitada em 10/11/2026: novos formulários usam `version: 2`; classificação única substitui origem/natureza/previsão. Mês do primeiro envio calculado no servidor em America/Manaus, preservado em complementações. Referências/anexos opcionais, sem justificativas de ausência. Metadados e campos administrativos retirados do preenchimento do setor. Preservar o contrato anterior para consulta histórica e abas antigas; não inferir classificação de respostas legadas.


Ajuste de 11/11/2026: data necessária é opcional nos três formulários; preencher apenas quando houver prazo específico. O ciclo é mensal e a execução depende da disponibilização do saldo no início do mês de referência, sem atribuir automaticamente um dia de compra. Preservar competência e datas já registradas. Indicador de recebimento no prazo considera apenas pedidos com data específica. Quantidades de novos itens e complementações devem ser inteiras positivas (1 a 100000); valores monetários continuam com centavos e registros históricos não são arredondados.


Rascunhos automáticos (11/11/2026): novas solicitações incompletas ficam em records com kind=request_draft/status=draft, privadas do autor, fora de aprovações, indicadores e integrações. Acesso por Meus rascunhos ou Nova solicitação → Continuar. Salvamento após 600 ms sem edição, fila serial e controle de versão; cópia local por usuário protege o fechamento antes da resposta do servidor. Escape não fecha o formulário. No envio definitivo, validar todas as regras e converter atomicamente o mesmo registro em request; repetição com o mesmo ID retorna a solicitação existente. A competência é do primeiro envio definitivo em Manaus, não da criação do rascunho. Aceite deve ser confirmado novamente. Complementações existentes mantêm o fluxo atual e proteção contra Escape; não são novos rascunhos. Testes locais: scripts/request-drafts-test.mjs e scripts/optional-needed-date-test.mjs; sem mensagens reais ou alteração de dados de produção.


Anexos no preenchimento do setor (11/11/2026): seção opcional antes do aceite nas novas solicitações, disponível após salvar automaticamente o rascunho. Sem escolha de visibilidade para o setor; documentos da solicitação. Rascunhos e seus arquivos são privados do autor, inclusive perante outros perfis; a conversão para pedido preserva o mesmo ID e os anexos, passando às permissões normais da solicitação. Manter R2 privado, 5 MB/arquivo, 20 arquivos, validação do conteúdo e bloqueios de etapa/arquivamento/fechamento.


Conferência administrativa simplificada (11/11/2026): retirar da interface e dos bloqueios completude, necessidade/finalidade, estoque, duplicidade, compatibilidade com mercado, fornecedor/condições, prioridade adequada e prazos de análise. Quantidades e possibilidade de reduzir/adiar permanecem. Prioridade validada inicia com a prioridade do pedido, preserva escolha já salva e pode ser alterada. Documentos suficientes e observações ficam em avaliação opcional junto aos anexos; não exigir anexos ou cotação pelo setor. Conferências técnicas específicas, parecer e aprovação da necessidade permanecem. Manter campos antigos no contrato de armazenamento e nos registros, sem migrar ou apagar dados históricos.
