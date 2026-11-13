# Entrega — auditoria e planejamento inicial Escolar Manager

Data: 13/11/2026, America/Manaus.

## Identificação e escopo concluído

- Worktree: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\integracao-escolar-manager`.
- Branch pronta para revisão documental: `codex/integracao-escolar-manager`.
- Base auditada: `fa211930be936b79aa5deee58ad3c3a307f9a927`.
- SHA final: fornecido na resposta do chat após o commit, evitando autorreferência neste arquivo.
- Porta reservada pelo manifesto: `5184`, loopback `127.0.0.1`. Servidor não iniciado.
- Escopo concluído: auditoria estática das regras e arquitetura, pesquisa pública oficial, plano provisório v0.2 atualizado com respostas do usuário, matriz de finalidades/dados, riscos, perguntas e fronteiras entre módulos.
- Documento de trabalho: [PLANEJAMENTO.md](PLANEJAMENTO.md). A entrega não aprova requisitos nem autoriza implementação.

## Resultado e pendências

O CEEA Manager local tem versão visível `2026.11.13.6`. O usuário informou **Escolar Manager Web, versão `2026.21.1.3`**. A identificação veio da resposta no chat, sem acessar instalação ou dados reais. Razão social do fornecedor contratado, módulos licenciados e interfaces compatíveis com o build ainda não foram verificados. O site oficial da marca foi encontrado e lido.

Finalidade informada: CEEA complementar o Escolar com biblioteca de conhecimentos do Estrelas e onboarding de RH, gestão de tarefas/responsabilidades e possível estoque compartilhado. O usuário respondeu que **ainda vai avaliar** a autoridade do estoque; não escolher origem, direção ou dono do saldo por suposição.

As fontes oficiais públicas consultadas foram a [página inicial](https://www.escolarmanager.com.br/) e o [catálogo Web](https://www.escolarmanager.com.br/solucoes/escolar-manager-web/), ambas com HTTP 200 em 13/11/2026. Catálogo comercial não substitui documentação técnica. Não foi localizada documentação pública aplicável de API/webhooks/troca de arquivos nas buscas realizadas; isso não demonstra inexistência de recurso privado. XML de notas emitidas não comprova troca genérica de compras.

Proposta inicial: conhecimento/onboarding e tarefas com registros próprios no CEEA, sujeitos aos escopos dos chats desses módulos; troca com Escolar somente se demonstrada necessidade concreta. Nenhum requisito de integração financeira, folha ou dados acadêmicos foi incluído. Estoque permanece em avaliação. Ainda faltam autoridade dos dados, direção/frequência de eventual troca, elegibilidade, campos, responsáveis, retenção, aceite e documentação oficial aplicável ao build. A próxima etapa segue sendo planejamento; as respostas recebidas não autorizam implementação.

## Arquivos e fronteiras

Criados somente:

- `docs/modulos/integracao-escolar-manager/PLANEJAMENTO.md`.
- `docs/modulos/integracao-escolar-manager/ENTREGA.md`.

Arquivos compartilhados alterados: nenhum. Sem alterações em código, menu, layout, modelos comuns, permissões, estilos, dependências ou rotas.

Contratos propostos, ainda não implementados nem aprovados:

- Compras/Estoque: se houver vínculo de recebimento, ID do pedido/rodada/recebimento/item, versão e quantidade/unidade conferidas; resultados não substituem decisões nem reabrem mês.
- Estoque: definir dono de catálogo/saldo, IDs de itens/locais, unidades, movimentação e reversão antes de qualquer troca de estoque.
- Conhecimento/onboarding e Tarefas: atribuição de trilha, etapa, versão de conteúdo e responsável; deduplicação, histórico de evidência e autorização por documento. Leitura/aceite não equivalem automaticamente a conclusão de treinamento/tarefa.
- Pessoas/RH e acesso: colaborador não vira usuário ou papel automaticamente; mínimo necessário e permissões próprias a definir. Permissões de compras não concedem acesso geral a RH.
- Integração/Tarefas: eventual pendência deduplicada e vinculada; nenhuma dependência de módulo foi criada.
- Integrações: não ampliar tipos/fila OpenClaw para Escolar. Reaproveitar padrões somente após desenho próprio e alinhamento do coordenador.

Nenhuma migração, variável, configuração externa ou segredo novo. Hook, manifesto, autenticação, DB/R2, domínio e OpenClaw preservados. Nenhuma publicação, main modificada, mensagem a outro chat ou contato ao fornecedor.

## Verificações executadas e limites

- `git rev-parse --show-toplevel`: raiz da worktree acima confirmada.
- `git branch --show-current`: `codex/integracao-escolar-manager`.
- `git status --short`: limpo na auditoria inicial; antes de preparar a entrega, apenas a nova pasta documental.
- Pesquisa estática com `rg`: identificação contratual e conector Escolar não encontrados nos arquivos versionados examinados; referências encontradas no roadmap/coordenação.
- `node --input-type=module -e '<asserções sobre scripts/module-workspace.mjs>'`: saída `PASS: manifesto, porta 5184 e bloqueio de push main; sem servidor ou dados.`; código 0. Asserções: módulo/branch/porta exatos, URL loopback, push próprio permitido e push main recusado. Não executa servidor, banco nem a ponte.
- `git diff --check` e `git diff --cached --check`: código 0, sem erros de whitespace.
- `git diff --cached --stat` e asserções de `git diff --cached --name-only`: somente os dois documentos esperados; saída `PASS: apenas os dois documentos do módulo preparados; UTF-8 legível.`; código 0. SHA e confirmação final do push são informados no chat após commit/envio.
- Revisão documental: fatos separados de propostas, versão/finalidade atribuídas à resposta do usuário, avaliação do estoque preservada como pendente, alternativas automatizadas marcadas como não confirmadas e fases condicionadas às decisões abertas.

Não foram executados build, TypeScript, testes HTTP ou suítes de compras: só há documentação nova, sem mudança de comportamento. Não houve simulação de integração ou fixture criada. Nenhum dado de aluno, fornecedor real, pagamento, banco, anexo ou cofre foi consultado. A leitura de código não comprova operação atual de produção.

## Passos para o coordenador verificar

1. Conferir branch e SHA completo no resumo do chat; comparar com a referência remota da própria branch.
2. Revisar somente os dois documentos acima; confirmar ausência de mudanças fora da pasta do módulo.
3. Conferir fontes e pendências; Web `2026.21.1.3` foi informado pelo usuário, sem validação técnica da instalação ou compatibilidade pública.
4. Aguardar avaliação do estoque e confirmar necessidade/interface de eventual troca; alinhar desenho dos módulos complementares nos chats próprios. Não encaminhar esta entrega como implementação pronta.
5. Alinhar responsabilidades de Estoque e Compras, especialmente ID por rodada/item e dono do saldo, sem presumir conteúdo de outras branches.

Resumo para encaminhamento: auditoria e plano provisório v0.2 concluídos, somente documentação. Usuário informou Escolar Manager Web `2026.21.1.3` e finalidade complementar: conhecimento/onboarding RH, tarefas/responsabilidades e possível estoque compartilhado. Autoridade do estoque ainda será avaliada; necessidade/interface de troca externa e fornecedor contratado pendentes. Nenhum conector, alteração compartilhada, migração, conexão real ou publicação. Próxima etapa: desenho e coordenação de contratos, mantendo somente planejamento.
