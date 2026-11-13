# Conhecimento e POPs — auditoria e proposta inicial

Data: 13/11/2026. Etapa: planejamento, sem implementação de produto.
Este documento registra a auditoria inicial. A governança foi aprovada posteriormente; o desenho e o plano estão consolidados nos documentos indicados abaixo. Esta entrega permanece documental, sem instalar dependências, criar telas, endpoints ou migrações.

Atualização após o usuário informar que já possui os POPs: a conferência do acervo existente está em `CONFERENCIA-NAS.md`, nesta pasta. A prioridade proposta passa a incluir catalogar e disponibilizar os documentos prontos; conversão para o editor não é pressuposta. O usuário definiu `Doc's SIE` como referência principal e autorizou incluir os 31 complementares na proposta. `ORGANIZACAO-POR-SETOR.md` organiza 557 conteúdos únicos (526 da referência + 31 complementares), sem alterar os originais. A comparação está em `COMPARACAO-ACERVO.md`. Tratamento das variantes não selecionadas, busca no conteúdo de arquivos e limites de tamanho ainda precisam entrar no desenho antes de qualquer importação.

Governança detalhada em `REGRAS-DE-ACESSO-E-PUBLICACAO.md`, integralmente aprovada pelo usuário em 13/11/2026. A etapa seguinte, também autorizada, consolidou `DESENHO-CONSOLIDADO.md` e `PLANO-DE-IMPLEMENTACAO.md`. A aprovação da política está resolvida; os documentos técnicos estão prontos para revisão antes da implementação. Esta auditoria permanece como registro inicial, com sugestões antigas subordinadas à política aprovada e ao desenho consolidado.

## Ambiente conferido

- Raiz Git: `C:/Users/aegis/Documents/ChatGPT/Compras/escola-compras/.worktrees/conhecimento-pops`.
- Branch: `codex/conhecimento-pops`.
- Base auditada: `fa211930be936b79aa5deee58ad3c3a307f9a927`.
- Porta no manifesto e no resolvedor local: `http://127.0.0.1:5182`. Nenhum servidor foi iniciado; disponibilidade da porta não foi testada.
- `git status --short` inicial: vazio. Não havia alterações locais a preservar.
- Lidos: AGENTS.override.md, AGENTS.md, COORDENACAO.md, IMPLEMENTACAO.md, CONTINUAR-NO-VSCODE.md, ROADMAP.md, .ceea-workspace/INICIAR-MODULO.md e .ceea-worktree.json.
- Só o coordenador integra main e publica. Nenhuma conexão ao Notion ou ao Escolar Manager faz parte desta etapa.

## O que o projeto já oferece

| Área | Evidência no código | Reaproveitamento e limite |
| --- | --- | --- |
| Sessão e identidade | `app/local-session.ts`, `lib/local-auth.ts` | Login existente, usuário ativo, papel e setor. Autorizar cada operação no servidor, inclusive busca, histórico e download. Não criar outro login. |
| Perfis e setores | `app/model.ts`, `app/access.ts` | Master, ADM, DG, Setor e Financeiro. Setores são nomes em configurações; não existe uma matriz de acesso documental. Permissões de compras não definem permissões desta biblioteca. |
| Navegação | `app/process-navigation.ts`, `app/dashboard-shell.tsx`, `app/dashboard.tsx` | Menu por perfil e shell adaptado a celular. Os tipos e o conteúdo atual são centrados no processo orçamentário; a nova entrada exige alinhamento comum. |
| Aparência e controles | `app/appearance.css`, `app/redesign.css`, `components/ui/` | Temas, cores, campos, diálogos, abas, breadcrumb e apresentação de anexos disponíveis. Validar cada componente escolhido; sua existência não comprova compatibilidade visual ou acessibilidade no novo fluxo. |
| Rascunhos | `app/api/drafts/route.ts`, `app/draft-request-form.tsx` | Referência para autosave serial, versão e conflito. O endpoint e o formulário existentes pertencem às solicitações; não usá-los para salvar documentos. |
| Anexos privados | `lib/budget-files.ts`, `worker/index.ts` | R2 privado, download autenticado, validação básica de conteúdo, limite atual de 5 MB e 20 arquivos por solicitação. Regras, IDs, etapas e fechamento mensal são de compras; o módulo precisa de autorização e armazenamento de metadados próprios. O componente Attachment é somente apresentação. |
| Persistência e auditoria | `db/schema.ts`, `app/api/data/route.ts` | D1 com school, records JSON/version e audit. Há controle otimista e operações em lote como referências. O GET de compras carrega records e consulta audit globalmente: qualquer novo kind/evento exigiria revisão da projeção para evitar exposição e custo indevidos. |
| Editor e biblioteca | Inspeção de app, lib, db e package.json | Não foram encontrados editor rico, modelo de páginas hierárquicas ou módulo de POPs. Não existe dependência de editor especializada declarada. |
| Isolamento local | `scripts/module-workspace.mjs`, `scripts/run-framework.mjs` | Manifesto fixa branch/porta; argumentos de desenvolvimento restringem o host ao loopback e recusam outra porta. |

