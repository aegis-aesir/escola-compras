# Worktrees dos módulos — Implementation Plan

> **For agentic workers:** Execução nativa neste chat coordenador, conforme autorização do usuário.

**Goal:** Preparar quatro worktrees isoladas do CEEA Manager e manter este chat como único coordenador de integração e publicação.
**Architecture:** Mesmo repositório, branches próprias, arquivos/configuração/dependências/dados locais independentes. Manifesto local ignorado identifica cada módulo e fixa sua porta para servidor e testes. Hook por worktree permite enviar somente a branch daquele módulo.
**Tech Stack:** Git worktrees, Node.js, PowerShell e ambiente React/Vinext existente.

## Restrições
- Preservar main, dados, hospedagem, credenciais, alterações e worktrees existentes.
- Não copiar credenciais ou dados reais para os módulos; envio WhatsApp desativado.
- Não criar chats ou iniciar desenvolvimento dos módulos. O usuário abrirá os chats nas pastas preparadas.
- Somente o coordenador integra main e publica, substituindo a publicação automática individual durante o trabalho paralelo.

## Tarefas
- [ ] Criar e testar configuração de módulo/porta e proteção de push; preservar porta 5173 do coordenador.
- [ ] Registrar papéis, paths, branches, limites de alterações compartilhadas e entrega em COORDENACAO.md/AGENTS.md.
- [ ] Commit/push do preparo comum na main limpa e criar worktrees codex/estoque, codex/conhecimento-pops, codex/tarefas e codex/integracao-escolar-manager.
- [ ] Preparar configurações locais, ambiente fictício, instruções de abertura, hooks e dependências próprias em cada pasta.
- [ ] Verificar baseline, branches, portas, isolamento e proteção de push. Enviar branches próprias ao GitHub e entregar mapa ao usuário.

## Revisão focada
- Porta errada não pode direcionar testes HTTP ao coordenador ou outro módulo.
- Manifesto inválido falha explicitamente; não reusar silenciosamente a porta padrão.
- Hook deve recusar main e ref de outro módulo, preservando acesso à própria branch.
- Não substituir hooks/configurações existentes; não excluir/resetar worktree anterior.
- Nenhum segredo ou runtime entra no commit; nenhum módulo publica em Sites por conta própria.

## Registro
- Base inicial fb6e917; main limpa e sincronizada com origin/main.
- Worktree preexistente escola-compras-ordem/codex/recent-first preservada.
- As ferramentas nativas disponíveis criam/vinculam somente no chat chamador e não permitem retornar este chat à pasta principal. Nenhum chat dos quatro módulos encontrado. Para atender ao pedido mantendo o coordenador no checkout principal, preparar as worktrees com Git e registrar caminhos explícitos para os novos chats.
