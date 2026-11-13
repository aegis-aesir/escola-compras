# Desenho consolidado da biblioteca Conhecimento e POPs

13/11/2026. O usuário aprovou integralmente as regras de `REGRAS-DE-ACESSO-E-PUBLICACAO.md` e autorizou consolidar este desenho e preparar o plano. Esta entrega não inicia implementação, importação, migração ou publicação. As escolhas técnicas abaixo são decisões de planejamento, sujeitas às verificações de compatibilidade do plano.

## Intenção e escopo

Biblioteca interna no CEEA Manager existente, com navegação hierárquica por setor/assunto, documentos prontos e páginas editáveis, busca autorizada, anexos privados, revisão e publicação de POPs. Preservar autenticação, processo orçamentário e hospedagem. Não conectar ao Notion nem ao Escolar Manager, não desenvolver estoque/tarefas e não criar outro aplicativo.

Acervo previsto: 557 conteúdos únicos, sendo 526 da referência principal `Doc's SIE` e 31 complementares aprovados para a proposta. Catálogo e aliases conservam 962 caminhos de origem sem mover ou modificar originais. As contagens descrevem o inventário auditado, não autorizações de publicação. Materiais de apoio não se tornam POPs por estarem no catálogo.

## Abordagem

Adotar páginas hierárquicas com editor formatado simples, em vez de editor completo de blocos/colaboração simultânea. A biblioteca apenas de arquivos não cobriria a criação e revisão de conhecimento pedidas. O editor completo aumentaria escopo sem necessidade confirmada. O usuário aprovou a governança; a escolha do editor simples é a recomendação técnica consolidada para esta versão.

Cada entrada tem um tipo (`page`, `pop`, `support`), setor dono, categoria e origens. Documento pronto pode ser a peça principal de uma entrada, com texto de apresentação opcional; não é necessário converter seu conteúdo para o editor. Novas páginas usam documento estruturado JSON com schema versionado: parágrafos, títulos níveis 2/3, listas numeradas/com marcadores, negrito, itálico e links HTTP/HTTPS. Sem HTML arbitrário, execução de anexos, embeds, edição simultânea, OCR ou indexação do texto dos anexos nesta versão. Buscar título, texto das páginas e metadados catalogados.

Deixar ao implementador a seleção da biblioteca de edição, após teste isolado de schema, colagem, teclado, acessibilidade, tema e compatibilidade React/Vinext/Workers. Não instalar dependência antes dessa avaliação; registrar biblioteca, versão e impacto no lockfile. Isso não altera a semântica do documento persistido.

## Experiência funcional

Entrada Conhecimento no menu existente para os cinco perfis, contendo apenas conteúdo autorizado. Áreas: Pedagógico, Administrativo, Financeiro, RH, Operacional, TI e Institucional. Subáreas e os 31 complementares seguem `ORGANIZACAO-POR-SETOR.md`. A árvore mostra páginas/subpáginas, caminho de navegação e busca com filtros por área, categoria, tipo e situação. Compartilhados é uma coleção virtual: não revela antecessores privados.

Página: título, setor/categoria, tipo, responsável quando aplicável, versão publicada e próxima revisão; conteúdo ou arquivo principal, anexos e histórico permitido. Editor: salvar rascunho, estado de salvamento/conflito, coeditores autorizados, metadados, público proposto e enviar para revisão. Revisor: snapshot enviado, resumo da mudança, anexos, aprovar e publicar ou devolver com observação. Master: concessões, vínculos de RH/subáreas, restrições nominais e transferência justificada. A organização documental não renomeia os setores atuais.

Autosave serial de 600 ms em rascunho, gravação com versão esperada e indicação clara de falha. Não guardar conteúdo nominalmente restrito em backup persistente do navegador; conservar edição não confirmada na memória da aba e avisar antes de sair. Conflito 409 preserva essa edição para comparação/reaplicação manual, sem sobrescrever o servidor. Não prometer recuperação após fechar a aba nesta versão.

## Governança aprovada

Aplicar integralmente a política aprovada, incluindo: Master lê todo conteúdo; diretorias leem publicados comuns/setoriais de todas as áreas, mas precisam de concessão nominal para restritos; Setor/Financeiro leem seus vínculos, comuns e compartilhados. Edição concedida na biblioteca não altera perfil global. ADM edita áreas administrativas e Institucional e aprova as cinco áreas administrativas; DG edita/aprova Pedagógico e Institucional; Master é alternativa elegível. Nenhum participante da autoria/edição de conteúdo, anexos ou metadados da revisão pode aprová-la, mesmo Master.

Setor deriva o vínculo da tabela aprovada: Tecnologia → TI; Manutenção/Limpeza/Cozinha → Operacional; Secretaria sem associação automática a Administrativo; RH nominal. Financeiro inicia no vínculo Financeiro independentemente do setor cadastrado. Mudanças futuras no cadastro invalidam o vínculo derivado; concessões explícitas separadas permanecem somente enquanto ativas, sem inferência por nomes.