Os documentos antigos mantêm descrições históricas de adiamento e porta 5173. As regras atuais de 13/11 e a reserva desta worktree prevalecem. Não alterar o processo orçamentário durante este módulo.

## Alternativas para a primeira versão

1. **Páginas hierárquicas com editor formatado simples — recomendação para discussão.** Atende assuntos, setores, listas e POPs com menor escopo. Um único documento por página, com versão publicada preservada e revisão de trabalho separada.
2. **Editor completo de blocos.** Mais próximo da interação do Notion, com movimentação de blocos e estruturas complexas. Amplia modelo, dependências, atalhos e testes; só priorizar se esse comportamento for essencial para a escola.

A escolha não foi feita pelo usuário. Uma biblioteca apenas de arquivos não cobre o editor pedido e não é uma alternativa suficiente. Nenhuma biblioteca externa foi selecionada ou instalada; essa avaliação técnica virá após o escopo aprovado, considerando React/Vinext/Workers e documentação oficial.

## Proposta funcional de primeira versão

- Uma área Conhecimento e POPs no CEEA Manager, com árvore de páginas e subpáginas, caminho de navegação e organização por assunto/setor. Categorias classificam o conteúdo sem exigir cópias da mesma página. Impedir ciclos ao mover páginas.
- Acervo inicial da proposta: referência principal `Doc's SIE` e 31 complementares incluídos por decisão do usuário; organização por setor em `ORGANIZACAO-POR-SETOR.md`. Cópias idênticas compartilham uma entrada proposta com múltiplas origens; nenhum arquivo do NAS é alterado.
- Página de conhecimento e POP compartilham editor e anexos. Proposta de formatação: títulos, parágrafos, negrito, itálico, links e listas numeradas ou com marcadores. Tabelas, blocos especiais e edição simultânea ficam fora da proposta inicial.
- Busca por título e texto das páginas, com filtros por setor, categoria, tipo e situação. Filtrar autorização antes de devolver resultados, trechos, totais e árvore; não revelar títulos de páginas ocultas. OCR e indexação do conteúdo dos anexos ficam para depois.
- Anexos privados associados à página e às revisões que os utilizam. Cada download verifica acesso ao conteúdo correspondente. Proposta inicial: manter os tipos e limites atuais de compras como referência, sujeitos à confirmação de necessidade documental; sem arquivos públicos.
- POP com responsável vinculado à identidade existente, versão publicada, data da revisão e próxima revisão. Estrutura sugerida para o conteúdo: objetivo, aplicação, responsáveis e passos. Campos obrigatórios, periodicidade e efeitos do vencimento dependem da escola.
- Rascunho e publicação separados: editar uma publicação cria uma revisão de trabalho; leitores continuam vendo a última versão publicada. Publicar registra snapshot de conteúdo, metadados e referências de anexos, autoria e data. Versão de concorrência do banco não se confunde com número de publicação do POP.
- Histórico consultável conforme autorização, com publicações e eventos de edição/publicação/arquivamento. Proposta de restauração: recuperar versão antiga em novo rascunho, sem apagar versões ou republicar silenciosamente. Não pressupor um editor visual de diferenças na primeira versão.
- Permissões de leitura, edição, publicação e gestão de acesso distintas. Herança na árvore é uma possibilidade, ainda não definida. Acesso ao histórico e a anexos antigos acompanha a política que for aprovada; não herdar automaticamente direitos do perfil Master/ADM das compras.
- Arquivamento preserva conteúdo, versões e anexos. Quem arquiva, quem consulta arquivados e como restaurar continuam pendentes. Exclusão definitiva não integra a proposta inicial.

