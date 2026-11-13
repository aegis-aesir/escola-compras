# Entrega — Conhecimento e POPs

Data: 13/11/2026. Branch: `codex/conhecimento-pops`.
Etapa entregue: auditoria e proposta inicial, exclusivamente documental.
Base auditada: `fa211930be936b79aa5deee58ad3c3a307f9a927`.
O SHA completo desta entrega documental será informado na resposta final do chat após o commit e a conferência do push; não se trata de implementação pronta para publicar.

## Escopo concluído

- Leitura dos oito arquivos obrigatórios e conferência da raiz/branch/status/manifesto.
- Auditoria de sessão, perfis/setores, shell/navegação, UI, rascunhos, D1/auditoria, R2 e isolamento de desenvolvimento.
- Proposta, alternativas, decisões pendentes e pontos compartilhados em `AUDITORIA-E-PROPOSTA.md`, nesta pasta.
- Vínculos futuros com Tarefas e Materiais documentados sem implementar esses módulos. Escolar Manager permanece apenas planejamento.

## Pendências que impedem iniciar implementação

- Usuário definir leitura, edição, privacidade dos rascunhos, gestão/herança de permissões e publicação/aprovação.
- Usuário definir responsável/revisão/validade de POPs e poderes de arquivamento/restauração.
- Escolha de abordagem, desenho aprovado e plano técnico subsequente; contratos compartilhados precisam de alinhamento com o coordenador antes de integração.

## Verificações e resultados reais

- `git rev-parse --show-toplevel`: raiz obrigatória `C:/Users/aegis/Documents/ChatGPT/Compras/escola-compras/.worktrees/conhecimento-pops`.
- `git branch --show-current`: `codex/conhecimento-pops`.
- `git status --short` inicial: vazio.
- Checagem sem escrita com `node --input-type=module -e` e `node:assert/strict`, importando `readModuleWorkspace`, `localDevelopmentBase`, `developmentArguments` e `allowedModulePush` de `scripts/module-workspace.mjs`: PASS para módulo/branch, URL `http://127.0.0.1:5182`, argumentos de host/porta e recusa de porta 5173/push main. Não executa push nem inicia servidor.
- Revisão documental: escopo, acesso, publicação/histórico, anexos, busca, vínculos e limites confrontados com o pedido e os caminhos auditados.
- `git diff --cached --check`: PASS, sem erros de whitespace; diff preparado contém somente os dois documentos desta pasta.
- Build, tipos, testes de aplicação, HTTP e inspeção visual não executados: somente documentação alterada. Não afirmar funcionamento de editor, busca ou permissões ainda não implementados.

## Arquivos e contratos

- Somente os dois Markdown desta pasta foram adicionados. Nenhum arquivo compartilhado de produto alterado.
- Contratos/dependências propostos: navegação entre módulos, identidade e setores, capacidades documentais, tabelas prefixadas e anexos privados. Ainda não aprovados; detalhes na proposta.
- Nenhuma dependência instalada, migração criada/aplicada ou configuração alterada. Nenhum segredo incluído.
- Nenhum dado fictício de aplicação criado, banco consultado, servidor/ponte iniciado, mensagem enviada, dado real copiado ou serviço externo conectado. Porta reservada conferida em código, sem teste de disponibilidade.

## Passos para o coordenador verificar

1. Conferir o SHA completo encaminhado pelo usuário e o diff desta branch: deve conter somente esta pasta de documentação.
2. Ler `AUDITORIA-E-PROPOSTA.md`, especialmente decisões pendentes e pontos compartilhados.
3. Tratar a entrega como planejamento; não há migração nem funcionalidade a publicar.
4. Aguardar as regras do usuário e o desenho aprovado antes de integrar código de produto. Não presumir histórico automaticamente compartilhado entre chats.

## Resumo copiável

Conhecimento e POPs: auditoria inicial e proposta documental na branch codex/conhecimento-pops, ambiente 127.0.0.1:5182. Sem código de produto, alterações compartilhadas, dependências ou migrações. Pendem regras de acesso, rascunhos, publicação/aprovação e revisão/arquivo de POPs. Proposta e impactos futuros documentados em docs/modulos/conhecimento-pops/. Nenhuma publicação ou contato entre chats realizado. Acrescentar o SHA completo informado na resposta final.
