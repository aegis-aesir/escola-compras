# Colégio Estrelas — instruções para continuar o projeto

Responda em português do Brasil, com linguagem simples. Leia `IMPLEMENTACAO.md` e `CONTINUAR-NO-VSCODE.md` antes de alterar o sistema. Trabalhe neste projeto existente; não gere outro aplicativo nem recrie a hospedagem.

## Regras definidas pelo usuário

- Escola privada: Centro Educacional Estrelas do Amanhã LTDA / Colégio Estrelas, Manaus/AM.
- Fluxo: solicitação dos setores → estimativa de preços na internet → análise da diretoria administrativa → aprovação da necessidade pela diretoria geral → cotações reais com fornecedores locais pelo WhatsApp → busca nacional após 1 dia útil sem proposta local válida → execução gerenciada pela diretoria administrativa com apoio do agente WhatsApp → recebimento.
- Diretora Geral: Franciluce Lima. Ela aprova o pedido, não o valor. Não criar teto financeiro ou reaprovação por diferença entre estimativa e preço real.
- Estimativa e proposta comercial real são registros diferentes, com fontes e datas.
- Solicitações não aprovadas podem ser reabertas por Master ou Diretoria Administrativa, com justificativa. Preservar recusa/parecer anteriores em reopeningHistory; manter pedido, itens e competência. Com estimativa existente, voltar à análise administrativa; sem ela, à estimativa. Limpar a decisão ativa e os campos obrigatórios do parecer para exigir novo parecer e nova decisão da DG. Não reaproveitar aprovação anterior, alterar credenciais ou enviar mensagens para testar.
- Fornecedores: consultar primeiro o cadastro interno pela categoria de cada item e pela abrangência. Sem cadastro compatível, pesquisar na internet; para Manaus, priorizar perfis de empresas do Google Maps. Fontes externas exigem conferência antes do cadastro/contato. Não adivinhar categorias de pedidos antigos: a administração deve defini-las no painel.
- Login próprio por usuário e senha. Perfis Master (admin), Setor (solicitante), Diretoria Geral (geral) e Diretoria Administrativa (administrativo). E-mail/conta ChatGPT não são necessários para entrar. A Diretoria Geral apenas aprova/recusa a necessidade. Consulte ACESSOS-LOCAIS.md. WhatsApp: OpenClaw, conta `operacional`, número +55 92 9201-7107.
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