## Decisões de negócio resolvidas pela política aprovada

| Decisão | Por que muda a implementação | Proposta para o usuário avaliar, ainda não aprovada |
| --- | --- | --- |
| Quem lê o quê? | Define árvore, busca, históricos e anexos permitidos; inclui Financeiro e DG. | Publicados do setor e institucionais comuns; diretorias leem publicados comuns/setoriais de todas as áreas; restritos exigem concessão nominal, com exceção administrativa expressa do Master. |
| Quem cria, edita e administra acessos? | Define colaboradores, privacidade de rascunhos e administração da biblioteca. | Master gerencia acessos; diretorias editam seus escopos e usuários Setor/Financeiro podem ser indicados editores. Rascunhos privados do autor/coeditores e Master até submissão ao aprovador autorizado. |
| Quem publica páginas e POPs? Há aprovação por outra pessoa? | Publicação direta e submissão para aprovação têm estados e filas diferentes. | ADM aprova áreas administrativas; DG aprova Pedagógico/Institucional; Master pode ser alternativa. Aprovador não pode ter criado/editado a revisão; regra para todos os conteúdos. Não aplicar aprovações de compras. |
| Como permissões se propagam? | Mover uma página pode expor conteúdo ou retirar acesso. | Herdar da área e permitir restrições; compartilhamento além do público exige Master. Ampliar público publicado exige nova revisão/aprovação; não abre a pasta inteira ou versões antigas restritas. |
| O que torna um POP válido? | Define bloqueios de publicação e tratamento da revisão vencida. | Responsável ativo, confirmação de revisão e próxima data; proposta anual com aviso sem retirada automática. Master/aprovador de área podem arquivar com motivo; Master restaura para nova revisão. |

Nomes das primeiras áreas, categorias e responsáveis podem ser cadastrados depois, se forem configuráveis. Escolha de editor, organização interna dos arquivos e índices não precisam ser transferidas ao usuário como decisões de negócio. Necessidades de anexos maiores ou formatos diferentes devem ser informadas antes de fechar essa parte do escopo.

## Organização técnica proposta, sujeita ao desenho

- Preferir `app/conhecimento/` para interface, tipos e regras locais, `app/api/conhecimento/` para rotas próprias e `lib/conhecimento/` para persistência/autorização. Não ampliar o snapshot de compras para transportar toda a biblioteca.
- Avaliar tabelas próprias com prefixo `knowledge_` no mesmo D1 para páginas, revisões, anexos, categorias e acesso, evitando a carga global de records e o histórico global de compras. Isso é uma recomendação de isolamento, não um schema aprovado. Não criar outro DB ou R2.
- Migração, se necessária, será aditiva e identificada pelo módulo, sem reescrever registros anteriores. Coordenador define ordem final e execução. Nada foi gerado/aplicado nesta etapa.
- Conteúdo formatado deve ter schema e renderização controlados; não aceitar HTML arbitrário executável. Links e uploads precisam de validação no servidor.
- Salvamento/publicação devem conferir revisão esperada, tratar conflito sem sobrescrever edição concorrente e registrar autoria. Publicação precisa ser atômica com o snapshot correspondente.
- Anexos terão prefixo próprio no R2 e metadados separados dos arquivos de solicitação. Preservar bytes referenciados por versões; retirar um anexo da revisão atual não deve quebrar histórico publicado.
- Reavaliar acesso em toda mutação, busca, revisão e download. A política deve considerar troca de setor, conta desativada/excluída e alterações de permissões sem confiar no estado da tela.

