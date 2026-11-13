# Entrega ao coordenador — Tarefas e responsabilidades

Data: 13/11/2026. **Etapa: auditoria e proposta preliminar; implementação não iniciada.**

## Branch e referência

- Worktree exclusiva: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\tarefas`.
- Branch de entrega: `codex/tarefas`.
- Base auditada: `fa211930be936b79aa5deee58ad3c3a307f9a927`.
- O SHA completo do commit documental final e o resultado do push são informados na resposta do chat após sua execução. Nenhum SHA de implementação existe nesta etapa. Para identificar esta entrega: commit com assunto `docs(tarefas): registra auditoria e proposta inicial do modulo`.
- Ambiente reservado: `http://127.0.0.1:5183`, conferido pelo manifesto e resolvedor; nenhum servidor iniciado.

## Escopo concluído

- Leitura dos oito documentos de início exigidos e confirmação de Git/manifesto.
- Auditoria da identidade, usuários, setores, perfis, navegação, banco, histórico, arquivos privados e fronteira com jobs OpenClaw.
- Proposta de primeira versão com lista/quadro, responsável/setor/prazo/prioridade/status, detalhe, checklist, comentários, anexos, filtros, minhas tarefas e acompanhamento gerencial.
- Avaliação de recorrência, subtarefas, dependências e notificações; recomendação de evolução posterior, ainda a confirmar.
- Inventário de contratos e arquivos compartilhados que poderão ser afetados; nenhum alterado nesta etapa.
- Documento detalhado: [AUDITORIA-E-PROPOSTA.md](./AUDITORIA-E-PROPOSTA.md).

## Pendências e decisões

Antes de implementar, o usuário precisa definir atribuição/redistribuição, alcance da visibilidade e regra de conclusão/validação/reabertura. Confirmar também abrangência inicial, obrigatoriedade de responsável/prazo e necessidade imediata dos recursos avançados. A alternativa de registros próprios no D1 é recomendada, sem escolha técnica aprovada ainda.

Desenho e plano de implementação definitivos dependem dessas respostas. Não interpretar esta entrega como aprovação para construir ou integrar o módulo funcional.

## Validações reais

Todos os comandos foram executados com `workdir` explícito desta worktree; caminhos de scripts/configuração foram absolutos. Abaixo estão abreviados para facilitar a reprodução na mesma pasta.

| Comando/verificação | Resultado |
| --- | --- |
| `git rev-parse --show-toplevel` | Raiz exata da worktree tarefas. |
| `git branch --show-current` | `codex/tarefas`. |
| `git status --short` inicial e após testes | Sem alterações. |
| `git config --get core.hooksPath` | `.githooks` desta worktree. |
| `node scripts/process-navigation-test.mjs` | Exit 0; PASS de menu por perfil e filas exclusivas. |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false --project tsconfig.json` | Exit 0, sem erros. |
| Asserções em memória de `readModuleWorkspace`, `localDevelopmentBase`, `developmentArguments` e `allowedModulePush` | Branch/porta/loopback corretos; aceita apenas branch própria no exemplo permitido, rejeita main e porta 5173. Sem escrita de manifesto e sem operação de rede. |

Não foram executados build, testes HTTP ou testes de um módulo novo. Não foi iniciado servidor. Os testes acima verificam somente a base auditada. Teste de navegação gerou output ignorado dentro da worktree.

## Arquivos, contratos e dependências

- Alterados nesta entrega: somente estes dois documentos em `docs/modulos/tarefas/`.
- Arquivos compartilhados de produto alterados: nenhum.
- Dependências/pacotes alterados: nenhum.
- Migrações: nenhuma. Futuras alterações de banco serão aditivas, identificadas por tarefas e terão a ordem alinhada pelo coordenador.
- Configuração necessária nesta etapa: nenhuma; hooks, manifesto, hosting, DB/R2 e OpenClaw preservados.
- Contratos pendentes: lista mínima de responsáveis autorizados, tratamento de renomeação/remoção de setores e usuários inativos, navegação comum, isolamento de histórico/arquivos, referência por ID/rodada de compras e ID/versão publicada de POPs.
- Reaproveitar usuário existente não concede acesso a outros usuários, compras ou POPs. Financeiro e DG não recebem novos poderes automaticamente. Concluir tarefa nunca altera compra sem regra futura expressamente aprovada.
- POPs ainda sem contrato disponível nesta branch. Não presumir compartilhamento de mudanças das outras branches. Integração Escolar Manager apenas planejada; nenhuma conexão efetuada.

## Limitações, dados e verificação pelo coordenador

Auditoria por leitura estática e verificações locais sem acessar banco de produção. Nenhum dado real copiado, nenhuma conta criada/reativada, nenhuma mensagem externa enviada, nenhuma ponte iniciada. Não há interface nova para testar nesta etapa; dados fictícios das asserções de isolamento não foram persistidos.

Para revisar: conferir o diff documental da branch e ler as decisões pendentes na seção 4 da proposta; comparar os pontos compartilhados da seção 6 com os outros módulos. Para reproduzir a validação, usar esta worktree e os comandos acima. O coordenador deve alinhar os contratos antes da futura integração e continua sendo o único responsável por main/publicação. Não houve envio automático deste resumo ao chat coordenador.