Leitura efetiva depende de usuário ativo, situação da página, público atual, restrições dos antecessores e público da revisão. Uma exceção explícita de compartilhamento pode liberar a folha sem abrir antecessores. Histórico requer acesso atual E acesso à versão; publicação mais ampla não libera antigos anexos restritos. Rascunho só autor/coeditores autorizados/Master; revisor apenas após submissão e com acesso nominal se necessário. Revogar concessão não ressuscita versões por links antigos. Busca, totais, árvore e download usam a mesma autorização, antes de paginação/contagem.

Vínculos, restrições e edição são administrados pelo Master. Alteração que restringe acesso pode valer imediatamente; ampliar público publicado ou mover entre áreas exige revisão aprovada e autorização Master. Uma concessão de pessoa a grupo já autorizado é administração de vínculo auditada, não alteração silenciosa do público do documento.

## Estados e integridade

Página mantém publicação vigente e, no máximo, uma revisão de trabalho. Revisão: `draft → in_review → published`; devolver ou retirar da revisão retorna a `draft`, com motivo de devolução. Submissão fixa snapshot/hash e revisor indicado. Qualquer edição posterior exige retirada/devolução e nova submissão. A publicação verifica novamente papel, concessões, identidade ativa, participantes e versão esperada; então preserva snapshot, atribui sequência da biblioteca e troca publicação vigente atomicamente.

Criar revisão a partir da publicação/versão antiga inicia nova autoria e participantes, sem apagar a autoria antiga. Restauração/transferência de trabalho preservam eventos e responsável anterior. Definir `lastEditedBy` não basta: manter conjunto de todos que alteraram aquela revisão, incluindo anexos e metadados. Convite de coeditor e leitura administrativa sem edição não tornam a pessoa autora.

POP exige responsável ativo com acesso, título/área/categoria/público, arquivos conferidos, resumo da mudança/primeira publicação, confirmação da revisão e próxima data. Padrão: 12 meses após aprovação, ou prazo menor informado. Anos bissextos limitam ao último dia válido do mês; data civil exibida em America/Manaus. Vencimento sinaliza revisão pendente sem despublicar. Versão impressa no original é um campo distinto da sequência da biblioteca e nunca é reescrita no NAS.

Master ou aprovador da área pode arquivar/retirar de circulação com motivo. Leitores deixam de ver a entrada; consulta de arquivados exige Master ou aprovador autorizado. Master restaura para revisão de trabalho, sem republicar automaticamente. Exclusão definitiva fica fora da versão. Impedir ciclos na árvore e mudança de acesso por reordenação.

## Persistência isolada no D1 existente

Adicionar tabelas com prefixo `knowledge_`, sem usar novos kinds na carga global de `records` de compras:

| Tabela proposta | Responsabilidade |
| --- | --- |
| `knowledge_areas`, `knowledge_categories` | Taxonomia com IDs estáveis e rótulos; não substituir setores de compras |
| `knowledge_pages` | Identidade, pai, área dona, versão otimista, publicação vigente, revisão de trabalho, arquivamento e restrições atuais |
| `knowledge_revisions` | Documento JSON/texto pesquisável, metadados, público congelado, estado, autor, responsável, submissão, decisão e sequência de publicação |
| `knowledge_revision_editors` | Participantes que editaram cada revisão; usados na segregação de aprovação |
| `knowledge_grants` | Concessões de usuário/setor/subárea para leitura/edição, restrição nominal e autorização de compartilhamento, com estado/versão |
| `knowledge_files`, `knowledge_revision_files` | Objetos privados, integridade, estado e vínculos imutáveis com revisões |
| `knowledge_uploads` | Upload multipart vinculado a usuário/revisão, partes, limites, validade e estado de finalização |
| `knowledge_origins` | Procedência e aliases de conteúdo; caminhos brutos somente para Master e ferramentas autorizadas |
| `knowledge_events` | Ações, atores por ID, versões/hashes e motivos; não replicar corpo de documento nos logs globais |

Índices por área/pai, publicação/arquivo, revisão/página, concessão/usuário/escopo e origem/hash. Uma revisão de trabalho por página e sequência de publicação única por página. Referências a usuários validam `records.kind=local_user`, estado ativo e versão atual, sem mudar tabelas de autenticação. Guardar identidade histórica mesmo após desativação.

Mutações usam comparação de versão e lote SQL com guardas para identidade/concessões atuais. Publicar, arquivar, mover e anexar precisam de guardas também dentro da gravação, não só na leitura inicial. Nenhuma publicação, vínculo ou evento pode sobreviver parcialmente a conflito; testar duas submissões/publicações concorrentes e revogação concorrente. O implementador define o SQL condicional suportado pelo D1, mantendo este contrato transacional.

## API e autorização

Rotas próprias sob `/api/conhecimento`; não ampliar `/api/data` nem `/api/files` de compras. Contratos JSON:

