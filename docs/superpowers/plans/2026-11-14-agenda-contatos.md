# Agenda de contatos — plano de implementação

**Objetivo:** implementar o design aprovado em `../specs/2026-11-14-agenda-contatos-design.md`, na worktree Compras, porta 5185. Execução nesta sessão; sem nova rodada de aprovação de escopo.

## Contratos e divisão

`app/contact-model.ts` define somente tipos compartilhados. Agenda preserva `supplier` e acrescenta `agenda_contact`; contatos gerais nunca são fornecedores antes da classificação explícita. Sem migração. Novos contatos têm UUID aleatório estável após criação, com guarda SQL atômica por telefone; deduplicar também fornecedores legados e formatos +/sem +. Não sobrescrever cadastros nas importações.

1. **Parser e telefone** — `app/contact-import.ts`, `integrations/openclaw/contact-phone.mjs`, `scripts/contact-import-test.mjs`. Exportar `parseContactFile(text, format: 'csv'|'vcf', countryCode='55'): ContactParseResult` e `normalizeContactPhone(value,countryCode='55'): string|undefined`. Limites 5 MB e 5.000 números; erros visíveis e deduplicação por telefone. Implementador independente executa testes RED/GREEN com fixtures, sem dados reais.
2. **Interface** — `app/contact-agenda.tsx` e componentes/estilos próprios `app/contact-*.tsx`, `app/contact-agenda.css`. Props `{onChanged:()=>Promise<void>;categories:string[]}`. Consome `/api/contacts`; busca/filtros/páginas, edição e classificação sequencial em lote, importação com prévia e lotes de até 50, sincronização com prévia. Não editar dashboard/navegação/model compartilhado nesta tarefa.
3. **Adaptador WhatsApp** — `integrations/openclaw/contact-sync.mjs`, `scripts/contact-sync-test.mjs`. `readKnownWhatsAppContacts({dbPath,sessionsDbPath})` retorna `{contacts,candidates,skipped,coverage:'known_conversations'}`; SQLite somente leitura e extração escalar de identidade no canal/conta corretos, sem corpo/anexo. `runContactSync(config,{site?,readContacts?,dbPath?,sessionsDbPath?})` consulta `contact_sync_poll` com `protocol:'contacts-v1'`, entrega páginas de até 50 em `contact_sync_result` com `{syncId,leaseToken,page,contacts,done,counts?,error?,warnings?}`. Máximo 5.000 contatos; erro explícito para esquema/fonte/limite. Implementador independente RED/GREEN usando SQLite fictício.
4. **API/persistência/integração** — responsável principal: `lib/contact-agenda.ts`, `lib/contact-sync.ts`, `app/api/contacts/route.ts`; ligar bridge em `lib/integration-endpoint.ts`, runner e capacidade em `client.mjs`; ligar agenda no dashboard/navegação e seleção de todos compatíveis no formulário. Testes D1/HTTP locais e regressões de fornecedores/perfis.

## API administrativa

GET `/api/contacts`: `ContactsSnapshot` com `entries`, `sync?`, `bridgeReady`. Apenas Master/ADM; outros papéis 403, anônimo 401; nenhum dado em `/api/data` para perfis restritos.

POST, mesma permissão, origem e JSON/corpo limitado:

- `save`: `{id?,version?,classification:'unclassified'|'general'|'supplier',data:ContactDraft & {contact?,scope?:'local'|'national'}}`; atualizar explicitamente com versão. Fornecedor exige categoria/abrangência; fornecedor existente não é despromovido/excluído. Mudança de telefone com envio running/uncertain recusada atomicamente; guardas existentes de versão/telefone na retirada da fila permanecem.
- `import`: `{contacts:ContactDraft[1..50],source:{kind:'csv'|'vcf',label}}`; retorna `{created,existing,conflicts,results}`. Validar lote inteiro antes da escrita. Criação manual usa `save` e deduplica.
- `request_sync`: solicita/retorna sincronização; não faz chamada WhatsApp pelo navegador. Só uma solicitação ativa global. CLI/ponte antiga não recebe tarefas de contato como cotação.
- `import_sync`: `{syncId,phones:string[1..50]}`; importar somente contatos contidos na prévia de uma solicitação concluída correspondente. Origem WhatsApp não é aceita como proveniência arbitrária de um arquivo.

## Protocolo da ponte

`contact_sync_poll` anuncia capacidade e contato recente da ponte; retorna `job:null` ou `{syncId,leaseToken,leaseUntil}`. Não lê SQLite sem solicitação ativa. Lease de 15 minutos. Reexecução após lease vencido reinicia páginas com outro token; resultados atrasados rejeitados.

`contact_sync_result` valida lease, página em ordem, até 50 contatos por página, máximo total 5.000, campos e tamanho. Guardar hash por página para repetição idêntica e rejeitar repetição divergente. `done` muda para `review`; erro saneado para `failed`. O snapshot administrativo nunca contém leaseToken. Sem escrita em contatos ou supplier antes de `import_sync` humano.

Runner: contatos depois da inbox e antes do poll normal, com `config.contactsSync=true` somente na configuração da ponte atualizada. Erros de contato não interrompem inbox/tarefas atuais; servidor antigo/ponte antiga preservam fluxo existente. Não atualizar instalação de produção nem iniciar ponte nesta worktree.

## Verificação e entrega

- [x] RED/GREEN dos parsers, persistência/corrida, sincronização e adapter.
- [x] Testar dedupe com fornecedor legado/concorrência; edição sem sobrescrita; classificação e compatibilidade; papéis/CSRF/limites; página duplicada/lease inválido; SQL sem texto de mensagens.
- [x] HTTP somente 127.0.0.1:5185, com usuários e dados fictícios e envio desligado.
- [x] UI desktop/celular: agenda, busca, cadastro/classificação e prévia. Evidências privadas; upload visual limitado pela permissão da extensão Chrome, parser/API/lotes cobertos automaticamente. Seleção compatível coberta por suíte específica.
- [x] Tipos, build, testes de contatos/fornecedores/importador legado/integração/perfis; revisão independente final e correções.
- [x] Documentar contratos/cobertura/configuração em INTEGRACOES e ENTREGA; commit/push só codex/compras e envio ao coordenador. Sem main, migração ou publicação/ativação em produção.
