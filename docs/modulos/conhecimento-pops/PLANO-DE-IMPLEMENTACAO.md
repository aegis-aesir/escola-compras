# Plano de implementação da biblioteca Conhecimento e POPs

> **Para agentes implementadores:** usar a skill superpowers:executing-plans para execução nesta sessão; superpowers:subagent-driven-development somente se esse método for escolhido pelo usuário. Executar as tarefas com os checkboxes abaixo e usar superpowers:verification-before-completion antes de afirmar conclusão.

**Objetivo:** entregar a biblioteca no aplicativo existente com a governança aprovada, preservando o NAS e as funções de compras.

**Arquitetura:** domínio próprio de conhecimento, autorização central, tabelas `knowledge_` no mesmo D1 e objetos privados no mesmo R2. Revisões preservadas, uma revisão de trabalho por entrada e publicação transacional. Rotas próprias e integração mínima ao shell existente.

**Tecnologias:** TypeScript, React/Vinext, Zod, Cloudflare Workers/D1/R2, scripts Node/assert/esbuild seguindo o repositório. Biblioteca de editor e hash incremental escolhidas e registradas na avaliação técnica inicial, sem mudar os contratos abaixo.

**Especificação:** `DESENHO-CONSOLIDADO.md`, `REGRAS-DE-ACESSO-E-PUBLICACAO.md` (aprovada em 13/11/2026), `ORGANIZACAO-POR-SETOR.md` e `COORDENACAO.md`.

## Restrições globais

- Raiz exclusiva: `C:/Users/aegis/Documents/ChatGPT/Compras/escola-compras/.worktrees/conhecimento-pops`; branch `codex/conhecimento-pops`.
- Todo shell deve informar explicitamente esse `workdir`; leituras/edições/patches usam caminhos absolutos sob essa raiz. Não criar/anexar worktree. Neste plano, caminhos de arquivos são relativos apenas para localização; expandir à raiz antes de usá-los em ferramentas.
- Servidor e testes HTTP somente `http://127.0.0.1:5182`; dados fictícios, dependências e runtime próprios. Preservar manifesto/hooks. Não copiar segredos, banco, anexos ou runtime real.
- Não alterar originais do NAS nem fazer ingestão real nesta implementação; não iniciar OpenClaw, reativar default, enviar mensagens, migrar produção ou publicar Sites.
- Não fazer merge/push/rebase de main, force-push ou editar branches alheias. Somente coordenador integra/publica; registrar contratos e migração aditiva na entrega.
- Política aprovada: aprovação por outra pessoa, inclusive Master; não ampliar direito de compras por concessão editorial; 557 conteúdos planejados, incluindo 31 complementares.
- Limites técnicos planejados: 256 MiB/arquivo, partes de 8 MiB, 20 arquivos/revisão e upload pendente de 24 horas; sem mudar limites de compras.
- Os comandos de teste abaixo são futuros, não resultados já obtidos. Usar `functions.exec`/`exec_command` com o `workdir` obrigatório, sem depender de `cd` anterior; não executar scripts HTTP antes do servidor isolado e leitura de suas URLs.

## Foco da revisão

1. Um usuário compartilhado abre folha sem poder enumerar pais/irmãos privados — tarefa 4.
2. Revogação/desativação ocorre entre leitura e publicação/finalização de upload — tarefas 3 e 5.
3. Um segundo editor altera só metadados/anexos e tenta aprovar — tarefas 2 e 3.
4. Nova publicação comum possui histórico/anexo antigo nominalmente restrito — tarefas 2, 4 e 5.
5. Importação repetida ou arquivo grande interrompido produz duplicidade/objeto órfão acessível — tarefas 5 e 7.

## Mapa de arquivos e contratos

| Arquivos previstos | Responsabilidade |
| --- | --- |
| `app/conhecimento/model.ts`, `document.ts` | Tipos/schemas do domínio e documento estruturado; sem tipos de Purchase |
| `app/conhecimento/policy.ts`, `workflow.ts` | Decisões puras de acesso e transições da revisão |
| `lib/conhecimento/repository.ts`, `service.ts` | D1, guardas atômicas, comandos/idempotência e projeções |
| `lib/conhecimento/files.ts`, `uploads.ts` | R2 privado, upload por partes, validação/integridade e reconciliação |
| `app/api/conhecimento/[[...path]]/route.ts` | Despacho das rotas definidas no desenho, sessão, origem e limites; testar catch-all na tarefa 1 |
| `app/conhecimento/panel.tsx`, `tree.tsx`, `editor.tsx`, `review.tsx`, `grants.tsx`, `knowledge.css` | Interface e estados próprios do módulo |
| `scripts/conhecimento-{policy,workflow,storage,http,files,ui,import}-test.mjs` | Verificações por comportamento, sem dados reais |
| `scripts/conhecimento-import-preview.mjs`, `lib/conhecimento/import.ts` | Prévia/idempotência do manifesto, desativada para execução real por padrão |
| `db/schema.ts`, migração do módulo | Tabelas/índices aditivos, nome/ordem final alinhados com coordenador |
| Shell/menu/layout e dependências listados no desenho | Alterações comuns mínimas, registradas antes de integração |

