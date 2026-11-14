# Publicação e primeiro teste da agenda — 14/11/2026

O usuário autorizou acompanhar a publicação e a atualização da ponte pelo coordenador e testar a sincronização dos contatos conhecidos do WhatsApp, preservando as sete cotações reais bloqueadas.

## Publicação e ponte

- Entrega original de Compras: `31ada3de5b32fbbfd7a83e40f820802529e0c3a8`.
- Main integrada/publicada pelo coordenador: `c4584d5594b2d683049ed67090234ad4ae79db7e`; versão **2026.11.14.1**, versão salva Sites **62**, publicação concluída na hospedagem existente.
- O coordenador corrigiu e revalidou o ID retornado no cadastro concorrente e a divisão de lotes por bytes UTF-8. A sessão Master e o acesso Cotação → Agenda de contatos foram conferidos no site publicado.
- Ponte existente atualizada na pasta principal e tarefa `ColegioEstrelas-OpenClaw` reiniciada somente pelo coordenador. Suporte `contacts-v1` confirmado; sem criação de outro serviço, pareamento, mudança de conta, número, modelos ou credenciais.
- `WHATSAPP_SEND_ENABLED=false` no servidor e `ESTRELAS_ENABLE_SEND=false` no launcher, confirmados pelo coordenador antes e depois do teste.

## Teste único na interface publicada

Horários de Manaus em 14/11/2026:

1. Atualizar agenda habilitou **Sincronizar WhatsApp** após o contato recente da ponte.
2. Uma única solicitação foi registrada às **15:55:15**; o painel mostrou Aguardando a ponte.
3. A ponte iniciou a leitura às **15:56:06**. O painel passou a **Prévia disponível para conferência** às **15:56:09**: **98 contatos**, **4.555 registros candidatos**, **4.457 ignorados**. Nenhum aviso de fonte parcial ou erro foi exibido nessa execução. A cobertura continua limitada às conversas conhecidas; esses números não comprovam a agenda completa do aparelho.
4. **Conferir prévia** abriu o diálogo paginado. A primeira página apresentou 25 contatos e a caixa de seleção da página. Nenhuma caixa estava marcada; **Importar selecionados (0)** permaneceu desabilitado. O diálogo foi fechado por **Cancelar**.
5. Nenhum contato foi importado/classificado, nenhuma cotação foi preparada e nenhuma mensagem foi enviada neste teste. As identidades e os telefones da prévia não foram copiados para este relatório ou para o Git.

## Bloqueios após o teste

O painel Agente WhatsApp manteve as mesmas **sete cotações reais de CE-F18F1D55** com **Envio desativado**, além do bloqueio de envio no servidor. O coordenador confirmou no D1 as mesmas sete tarefas `whatsapp_quote` em `blocked`, `attempts=0`, sem `sentAt` ou `providerMessageId`; a sincronização única terminou em `review`. Também confirmou ambas as chaves desativadas e a tarefa existente em execução.

A captura recortada do status falhou duas vezes por timeout da API de screenshot do Chrome. A conferência da versão, status, diálogo e bloqueios ocorreu pela interface/DOM; não existe captura aprovada desta execução. Não reutilizar as imagens do teste local como prova de produção.

Para continuar, abrir **Cotação → Agenda de contatos → Conferir prévia** e revisar quais contatos guardar. Importar e classificar são etapas administrativas posteriores; não liberar as sete tarefas ou as chaves de envio para isso. Não é necessário solicitar outro sync para revisar a prévia existente.

A branch `codex/compras` foi atualizada por fast-forward para a main publicada, com a worktree limpa. Este registro é documental e não exige nova publicação nem reinício da ponte.
