# CEEA Manager — coordenação dos módulos

Autorizado em 13/11/2026: este chat é o coordenador de integração e publicação. Cada módulo trabalha em sua própria worktree/branch do mesmo repositório.

## Coordenador

- Chat: **CEEA Manager — Coordenação e publicação**.
- Identificador: `01a1b74c-f58c-7bd1-a47b-ea6c53153b36`.
- Checkout: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras`.
- Branch: `main`. Porta local: `5173`.
- Repositório: `https://github.com/aegis-aesir/escola-compras`.
- Produção: `https://ceea.colegioestrelas.com`, hospedagem Sites existente.

## Ambientes dos módulos

Raiz comum das worktrees: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees`.

| Módulo / pasta | Branch | Porta local |
| --- | --- | --- |
| `estoque` | `codex/estoque` | `5181` |
| `conhecimento-pops` | `codex/conhecimento-pops` | `5182` |
| `tarefas` | `codex/tarefas` | `5183` |
| `integracao-escolar-manager` | `codex/integracao-escolar-manager` | `5184` |

O último módulo começa somente pelo planejamento da integração, sem conexão ou alteração de dados reais do Escolar Manager.

## Como começar outro chat

1. Abrir a pasta exata da worktree do módulo como diretório de trabalho do chat/VS Code. Não continuar editando a pasta principal em outro chat.
   No VS Code, também é possível abrir o arquivo correspondente em `workspaces/<modulo>.code-workspace` da pasta principal.
2. Ler `AGENTS.override.md`, `AGENTS.md`, este documento, IMPLEMENTACAO.md, CONTINUAR-NO-VSCODE.md e ROADMAP.md.
3. Conferir `git rev-parse --show-toplevel`, `git branch --show-current` e `git status --short`.
4. Ler `.ceea-workspace/INICIAR-MODULO.md`, preparado localmente para aquele módulo. O manifesto `.ceea-worktree.json` reserva branch e porta.

As worktrees foram preparadas em Git; elas não estão automaticamente vinculadas a novos chats nem são chats já criados. As ferramentas nativas disponíveis criam worktrees apenas no chat chamador; usá-las aqui deslocaria o coordenador para um módulo. Os caminhos explícitos permitem abrir os chats nos ambientes já preparados.

## Regras de trabalho paralelo

- Trabalhar somente no diretório/branch do módulo. Não criar outra hospedagem, repositório ou aplicativo.
- Os módulos podem commitar e enviar **sua própria branch** ao GitHub. Não fazer push/merge/rebase de `main`, force-push, alterações nas branches alheias, publicação Sites ou migrações em produção.
- A regra anterior de mesclar/publicar imediatamente fica centralizada neste coordenador para os trabalhos paralelos. Somente ele resolve a integração, valida a main e publica.
- O hook `pre-push` de cada worktree recusa main, tags, exclusão de branches e branches de outros módulos. Não remover o hook ou o manifesto para contornar essa proteção. O hook evita acidentes; não substitui revisão nem controle de acesso do GitHub.
- Não copiar `.dev.vars`, bancos, R2, estado OpenClaw, cofre, tokens ou credenciais de produção da pasta principal. Cada worktree recebe somente uma chave fictícia local própria e envio WhatsApp desativado.
- Dependências, `.wrangler`, `.sites-runtime`, outputs e bancos de teste são próprios de cada pasta. Não compartilhar node_modules por junction/symlink.
- `npm run dev` usa a porta do módulo e falha se ela estiver ocupada. Os testes que usam `local-test-session.mjs` apontam para essa mesma porta em 127.0.0.1. Não apontar os testes para produção ou outro módulo.
- Credenciais/arquivos locais ignorados não entram no Git. Autorização para um teste ou exclusão em um chat não autoriza repetir a ação em outro.

## Arquivos compartilhados e banco

- Preferir arquivos e pastas próprios do módulo. Listar alterações necessárias em menu, layout, login/permissões, modelos comuns, estilos globais, dependências e rotas compartilhadas na entrega.
- Mudanças de contrato compartilhado devem ser documentadas para o coordenador alinhar antes de mesclar. Não sobrescrever versões de arquivos para eliminar conflitos.
- Migrações novas devem ser aditivas, identificadas pelo módulo e acompanhadas de testes. O coordenador resolve a ordem/numeração final e executa somente as migrações pendentes após revisão.
- Não mudar project_id, domínio, DB/R2, credenciais, modelos do OpenClaw ou conta operacional. Não iniciar a ponte de produção a partir de módulos.

## Entrega ao coordenador

No término de uma etapa, fornecer no chat do módulo e em `docs/modulos/<modulo>/ENTREGA.md`:

- Branch e SHA do commit pronto, com alterações commitadas e branch enviada.
- Escopo implementado e o que ficou pendente.
- Comandos de validação e resultados.
- Arquivos compartilhados alterados, contratos e dependências entre módulos.
- Migrações e configuração necessária, sem segredos.
- Limitações, dados fictícios usados e passos para verificar.

O usuário pode encaminhar essa entrega ao coordenador. Mensagens automáticas entre chats dependem de autorização explícita do usuário. Não presumir que os chats compartilham o histórico ou que mudanças de uma branch já estão nas outras.

## Integração e publicação

O coordenador confere branch/SHA, revisa o diff, integra um módulo por vez, resolve conflitos preservando as duas alterações, executa validações conjuntas e publica pelo fluxo oficial Sites. Preservar o estado das branches dos módulos e a worktree antiga `escola-compras-ordem`.

Depois de integrar, informar o SHA da nova main para os demais chats atualizarem suas branches quando estiverem com o trabalho commitado. Nunca usar `reset --hard`, limpeza de banco ou substituição integral de arquivos como atalho de integração.