Tipos públicos a definir na tarefa 1: `Actor` (id, role, department, active, version), `PolicyContext` (ator atual + concessões/vínculos/epoch), `KnowledgePage`, `KnowledgeRevision`, `Audience`, `KnowledgeCommand`, `CommandResult`, `StructuredDocument`, `FileDescriptor`, `ImportEntry`. Datas/identidade de auditoria são do servidor. Reusar IDs públicos existentes sem expor hash de senha ou dados administrativos de usuários.

## Tarefa 1 — Compatibilidade e base do domínio

**Arquivos:** criar `app/conhecimento/model.ts`, `document.ts`, `scripts/conhecimento-storage-test.mjs`; adicionar schema/migração somente após conferir numeração pendente. Eventuais `package.json`/lockfile devem ser listados na entrega.

**Interfaces:** produz os tipos anteriores, `validateDocument(input:unknown):StructuredDocument`, `createRepository(db:D1Database):KnowledgeRepository`; repositório fornece carregar página/revisão, contexto de concessões, listar autorizados e executar comando guardado. Contratos de rotas seguem o desenho.

- [ ] Conferir raiz/branch/status, preservar alterações e registrar SHA-base. Inspecionar scripts/framework e documentação oficial das dependências escolhidas.
- [ ] Fazer avaliação local, com fixture, de editor simples/schema e hash incremental por fluxo no Worker. Confirmar rota catch-all, upload/download em stream e R2 multipart em 5182. Não copiar arquivo do NAS para a avaliação.
- [ ] Escrever casos que falhem: estrutura sem schema, HTML/link executável rejeitado, segunda revisão de trabalho proibida, sequência de publicação duplicada proibida e ausência das tabelas/índices do módulo.
- [ ] Rodar `node scripts/conhecimento-storage-test.mjs` na raiz obrigatória; confirmar falhas esperadas antes da implementação.
- [ ] Implementar schemas, tabelas e índices do desenho; migração local aditiva e repetição controlada sem apagar dados. Fixar escolha/versão do editor/hash e medir uso de memória com fixture de 125 MiB em partes; parar e ajustar desenho se não cumprir o contrato.
- [ ] Reexecutar a suíte: PASS nas restrições, documento estruturado e memória sem buffer integral. Registrar dependências e decisões técnicas em `ENTREGA.md`; commit `feat(conhecimento): add isolated schemas and storage`.

## Tarefa 2 — Política aprovada como funções puras

**Arquivos:** criar `app/conhecimento/policy.ts`, `scripts/conhecimento-policy-test.mjs`.

**Interfaces:** consome tipos/contexto da tarefa 1; produz `canReadPage(ctx,page,revision):boolean`, `canEditRevision(ctx,page,revision):boolean`, `canApproveRevision(ctx,page,revision):boolean`, `canManageAccess(ctx):boolean`, `effectiveMemberships(actor,grants):Membership[]` e `projectPage(ctx,page,revision):PageView|null`. Editor de área não abre rascunho privado automaticamente.

- [ ] Escrever testes de tabela dos cinco perfis/oito setores aprovados. Exigir: Secretaria não ganha Administrativo; Financeiro não acumula setor cadastrado; RH não deriva do nome da pasta; Tecnologia mapeia TI; Limpeza mapeia Operacional.
- [ ] Incluir rascunho privado, restrito nominal com DG/ADM negados e Master permitido, coeditor revogado, inativo, restauração de versão restrita e participante que editou só anexos/metadados impedido de aprovar.
- [ ] Executar `node scripts/conhecimento-policy-test.mjs`: FAIL antes das funções; implementar funções sem efeitos colaterais e executar novamente: PASS. Commit `feat(conhecimento): enforce approved access policy`.

## Tarefa 3 — Revisões e comandos transacionais

**Arquivos:** criar `app/conhecimento/workflow.ts`, `lib/conhecimento/repository.ts`, `service.ts`, `scripts/conhecimento-workflow-test.mjs`; ampliar teste de storage.