## Pontos compartilhados a alinhar com o coordenador

| Ponto provável | Alinhamento necessário |
| --- | --- |
| `app/process-navigation.ts`, `app/dashboard-shell.tsx`, `app/dashboard.tsx` | Entrada Conhecimento, ícone, título e disponibilização por perfil sem alterar filas de compras. Estoque e Tarefas também poderão tocar o menu; não generalizar toda a navegação nesta etapa. |
| `app/local-session.ts`, `lib/local-auth.ts`, `app/model.ts` | Consumir identidade, papel e setores existentes; qualquer novo contrato público de capacidades ou lista de responsáveis deve expor só dados necessários, sem credenciais. Não conceder acesso à lista administrativa de usuários como efeito colateral. |
| `db/schema.ts`, migrações | Nomes e índices próprios do módulo, referências de identidade e estratégia para setores identificados hoje por texto; coordenar alterações futuras de nomes sem criar um cadastro paralelo. |
| `worker/index.ts` | Só alterar se necessário para a entrega privada de arquivos; preservar interceptações atuais de auth, files e bridge. |
| `app/layout.tsx`, estilos | Preferir CSS do módulo e variáveis existentes. Registrar eventual import comum; evitar alterações globais de aparência. |
| `package.json`, lockfile | Nova dependência de editor somente após avaliação e aprovação do desenho; registrar compatibilidade e tamanho na entrega. |

Nenhum desses arquivos foi alterado nesta etapa. Este registro comunica necessidades propostas; não pressupõe alinhamento já obtido nem envia mensagens a outros chats.

## Vínculos futuros sem implementar outros módulos

- **Tarefas:** futura referência à página e à revisão publicada do POP aplicada à tarefa; consultar a permissão da origem antes de mostrar título, trecho ou download. Não criar tarefas automaticamente por revisão vencida nesta versão.
- **Materiais/Estoque:** futura associação de manual/POP a material ou categoria, usando identificadores que o módulo de estoque vier a definir. Não criar materiais, saldos ou movimentos aqui.
- **Escolar Manager:** somente planejamento. Não presumir API, acesso ao banco, sincronização, autenticação ou autorização para transmitir documentos. Qualquer contrato depende da documentação oficial e do escopo do chat próprio.
- Um vínculo não transfere permissão nem copia automaticamente conteúdo ou anexos. Identificadores, exclusão/arquivamento da origem e revisão utilizada deverão ser alinhados antes da integração entre módulos.

## Sequência após as respostas

1. Consolidar as regras de acesso, publicação e validade de POPs; apresentar desenho funcional para aprovação.
2. Documentar contratos compartilhados para o coordenador e elaborar o plano técnico depois do desenho aprovado.
3. Implementar por partes: persistência/permissões; árvore/editor/rascunhos; publicação/histórico; anexos/busca; integração mínima ao menu.
4. Validar com dados fictícios somente em 127.0.0.1:5182: acesso entre usuários/setores/perfis, vazamentos na busca/árvore/histórico, upload/download, revisão publicada durante edição, conflito concorrente, arquivo/restauração e movimentação na árvore.
5. Rodar tipos/build e regressões pertinentes de autenticação, navegação e compras; entregar branch/SHA, limitações e instruções. Só o coordenador integra/publica.

Nesta auditoria não foram executados build, testes HTTP ou validação visual. Não há funcionalidade nova para aprovar em navegador. A checagem local do resolvedor confirmou manifesto, branch, URL/argumentos e rejeição de porta divergente/push main; ela não inicia serviço nem testa produção.
