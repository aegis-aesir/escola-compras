# Colégio Estrelas — instruções para continuar o projeto

Responda em português do Brasil, com linguagem simples. Leia `IMPLEMENTACAO.md` e `CONTINUAR-NO-VSCODE.md` antes de alterar o sistema. Trabalhe neste projeto existente; não gere outro aplicativo nem recrie a hospedagem.

## Regras definidas pelo usuário

- Escola privada: Centro Educacional Estrelas do Amanhã LTDA / Colégio Estrelas, Manaus/AM.
- Fluxo: solicitação dos setores → estimativa de preços na internet → análise da diretoria administrativa → aprovação da necessidade pela diretoria geral → cotações reais com fornecedores locais pelo WhatsApp → busca nacional após 1 dia útil sem proposta local válida → execução gerenciada pela diretoria administrativa com apoio do agente WhatsApp → recebimento.
- Diretora Geral: Franciluce Lima. Ela aprova o pedido, não o valor. Não criar teto financeiro ou reaprovação por diferença entre estimativa e preço real.
- Estimativa e proposta comercial real são registros diferentes, com fontes e datas.
- O nome/e-mail da diretoria administrativa e e-mail de Franciluce ainda precisam ser definidos. WhatsApp: OpenClaw, conta `operacional`, número +55 92 9201-7107.
- Três cotações é apenas a sugestão inicial configurável, ainda não regra confirmada pela escola.

## Estado real e próximos passos

Há um piloto funcional com banco D1, autenticação e permissões, formulários, estimativas manuais, duas etapas de direção, registro de propostas, contatos e execução. A ponte OpenClaw está implementada: fila assinada, pesquisa de fontes, recebimento de texto para revisão, cotações com proteção contra duplicidade e monitoramento de prazo. Verificar o contato recente da ponte e as duas chaves de envio antes de afirmar que está operacional. Envio real permanece desativado na configuração inicial; pedido e acompanhamento pelo agente ainda não estão automatizados. Não simular resultados como se fossem reais.

Leia `INTEGRACOES.md` para operar e validar a integração. Credenciais ficam no servidor e em cofre Windows DPAPI fora do projeto. Preserve idempotência, histórico e revisão de informações ambíguas. Não enviar mensagens reais a fornecedores durante testes sem autorização específica. Não solicitar credenciais no chat; orientar configuração segura quando necessária.

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