**Interfaces:** `transition(ctx,page,revision,command,now):TransitionResult`; `executeCommand(db,actorId,pageId,command):Promise<CommandResult>`. Comandos e respostas seguem o desenho; repositório relê identidade/grants/epoch e aplica compare-and-swap. Erro de conflito não deixa publicação/evento parcial.

- [ ] Criar testes que falhem para submit congelado, devolver com motivo, withdraw, publicar sem editar payload, Master autor impedido e múltiplos editores preservados mesmo após retirar coeditor.
- [ ] Testar revisão em paralelo com publicação vigente, duas publicações concorrentes (exatamente uma vence), revogar acesso entre leitura/gravação, replay idempotente sem novo evento e chave repetida com payload diferente rejeitada com 409.
- [ ] Testar prazos civis em Manaus, revisão de 29/02 limitada no ano seguinte, vencimento sem arquivamento, archive/restore com motivo, restore_revision como rascunho e movimento que tenta criar ciclo/abrir acesso.
- [ ] Rodar `node scripts/conhecimento-workflow-test.mjs` e storage: FAIL inicial. Implementar estado/participantes/auditoria própria e SQL guardado; rodar novamente: PASS. Commit `feat(conhecimento): add revision and publication workflow`.

## Tarefa 4 — API leitura busca e comandos

**Arquivos:** criar rota catch-all prevista, `scripts/conhecimento-http-test.mjs`; serviço/repositório recebem projeções da tarefa 2.

**Interfaces:** URLs/payloads/status definidos no desenho, sem adicionar campos ao Snapshot de compras. `listVisible(ctx,query):Promise<{items:PageView[];total:number;nextCursor?:string}>`; autorização antes de total/paginação. Busca parametrizada e ordenação estável.

- [ ] Preparar sessões fictícias de todos os perfis usando ambiente próprio e conferir `localDevelopmentBase()` igual a 5182. Não apontar scripts a produção.
- [ ] Criar testes HTTP que falhem: 401 anônimo, 404 para IDs invisíveis, 403 ação proibida em entrada visível, 409 obsoleto, origem inválida, público ampliado sem Master e nenhuma identidade sensível na resposta.
- [ ] Incluir busca/totais/árvore sem vazamento, folha compartilhada sem nomes dos pais/irmãos, histórico anterior restrito, inativo e usuário recém-trocado de setor.
- [ ] Com servidor `npm.cmd run dev -- --hostname 127.0.0.1` na raiz/porta reservadas, rodar `node scripts/conhecimento-http-test.mjs`: FAIL inicial; implementar endpoints/validação; repetir: PASS. Commit `feat(conhecimento): expose authorized library API`.

## Tarefa 5 — Anexos privados e multipart

**Arquivos:** criar `lib/conhecimento/files.ts`, `uploads.ts`, `scripts/conhecimento-files-test.mjs`; integrar subrotas à rota da tarefa 4. Alterar `worker/index.ts` apenas se a avaliação demonstrou necessidade.

**Interfaces:** `startUpload(ctx,pageId,revisionId,expectedVersion,descriptor):UploadSession`, `putPart(ctx,uploadId,partNumber,stream)`, `completeUpload(ctx,uploadId,parts,expectedVersion):FileDescriptor`, `abortUpload(ctx,uploadId)`, `downloadFile(ctx,fileId,revisionId):Response`, `reconcileUploads(ctx,now):ReconcileResult`. Sessão/partes/ETags e tamanho permanecem controlados pelo servidor.

- [ ] Escrever casos para 256 MiB permitido, acima rejeitado; parte regular de 8 MiB, última menor; 20 arquivos permitidos/21º negado; XLSB válido e pacote/extensão incompatíveis rejeitados.
- [ ] Incluir arquivo interrompido, hash falso, parte repetida idempotente, sessão expirada em 24 h, conta desativada/revogação entre partes e finalização, R2 completo seguido de falha D1 e reconciliação sem expor órfão.
- [ ] Testar download de anexo antigo restrito, enumeração por hash negada e um upload não virando publicação; histórico mantém bytes após retirar anexo da revisão nova.
- [ ] Rodar `node scripts/conhecimento-files-test.mjs`: FAIL inicial. Implementar stream, integridade incremental, staged/ready e guardas; repetir: PASS. Medir fixture de 125 MiB e verificar headers privados. Commit `feat(conhecimento): support private multipart attachments`.

## Tarefa 6 — Interface e integração mínima ao shell

**Arquivos:** criar os seis componentes/CSS mapeados; modificar `app/process-navigation.ts`, `app/dashboard-shell.tsx`, `app/dashboard.tsx` e se necessário import em `app/layout.tsx`. Criar `scripts/conhecimento-ui-test.mjs`.

