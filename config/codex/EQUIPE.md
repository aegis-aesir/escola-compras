# Equipe de subagentes do CEEA Manager

Configuração autorizada em 15/11/2026. O chat `01a1b74c-f58c-7bd1-a47b-ea6c53153b36` é o coordenador de requisitos, delegação, integração, verificação conjunta e publicação. Esta atualização substitui o uso operacional de cinco chats independentes; os chats e seus históricos são preservados.

## Perfis e ambientes

| Perfil | Responsabilidade | Worktree / branch | Porta |
| --- | --- | --- | --- |
| compras | Fluxo orçamentário e compras existente | compras / codex/compras | 5185 |
| estoque | Materiais, movimentos, saldos e inventário | estoque / codex/estoque | 5181 |
| conhecimento_pops | Biblioteca de conhecimentos e POPs | conhecimento-pops / codex/conhecimento-pops | 5182 |
| tarefas | Tarefas e responsabilidades | tarefas / codex/tarefas | 5183 |
| escolar_manager | Planejamento e integração autorizada | integracao-escolar-manager / codex/integracao-escolar-manager | 5184 |
| openclaw_integracoes | Ponte, agentes OpenClaw, filas e adaptadores | compras / codex/compras, em exclusividade | 5185 |
| revisor | Revisão independente somente leitura | SHA/diff e checkout definidos na delegação | — |
| validacao | Testes locais, regressões e interface | Checkout reservado e porta do módulo | Do módulo |

As cinco worktrees existentes são reutilizadas. Compras e OpenClaw compartilham uma única reserva e **não escrevem ou executam testes com estado em paralelo nessa pasta**. Integrações genéricas pertencem a openclaw_integracoes; Escolar Manager continua com sua worktree própria. Uma eventual sexta worktree precisa ser preparada pelo coordenador antes de liberar autores paralelos. Revisores não precisam de checkout novo.

## Operação pelo coordenador

1. Classificar a tarefa. Executar tarefas simples diretamente; delegar partes independentes quando houver ganho claro. Usar até três subagentes simultâneos, além do coordenador, respeitando limites menores do ambiente. Não manter oito agentes executando sem tarefa nem prometer economia de tokens.
2. Confirmar que o responsável anterior terminou, conferir git status, branch e SHA. Um chat arquivado, prazo vencido ou diretório limpo não comprova encerramento de execução. Os chats legados permanecem para consulta; não delegar escrita concorrente a eles.
3. Reservar a worktree em `outputs/coordination/leases.json`: owner/task, role, checkout, branch, baseSha, arquivos compartilhados permitidos e estado. Somente este coordenador concede/libera a reserva; ela não expira automaticamente. Esse registro é disciplina de coordenação, não um sandbox ou bloqueio de escrita do sistema operacional.
4. Informar ao subagente tarefa concreta, perfil, caminho absoluto, branch, porta, SHA inicial, arquivos autorizados, critérios de aceite e entrega. Como agentes compartilham o filesystem e podem herdar cwd, **cada ferramenta deve usar o workdir absoluto do checkout designado**.
5. Se um módulo está atrás de main, conciliar a base com commits locais preservados antes da implementação quando necessário. Não fazer merge/rebase/reset automático ao instalar esta equipe. Quatro módulos tinham commits de planejamento próprios na configuração inicial.
6. Reservar também arquivos compartilhados: menu/layout, autenticação/permissões, modelos, API, dependências, esquema/migrações, configuração de publicação e lib/integrations.ts. Mesmo em branches distintas, alinhar contratos e integrar alterações compartilhadas sequencialmente. Compras e OpenClaw não têm autonomia simultânea sobre esses arquivos.
7. Revisor analisa o SHA/diff estável sem editar. Validação usa artefatos/banco fictícios exclusivos e checkout reservado; não executar testes com estado enquanto o autor ainda muda essa pasta. Não copiar .dev.vars, cofres, runtime OpenClaw, anexos ou banco real.
8. Conferir a entrega, resolver bloqueadores, integrar uma branch por vez, executar verificações conjuntas e publicar apenas mudanças de produto autorizadas pelo fluxo Sites existente. Configurar agentes não exige publicar o site. Somente o coordenador opera main e serviços/configuração de produção.
9. Liberar a reserva após comprovar que a execução terminou e registrar SHA/resultados. Manter pendências em documentação versionada; resumos substituem logs longos e credenciais nunca entram em entregas.

## OpenClaw

O perfil de desenvolvimento openclaw_integracoes é diferente dos agentes de execução do OpenClaw. Desde 17/11/2026, `pesquisa-web` é responsável por web, fornecedores, páginas e estimativas; `operacional` continua responsável pelo WhatsApp operacional. Importar somente conteúdo explicitamente selecionado por mensagem/anexo pelo usuário. Preservar exatamente `+559292017107`, conta pessoal `default` desativada/despareada e modelos/credenciais existentes. Serviços/cofre fora do Git permanecem com o coordenador. Testes fictícios não autorizam envios reais; uma tarefa real preparada e autorizada pelo usuário segue o fluxo normal, sem testes paralelos ou rearmar backlog.

O monitor que considera default desativado uma falha é pendência registrada. Esta configuração não inicia sua correção, novos módulos ou novas mensagens.

## Configuração nativa e portabilidade

Fontes versionadas: `config/codex/team.json` e `INSTRUCOES-COMUNS.md`. `node scripts/configure-codex-team.mjs --install` instala perfis TOML documentados em `.codex/agents/` e limite de concorrência no `.codex/config.toml` do repositório e do projeto pai atual. Não altera configuração global, modelos, raciocínio, permissões, MCP ou plugins. Perfis herdam o modelo e as permissões do coordenador.

Os arquivos `.codex` permanecem locais/ignorados. O instalador preserva alterações manuais: só atualiza arquivos anteriormente gerenciados cujo hash ainda corresponde ao recibo local. Acrescenta instruções datadas nos overrides e roteiros das cinco worktrees, sem substituir o conteúdo anterior ou alterar manifestos/hooks/branches. `--check` confere a instalação; `--plan` só lista os alvos. O Codex pode precisar recarregar sua configuração em uma nova sessão; neste chat a delegação por ferramentas já está disponível, e o coordenador passa as instruções do perfil explicitamente quando necessário. Não afirmar que um perfil persistido já está executando.

Referência do formato: https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents.
