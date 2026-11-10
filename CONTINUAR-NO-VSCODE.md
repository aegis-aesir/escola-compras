# Continuar no VS Code

Este é o mesmo sistema de compras construído no app. O código e o histórico Git estão nesta pasta; não é necessário recriar o projeto.

## Primeiro uso

1. Abra a área de trabalho `Colegio Estrelas.code-workspace`, na pasta acima.
2. Abra o Codex pela barra lateral ou por `Ctrl+Shift+P` → `Codex: Open Codex Sidebar`.
3. Se aparecer a tela de entrada, entre com sua conta ChatGPT. A instalação não cria uma nova conta ou assinatura.
4. Comece com a mensagem abaixo.

> Continue o sistema de compras do Colégio Estrelas neste projeto existente. Leia AGENTS.md, IMPLEMENTACAO.md e CONTINUAR-NO-VSCODE.md. O fluxo das duas diretorias já está definido e testado. A diretoria geral aprova a necessidade, não o valor. Precisamos agora implementar a pesquisa real de preços na internet e o agente WhatsApp para cotar em Manaus, buscar fornecedores nacionais após 1 dia útil sem proposta válida e apoiar a execução pela diretoria administrativa. Primeiro confira o estado do projeto e identifique as integrações e configurações que faltam. Preserve os registros, as regras aprovadas e a hospedagem existente.

## Atalhos preparados

Em `Terminal` → `Run Task`, use:

- **Estrelas: iniciar sistema local** — abre o servidor de desenvolvimento em http://127.0.0.1:5173.
- **Estrelas: verificar tipos** — verifica a consistência do código.
- **Estrelas: testar regras de compras** — testa papéis e prazos com dados fictícios.
- **Estrelas: gerar versão** — gera os arquivos de produção, sem publicar.

O ambiente local já tem dependências instaladas e banco local preparado. Os registros TESTE LOCAL não são dados reais e não são publicados. O usuário de teste local chama-se Seedy.

## Integração atual e próximos passos

- Pesquisa no Mercado Livre pelo perfil dedicado `compras` do OpenClaw, com login manual do usuário. Abrir com `integrations/openclaw/open-shopping-browser.ps1`. Verificar login real antes de afirmar que a pesquisa autenticada está operacional. O painel informa sessão expirada/bloqueada e permite refazer a pesquisa. Frete sem quantidade/destino conferidos continua fora do total.

- Estimativa automática: pesquisas novas e pedidos ainda em estimativa usam o agente `operacional` do OpenClaw para analisar páginas e extrair evidências estruturadas. Todos os itens precisam de preço validável para encaminhar à análise administrativa. Frete desconhecido não entra no total. A administração pode corrigir a estimativa antes de encaminhar à diretoria geral.

- Ponte OpenClaw implementada em `integrations/openclaw/`: pesquisa de fontes, cotações e recebimento para revisão, com monitoramento de prazos. Leia `INTEGRACOES.md` e confira o contato recente no painel antes de afirmar que está conectada.
- Conta `operacional`, número +55 92 9201-7107. Envio real desativado inicialmente; não enviar mensagens de teste sem autorização específica.
- Interpretação de propostas e acompanhamento da execução ainda dependem da administração.
- Busca de fornecedores por categoria: cadastro interno primeiro, web/Google Maps para categorias sem fornecedor local. A etapa nacional consulta primeiro os fornecedores nacionais cadastrados. Pedidos antigos precisam ter suas categorias definidas no painel. Resultados externos exigem conferência e podem ser cadastrados com fonte/data.
- Usuários locais: master, setor.teste e diretoria.geral (Franciluce Lima). Senhas temporárias ficam no cofre Windows DPAPI, fora do projeto, e exigem troca no primeiro login. Consulte ACESSOS-LOCAIS.md. Masters podem criar outros acessos no painel.

Credenciais não ficam neste projeto. O Site usa variáveis de servidor; o launcher Windows lê o cofre DPAPI em `%USERPROFILE%/.openclaw/estrelas-compras/secrets.dpapi`. O gateway e a ponte precisam estar em execução. A configuração do editor, sozinha, não ativa esses serviços.

## Hospedagem atual

Entrada pública com login local; dados protegidos: https://compras-escola-aegis.col-gio-estr-8349.chatgpt.site

O projeto está vinculado a Sites pelo arquivo `.openai/hosting.json` e pelo Git remoto existente. Não recriar a hospedagem. A integração OpenClaw foi publicada em 08/11/2026 pelo fluxo oficial. Consultar o Git e as versões Sites para identificar o último commit publicado, em vez de assumir o estado antigo do piloto.

As ferramentas e plugins disponíveis na extensão podem diferir dos disponíveis no app. Se a publicação Sites não estiver disponível na extensão, a edição e os testes continuam locais; a publicação pode ser realizada pelo app no mesmo projeto. Não copiar credenciais entre ferramentas.

## Formulários estruturados e controles

O escopo de compatibilidade de 10/11/2026 foi aprovado pelo usuário. Consulte `FORMULARIOS-E-CONTROLES.md` para operar os três modelos, complementações, cotações comparáveis, documentos privados e fechamento. Rodar os testes `budget-test`, `budget-flow-test`, `budget-files-test`, `budget-records-test`, `quote-comparison-test` e, com servidor local, `budget-http-test` e `smoke-test`. Todos os dados dos scripts são fictícios e apenas locais.

O formulário simplificado (`version: 2`) usa competência automática do primeiro envio em Manaus, classificação única e referências/anexos opcionais. Não recuperar os campos removidos no preenchimento do setor. Preservar competência e respostas originais de registros antigos. Validar também `budget-simplification-test` e `budget-simplification-http-test`.