**Interfaces:** `KnowledgePanel({me,capabilities})`, `KnowledgeEditor({page,revision,onSaved})`, `KnowledgeReview({snapshot,onDecision})` consomem projeções/URLs anteriores; navegação mantém as filas existentes. Concessões editáveis apenas no painel Master.

- [ ] Definir testes de comportamento para ver vigente durante revisão, envio sem autoaprovação, devolução com observação, 409 mantendo edição na aba, revisão pendente por data e todos os estados de salvamento/upload.
- [ ] Implementar árvore/filtros/editor formatado, leitura de documento pronto, histórico, revisão e gestão Master. Rascunhos restritos não ficam em armazenamento persistente do navegador. Não exibir caminhos brutos do NAS a leitores.
- [ ] Rodar `node scripts/conhecimento-ui-test.mjs` e testes HTTP. Verificar no navegador desktop e 390 px, claro/escuro, teclado/foco, colagem e saída com alterações. Registrar evidência real e limitações, sem alegar sucesso só por inspeção de código.
- [ ] Rodar tipos e testes de navegação existentes; commit `feat(conhecimento): integrate library workspace`.

## Tarefa 7 — Prévia de ingestão sem tocar no NAS

**Arquivos:** criar `lib/conhecimento/import.ts`, `scripts/conhecimento-import-preview.mjs`, `scripts/conhecimento-import-test.mjs` e instruções operacionais na pasta do módulo. Fixtures próprias sob `scripts/fixtures/conhecimento/`, sem nomes/conteúdo real.

**Interfaces:** `validateManifest(input):ImportManifest`, `previewImport(manifest,existing):ImportPreview`, `applyFixtureImport(db,manifest):ImportResult`. Manifesto usa chave estável de origem/hash confirmado, setor, tipo, origens e classificação pendente; nunca presume vigência, responsável ou aprovação.

- [ ] Criar casos de repetição sem duplicar, mudança de bytes na mesma origem como divergência, três cópias gerando uma entrada com aliases, complementar mantido e manifesto inválido sem gravação parcial.
- [ ] Gerar fixture com 557 entradas/31 marcadores complementares e sete áreas, sem copiar documentos reais. Toda entrada criada fica em rascunho, somente Master/editores designados.
- [ ] Rodar `node scripts/conhecimento-import-test.mjs`: FAIL inicial; implementar prévia/idempotência; repetir: PASS. A ferramenta não executa ingestão real por padrão e não acessa o NAS durante os testes.
- [ ] Documentar etapa real posterior: autorização, acesso NAS somente leitura, revalidação de hashes, transferência privada, conferência de público/responsável e aprovação por pessoa distinta; commit `feat(conhecimento): prepare safe catalog import preview`.

## Tarefa 8 — Verificação integrada e entrega

**Arquivos:** atualizar `docs/modulos/conhecimento-pops/ENTREGA.md`, desenho se houver decisões técnicas novas e versão do sistema se coordenada. Não incluir catálogo real/segredos nos commits.

- [ ] Executar suítes `conhecimento-policy`, `workflow`, `storage`, `http`, `files`, `ui`, `import` com resultados reais. Testar fluxo completo fictício: criação → upload → edição → submissão → outro aprovador publica → leitura setorial → revisão/arquivo/restauração.
- [ ] Rodar `node node_modules/typescript/bin/tsc --noEmit`, `npm.cmd run build`, `node scripts/process-navigation-test.mjs`, `node scripts/local-auth-test.mjs`, `node scripts/workflow-test.mjs`, `node scripts/budget-files-test.mjs` e regressões adicionais afetadas por arquivos comuns. Falha preexistente deve ser distinguida por evidência, não ocultada.
- [ ] Revisar matriz em uso e diff compartilhado com o coordenador; registrar ordem proposta da migração, dependências, limitações e passos de validação. Sem migração/publicação em produção.
- [ ] Conferir `git diff --check` e ausência de reais/credenciais; commit e push somente `codex/conhecimento-pops`. Informar SHA completo final e aguardar integração do coordenador.

## Revisão do plano e situação

Cobertura: política/vínculos na tarefa 2; persistência/estados na 1/3; API/busca na 4; arquivos grandes e histórico binário na 5; experiência completa na 6; acervo e aliases na 7; integração/regressões na 8. Os cinco riscos de revisão têm casos atribuídos às tarefas. Nenhuma tarefa foi executada nesta entrega documental.

O plano permite execução direta nesta sessão após a revisão do desenho/plano pelo usuário. Recomenda-se esse método para manter os contratos de política, revisão e armazenamento consistentes. Execução por subagentes só será usada se escolhida; a revisão independente do desenho nesta preparação não inicia implementação.
