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

- Confirmação de arquivamento corrigida: botão junto ao título da solicitação; janela curta própria com motivo, foco imediato, Cancelar/Escape e erro no mesmo local. Não usar o formulário de decisões no final dos detalhes para arquivar/restaurar, pois ficava fora da área visível em pedidos longos. Regras, permissões e histórico permanecem iguais.

- Novidades de 11/11/2026: perfil Financeiro somente consulta (Master atribui em Pessoas e acessos), sem gravações fiscais/de compras ou integração. Arquivamento da solicitação inteira, exclusivo do Master, com motivo, autoria e histórico/restauração. Preservar o mesmo pedido, etapa, aprovações, formulário, propostas, notas, anexos e todos os históricos. Retirar das filas ativas, bloquear edições e pausar novas tarefas automáticas. A aba Arquivadas permite consultar e restaurar a etapa original. Não há mais arquivamento individual de propostas; metadados antigos são apenas históricos. Valores e fechamentos mensais não são apagados. Tema escuro em cinza-carvão. Testes: `finance-profile-test`, `finance-profile-http-test`, `request-archive-test`, `request-archive-storage-test` e `request-archive-http-test`.

- Reabrir para análise: disponível a Master/Administrativo nos detalhes de pedidos Não aprovados, com justificativa e preservação da recusa anterior. Com estimativa, retorna à análise; sem ela, pesquisa primeiro. Requer novo parecer e decisão da DG. Testes: `reopen-request-test` e `reopen-request-http-test`. Aparência inclui as dez cores de referência e mantém Verde, com preferência pessoal no mesmo armazenamento local.

- Análise administrativa simplificada em 11/11/2026: sem avaliação financeira informativa ou exigência desses dados para encaminhar à DG. Comparação/escolha comercial apenas após a aprovação da necessidade e propostas reais recebidas; estimativa não habilita comparação. Históricos e regras da seleção preservados. Teste: `node scripts/administrative-stages-test.mjs`.
- Conferência e parecer integrados em 11/11/2026: um único bloco contém avaliação de quantidades, completude adicional, pendências, recomendação e prioridade validada. Escopo recomendado em texto, valor recomendado, análise, justificativa, condições/ajustes e observações do parecer ficam ocultos e não são exigidos; dados antigos permanecem preservados. Testes: `node scripts/administrative-simplification-test.mjs` e `node scripts/administrative-stages-test.mjs`.
- Organização administrativa em 11/11/2026: Conferência administrativa, Execução e Prestação de contas aparecem em blocos separados. Devolver para complementação pertence à Conferência e usa os mesmos campos Pendências e esclarecimentos e Prazo para complementação; a gravação é atômica. As chaves de armazenamento anteriores permanecem válidas.
- Formulário e anexos em 11/11/2026: Consultar o formulário enviado está integrado ao cartão de Anexos da solicitação, antes da listagem/envio de arquivos e da avaliação opcional da administração. Sem mudança de permissões ou armazenamento.

- Pesquisa no Mercado Livre pelo perfil dedicado `compras` do OpenClaw, com login manual do usuário. Abrir com `integrations/openclaw/open-shopping-browser.ps1`. Verificar login real antes de afirmar que a pesquisa autenticada está operacional. O painel informa sessão expirada/bloqueada e permite refazer a pesquisa. Frete sem quantidade/destino conferidos continua fora do total.

- Estimativa automática: pesquisas novas e pedidos ainda em estimativa usam o agente `coordinator` do OpenClaw para analisar páginas e extrair evidências estruturadas. Todos os itens precisam de preço validável para encaminhar à análise administrativa. Frete desconhecido não entra no total. A administração pode corrigir a estimativa antes de encaminhar à diretoria geral.

- Ponte OpenClaw implementada em `integrations/openclaw/`: pesquisa de fontes, cotações e recebimento para revisão, com monitoramento de prazos. Leia `INTEGRACOES.md` e confira o contato recente no painel antes de afirmar que está conectada.
- Conta `operacional`, número +55 92 9201-7107. Envio real desativado inicialmente; não enviar mensagens de teste sem autorização específica.
- Separação atual: pesquisa web, fornecedores, páginas e estimativas com `coordinator`; WhatsApp e seus anexos com `operacional`. A conta pessoal `default` está desativada e despareada; não reativar ou usar como alternativa. A ponte importa apenas texto do WhatsApp para revisão no painel.
- Interpretação de propostas e acompanhamento da execução ainda dependem da administração.
- Busca de fornecedores por categoria: cadastro interno primeiro, web/Google Maps para categorias sem fornecedor local. A etapa nacional consulta primeiro os fornecedores nacionais cadastrados. Pedidos antigos precisam ter suas categorias definidas no painel. Resultados externos exigem conferência e podem ser cadastrados com fonte/data.
- Usuários locais: master, setor.teste e diretoria.geral (Franciluce Lima). Senhas de acesso ficam no cofre Windows DPAPI, fora do projeto. A troca no primeiro login é opcional, inclusive para contas antigas e redefinições. Consulte ACESSOS-LOCAIS.md. Masters podem criar e excluir outros acessos no painel. A exclusão encerra o acesso, preserva pedidos/histórico e reserva o login; não permite excluir a própria conta ou deixar a escola sem Master.

Credenciais não ficam neste projeto. O Site usa variáveis de servidor; o launcher Windows lê o cofre DPAPI em `%USERPROFILE%/.openclaw/estrelas-compras/secrets.dpapi`. O gateway e a ponte precisam estar em execução. A configuração do editor, sozinha, não ativa esses serviços.

## Hospedagem atual

Entrada pública com login local; dados protegidos: https://ceea.colegioestrelas.com