- `GET /api/conhecimento`: identidade pública mínima, capacidades, áreas/concessões visíveis e lista/árvore paginada, filtros e busca; nunca devolver usuários completos.
- `GET /api/conhecimento/pages/:id`: projeção autorizada da entrada e revisão solicitada; histórico paginado por subrota `/history`.
- `POST /api/conhecimento/pages`: criar entrada e rascunho com `idempotencyKey`, área/tipo/pai e valores iniciais.
- `POST /api/conhecimento/pages/:id/commands`: união discriminada `save_draft`, `submit`, `withdraw`, `return`, `publish`, `archive`, `restore`, `move`, `transfer`, `restore_revision`, com `expectedVersion` e `idempotencyKey`. Servidor escolhe ator/data; publicar não aceita conteúdo substituto.
- `GET/POST /api/conhecimento/grants`: somente Master para gestão; expor aos demais apenas suas capacidades efetivas.
- Upload: `POST /api/conhecimento/uploads`, `PUT /uploads/:id/parts/:number`, `POST /uploads/:id/complete`, `POST /uploads/:id/abort`; download autenticado `GET /api/conhecimento/files/:id`.

401 sem sessão; 404 para entidade não visível; 403 para ação negada em entidade visível; 409 em conflito/estado incompatível; 400 validação; 413 limite. Respostas privadas `no-store`; downloads sem URL pública, content-disposition attachment, nosniff e CSP sandbox. Verificar origem nas mutações, schema estrito, tamanho e formatos. Não confiar em capacidades, IDs de ator, nome do setor ou hash enviados pelo cliente.

## Arquivos grandes e formatos

O inventário local indica arquivo máximo de aproximadamente 124,31 MiB, sete acima de 32 MiB e uma planilha XLSB no catálogo. Decisão técnica: limite próprio do módulo de 256 MiB por arquivo e 20 arquivos por revisão; não alterar o limite de compras. Enviar em partes de 8 MiB, com última parte menor permitida, através do Worker autenticado e R2 multipart. Não carregar o arquivo inteiro em memória. A abordagem é suportada pela [documentação oficial de multipart do R2](https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/); limites aqui são escolhas do módulo, não afirmações sobre plano contratado.

Validar assinatura/formato e tipo interno de pacote Office; permitir PDF, DOCX, XLSX, XLSB, PPTX, PNG, JPG/JPEG, TXT, CSV e XML como download privado. Não executar macros ou renderizar Office/XML como página ativa. Conteúdo com extensão divergente é rejeitado. Hash informado pelo navegador não autoriza deduplicação: verificar integridade no servidor por fluxo incremental compatível com Workers antes de reutilizar objeto/origem. Até verificar, objeto permanece pendente e invisível. Avaliação de capacidade e comportamento multipart no ambiente local faz parte do primeiro marco técnico.

Chaves próprias `knowledge/...` com IDs aleatórios, sem caminho NAS no endereço. Revalidar sessão, vínculo da revisão, edição e versão em cada parte e finalização. Finalizar R2 não publica nem vincula automaticamente se a autorização foi revogada; manter estado pendente e permitir reconciliação/aborto idempotente. Expirar sessões de upload após 24 horas; reconciliação operacional autenticada pelo Master aborta pendências vencidas sem remover objetos referenciados por histórico. Exclusão física de objetos históricos não integra a versão.

## Acervo e fronteiras compartilhadas

Produzir prévia de ingestão baseada no catálogo local, com 557 entradas/31 complementares, hashes, origens e classificação a conferir. Nenhuma cópia real é feita na implementação/testes; usar arquivos fictícios. A ingestão real é uma etapa operacional posterior, autorizada e acompanhada separadamente. Revalidar hashes/origens nesse momento, tratar divergência como pendência e manter NAS somente leitura. Todos entram como rascunhos de catalogação, sem proprietário ou vigência inventados. Repetir o mesmo manifesto não duplica entrada/objeto nem cria publicação.

Arquivos comuns previstos: `db/schema.ts`, migração aditiva identificada pelo módulo, `app/process-navigation.ts`, `app/dashboard-shell.tsx`, `app/dashboard.tsx` e eventualmente import CSS em `app/layout.tsx`. Dependência/lockfile somente se o editor exigir. Preferir rotas Vinext e arquivos locais; só alterar `worker/index.ts` se verificação comprovar necessidade de interceptar a entrega binária. Documentar cada contrato para o coordenador antes de integração; não reestruturar o shell dos outros módulos.

Vínculos futuros com tarefas/materiais usam ID da entrada e revisão publicada, sem conceder acesso ou copiar conteúdo. Nenhum endpoint desses módulos ou do Escolar Manager é implementado agora.

## Aceite e operação

Testar política de todos os perfis/setores, rascunhos privados, folha compartilhada com pais ocultos, histórico restrito, identidade desativada, revogação durante upload/publicação, autores múltiplos, submissão imutável, concorrência e idempotência. Verificar desktop/celular, temas, teclado e estados de erro. Rodar tipos/build e regressões de autenticação, navegação, compras/anexos existentes. Servidor e HTTP somente `http://127.0.0.1:5182`, dados fictícios próprios da worktree.

Somente o coordenador integra main, ordena migrações e publica. Antes de operação real: indicar editores/RH/responsáveis, conferir classificação nominal, capacidade de armazenamento e dependências do build; nenhuma credencial ou dado real será copiado para a worktree. Entrega com branch/SHA, comandos reais, contratos, limitações e verificações em `ENTREGA.md`.