O projeto está vinculado a Sites pelo arquivo `.openai/hosting.json` e pelo Git remoto existente. Não recriar a hospedagem. A integração OpenClaw foi publicada em 08/11/2026 pelo fluxo oficial. Consultar o Git e as versões Sites para identificar o último commit publicado, em vez de assumir o estado antigo do piloto.

As ferramentas e plugins disponíveis na extensão podem diferir dos disponíveis no app. Se a publicação Sites não estiver disponível na extensão, a edição e os testes continuam locais; a publicação pode ser realizada pelo app no mesmo projeto. Não copiar credenciais entre ferramentas.

## Formulários estruturados e controles

O escopo de compatibilidade de 10/11/2026 foi aprovado pelo usuário. Consulte `FORMULARIOS-E-CONTROLES.md` para operar os três modelos, complementações, cotações comparáveis, documentos privados e fechamento. Rodar os testes `budget-test`, `budget-flow-test`, `budget-files-test`, `budget-records-test`, `quote-comparison-test` e, com servidor local, `budget-http-test` e `smoke-test`. Todos os dados dos scripts são fictícios e apenas locais.

O formulário simplificado (`version: 2`) usa competência automática do primeiro envio em Manaus, classificação única e referências/anexos opcionais. Não recuperar os campos removidos no preenchimento do setor. Preservar competência e respostas originais de registros antigos. Validar também `budget-simplification-test` e `budget-simplification-http-test`.


Ajuste de 11/11/2026: data necessária é opcional nos três formulários; preencher apenas quando houver prazo específico. O ciclo é mensal e a execução depende da disponibilização do saldo no início do mês de referência, sem atribuir automaticamente um dia de compra. Preservar competência e datas já registradas. Indicador de recebimento no prazo considera apenas pedidos com data específica. Quantidades de novos itens e complementações devem ser inteiras positivas (1 a 100000); valores monetários continuam com centavos e registros históricos não são arredondados.


Rascunhos automáticos (11/11/2026): novas solicitações incompletas ficam em records com kind=request_draft/status=draft, privadas do autor, fora de aprovações, indicadores e integrações. Acesso por Meus rascunhos ou Nova solicitação → Continuar. Salvamento após 600 ms sem edição, fila serial e controle de versão; cópia local por usuário protege o fechamento antes da resposta do servidor. Escape não fecha o formulário. No envio definitivo, validar todas as regras e converter atomicamente o mesmo registro em request; repetição com o mesmo ID retorna a solicitação existente. A competência é do primeiro envio definitivo em Manaus, não da criação do rascunho. Aceite deve ser confirmado novamente. Complementações existentes mantêm o fluxo atual e proteção contra Escape; não são novos rascunhos. Testes locais: scripts/request-drafts-test.mjs e scripts/optional-needed-date-test.mjs; sem mensagens reais ou alteração de dados de produção.


Anexos no preenchimento do setor (11/11/2026): seção opcional antes do aceite nas novas solicitações, disponível após salvar automaticamente o rascunho. Sem escolha de visibilidade para o setor; documentos da solicitação. Rascunhos e seus arquivos são privados do autor, inclusive perante outros perfis; a conversão para pedido preserva o mesmo ID e os anexos, passando às permissões normais da solicitação. Manter R2 privado, 5 MB/arquivo, 20 arquivos, validação do conteúdo e bloqueios de etapa/arquivamento/fechamento.

Complementação e histórico (11/11/2026): a janela Complementar solicitação contém os anexos opcionais do mesmo pedido. O setor consulta a auditoria da própria solicitação, sem anexos internos ou eventos fiscais; pedidos de outros setores continuam bloqueados. Se as quantidades não mudaram, a avaliação quantitativa anterior permanece preenchida. Completude, pendências, prazo, responsável e data devem ser conferidos novamente; quantidades alteradas também limpam a avaliação anterior.


Conferência administrativa simplificada (11/11/2026): retirar da interface e dos bloqueios completude, necessidade/finalidade, estoque, duplicidade, compatibilidade com mercado, fornecedor/condições, prioridade adequada e prazos de análise. Quantidades e possibilidade de reduzir/adiar permanecem. Prioridade validada inicia com a prioridade do pedido, preserva escolha já salva e pode ser alterada. Documentos suficientes e observações ficam em avaliação opcional junto aos anexos; não exigir anexos ou cotação pelo setor. Conferências técnicas específicas, parecer e aprovação da necessidade permanecem. Manter campos antigos no contrato de armazenamento e nos registros, sem migrar ou apagar dados históricos.

Botão Meus rascunhos somente na aba Solicitações. Visão geral mantém Nova solicitação. Ações do cabeçalho usam page-actions, com altura uniforme, espaçamento e disposição vertical em telas pequenas.


Avaliação unificada de quantidades (11/11/2026): substitui Quantidades adequadas e Possibilidade de reduzir/adiar por Avaliação das quantidades (Adequadas/Inadequadas/Podem ser reduzidas), com quantidade recomendada inteira por item. Branco mantém o solicitado; zero não recomenda o item. Redução não permite aumento; alteração exige recomendação diferente e preserva itens originais. DG recebe as recomendações como contexto, mantendo sua decisão de escopo. A completude das informações adicionais admite Suficientes, Complementação necessária ou Não necessárias; pendências impedem encaminhamento até complementação. Dados opcionais não se tornam globalmente obrigatórios. Campos anteriores preservados no armazenamento; reabertura exige nova avaliação, com a anterior no histórico.

Para Complementação necessária, usar Pendências e esclarecimentos como único detalhamento obrigatório. Não reexibir `additionalDataNotes`; preservar apenas registros históricos que já o contenham.
