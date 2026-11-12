# Redesign global da Central de Compras — Plano de Implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. As etapas usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** Aplicar à interface autenticada inteira uma linguagem visual limpa, ampla e facilmente identificável, com navegação azul/accent compacta e expansível, sem alterar regras, permissões, dados ou integrações.

**Arquitetura:** Manter os componentes e ações existentes e extrair somente o shell de navegação/cabeçalho para um componente próprio. Carregar uma nova camada CSS por último para modernizar tokens, formulários, tabelas, cartões, janelas e painéis de domínio sem duplicar lógica de negócio; mudanças de marcação ficam restritas a classes e agrupamentos necessários à hierarquia visual.

**Stack:** React 19, TypeScript 5.9, Vinext/Next 16, CSS nativo com variáveis semânticas, Lucide React, testes de contrato em Node.js e verificação visual no navegador.

**Especificação:** `docs/superpowers/specs/2026-11-12-redesign-global-design.md`

## Restrições globais

- Preservar eventos, payloads, endpoints, filtros, validações, permissões e registros existentes.
- Não alterar banco D1, armazenamento R2, credenciais, perfis, OpenClaw nem o ID da hospedagem Sites.
- Não criar funções acadêmicas presentes apenas nas imagens de referência.
- Usar a marca oficial `public/estrela-2026.png` sem redesenhar suas formas, cores ou gradientes.
- Manter os modos claro, escuro e automático e as 11 cores de destaque já disponíveis.
- Preservar navegação por teclado, rótulos acessíveis, foco visível e alvos de toque com no mínimo 40 px.
- A barra compacta sempre terá controle visível para revelar os nomes; o uso não dependerá de tooltip.
- Em até 900 px a navegação será um painel sobreposto; em até 600 px campos e ações principais serão empilhados.
- Nenhuma validação poderá enviar mensagens reais a fornecedores.
- Publicar apenas pelo fluxo oficial Sites no projeto existente, nunca por `wrangler deploy` direto.

## Foco da revisão

- Preferência de menu ausente, inválida ou indisponível: iniciar em modo compacto seguro e continuar permitindo expandir/recolher.
- Usuário com nome longo ou tela estreita: cabeçalho deve truncar textos sem esconder Aparência, senha, saída ou abertura do menu.
- Tema escuro combinado com qualquer uma das 11 cores: texto, foco, botões e estados precisam continuar legíveis.
- Janelas e formulários longos em celular: cabeçalho e ações devem permanecer alcançáveis, sem corte horizontal.
- Perfis com menus diferentes: somente áreas autorizadas devem aparecer, sem alterar a fonte `visibleViews` nem expor contadores/dados bloqueados.

---

## Mapa de arquivos

- Criar `app/dashboard-shell.tsx`: barra lateral, expansão/recolhimento, painel móvel, cabeçalho, saudação e ações de sessão.
- Criar `app/redesign.css`: camada visual final para shell, componentes globais, painéis de domínio, responsividade e impressão de estados.
- Modificar `app/dashboard.tsx`: consumir o shell e manter dentro dele todas as telas e ações atuais.
- Modificar `app/layout.tsx`: importar `redesign.css` depois das folhas existentes.
- Modificar pontualmente `app/workflow-panel.tsx`, `app/integration-panel.tsx`, `app/users-panel.tsx`, `app/budget-record-panel.tsx`, `app/budget-request-form.tsx`, `app/draft-request-form.tsx` e `app/request-history.tsx`: adicionar apenas classes/agrupamentos semânticos necessários.
- Criar `scripts/redesign-shell-test.mjs`: contrato estrutural do shell, marca, acessibilidade, persistência e integração com permissões.
- Criar `scripts/redesign-styles-test.mjs`: contrato dos tokens, estados, responsividade, foco e componentes compartilhados.
- Modificar `IMPLEMENTACAO.md` e `CONTINUAR-NO-VSCODE.md`: registrar a nova estrutura, arquivos e verificações.

### Tarefa 1: Base semântica e contrato visual

**Arquivos:**
- Criar: `scripts/redesign-styles-test.mjs`
- Criar: `app/redesign.css`
- Modificar: `app/layout.tsx`

**Interfaces:**
- Consome: variáveis de `app/appearance.css`, especialmente `--surface`, `--canvas`, `--ink`, `--muted`, `--line`, `--accent`, `--accent-base`, `--accent-soft` e `--focus`.
- Produz: classes globais do redesenho carregadas por último, sem substituir IDs, nomes de campos ou handlers.

- [ ] **Etapa 1: escrever o teste de contrato visual com falha**

  O teste deve ler `app/layout.tsx`, `app/redesign.css`, `app/appearance.css` e `app/appearance.ts` e afirmar: importação final de `./redesign.css`; 11 IDs de destaque preservados; regras para `:focus-visible`, `prefers-reduced-motion`, tema escuro, `.button`, `.panel`, `input/textarea/select`, `table`, `.badge`, `dialog` e `.alert`; alvos interativos com altura mínima de 40 px.

- [ ] **Etapa 2: executar o teste e confirmar a falha**

  Executar: `node scripts/redesign-styles-test.mjs`

  Esperado: falha informando que `app/redesign.css` ou sua importação ainda não existe.

- [ ] **Etapa 3: criar a camada de tokens e componentes base**

  Em `app/redesign.css`, definir espaçamento, raios, sombras e tipografia como aliases das variáveis semânticas existentes; modernizar botões, campos, cartões, tabelas, badges, alertas, estados vazios e foco. Usar `color-mix` com `--accent`/`--surface` para que todas as cores de destaque funcionem nos dois temas. Adicionar transições curtas e anulá-las sob `prefers-reduced-motion: reduce`.

- [ ] **Etapa 4: importar a camada visual por último**

  Em `app/layout.tsx`, adicionar `import "./redesign.css";` depois de `budget.css`, garantindo que a nova camada seja somente apresentação.

- [ ] **Etapa 5: executar o contrato e as verificações de compilação**

  Executar: `node scripts/redesign-styles-test.mjs` e `node node_modules/typescript/bin/tsc --noEmit`.

  Esperado: ambos terminam com código 0.

- [ ] **Etapa 6: criar commit da base visual**

  Executar: `git add app/layout.tsx app/redesign.css scripts/redesign-styles-test.mjs && git commit -m "feat: add global visual system"`.

### Tarefa 2: Shell autenticado, navegação e cabeçalho

**Arquivos:**
- Criar: `app/dashboard-shell.tsx`
- Criar: `scripts/redesign-shell-test.mjs`
- Modificar: `app/dashboard.tsx`
- Modificar: `app/redesign.css`

**Interfaces:**
- Consome: `visibleViews(role)` de `app/access.ts`, `AppearanceControl`, `public/estrela-2026.png`, o tipo `View` e os itens atuais de navegação.
- Produz: `DashboardShell(props)` com `view`, `allowedViews`, `userName`, `roleLabel`, `pendingApprovals`, `onNavigate` e `children`; chave local `estrelas-sidebar-v1`; atributos `data-sidebar` e `data-mobile-nav` no shell.

- [ ] **Etapa 1: escrever o teste estrutural do shell com falha**

  O teste deve afirmar que `dashboard-shell.tsx` referencia `/estrela-2026.png`, `estrelas-sidebar-v1`, `aria-expanded`, `aria-controls`, `aria-current="page"`, `America/Manaus`, `AppearanceControl`, `/alterar-senha` e `/api/auth/logout`; deve também verificar que `dashboard.tsx` ainda chama `visibleViews(data.me.role)` e renderiza `DashboardShell`.

- [ ] **Etapa 2: executar o teste e confirmar a falha**

  Executar: `node scripts/redesign-shell-test.mjs`.

  Esperado: falha porque o componente ainda não existe.

- [ ] **Etapa 3: implementar `DashboardShell`**

  Criar um componente cliente com barra de 76 px recolhida e 264 px expandida, preferência persistida em `localStorage`, expansão acessível por botão sempre visível e fallback seguro quando o armazenamento falhar. Em até 900 px, manter a área principal em largura total e abrir a navegação como painel sobreposto com botão, backdrop e fechamento por Escape.

- [ ] **Etapa 4: implementar identidade e cabeçalho contextual**

  Exibir a logo oficial em suporte branco, nome da área ativa, saudação com primeiro nome e data formatada em `pt-BR` com `timeZone: 'America/Manaus'`. Manter Aparência, alterar senha e sair visíveis; nomes longos devem truncar sem deslocar ações.

- [ ] **Etapa 5: integrar o shell ao painel sem alterar autorizações**

  Em `app/dashboard.tsx`, remover apenas a marcação antiga de `aside`/`topbar`, passar exatamente o resultado de `visibleViews(data.me.role)` e conservar todo conteúdo de `<main>`, estados, handlers, filtros, modais e chamadas de API.

- [ ] **Etapa 6: estilizar estados recolhido, expandido e móvel**

  Em `app/redesign.css`, adicionar posicionamento, indicador ativo, contador, rótulos, avatar, backdrop, transições e breakpoints. O controle de expansão deve permanecer identificável no modo compacto sem depender de tooltip.

- [ ] **Etapa 7: executar testes do shell e permissões**

  Executar: `node scripts/redesign-shell-test.mjs`, `node scripts/local-auth-test.mjs`, `node scripts/finance-profile-test.mjs` e `node node_modules/typescript/bin/tsc --noEmit`.

  Esperado: todos terminam com código 0 e os menus continuam derivados do perfil.

- [ ] **Etapa 8: criar commit do shell**

  Executar: `git add app/dashboard-shell.tsx app/dashboard.tsx app/redesign.css scripts/redesign-shell-test.mjs && git commit -m "feat: redesign authenticated navigation"`.

### Tarefa 3: Visão geral, listas, cartões e tabelas

**Arquivos:**
- Modificar: `app/dashboard.tsx`
- Modificar: `app/redesign.css`
- Modificar: `scripts/redesign-styles-test.mjs`

**Interfaces:**
- Consome: classes e handlers existentes de métricas, solicitações, fornecedores, filtros, WhatsApp e configurações.
- Produz: hierarquia visual consistente para `.page-heading`, `.metrics`, `.overview-grid`, `.panel`, `.filters`, `.table-scroll`, `.supplier-grid`, `.integration-banner` e `.bottom-grid`.

- [ ] **Etapa 1: ampliar o teste com os estados das telas principais**

  Adicionar asserções para cabeçalho de página compacto, cartões de métrica, linha de tabela em hover/foco, tabela responsiva, filtros quebráveis, cartões de fornecedor, estado vazio e barra de ações móvel. Incluir asserção de `overflow-wrap`/`text-overflow` para conteúdo longo.

- [ ] **Etapa 2: executar e confirmar a nova falha**

  Executar: `node scripts/redesign-styles-test.mjs`.

  Esperado: falha nos seletores ainda ausentes.

- [ ] **Etapa 3: refinar a hierarquia da visão geral e das filas**

  Ajustar somente classes e agrupamentos necessários em `dashboard.tsx`; manter textos, funções `table`, `navigate`, `save`, contagens e filtros. Usar fundo suave, cartões brancos/escuros delimitados, métricas compactas e linha de tabela com estado fácil de reconhecer.

- [ ] **Etapa 4: refinar fornecedores, WhatsApp e configurações**

  Aplicar o mesmo padrão a cartões, banners, listas de passos e formulários administrativos; ações perigosas permanecem semanticamente separadas e a integração continua apenas informativa durante os testes.

- [ ] **Etapa 5: verificar telas principais**

  Executar: `node scripts/redesign-styles-test.mjs`, `node scripts/approval-visibility-test.mjs`, `node scripts/estimate-view-test.mjs` e `node scripts/workflow-test.mjs`.

  Esperado: código 0 em todos, sem mudança nas regras de visibilidade ou fluxo.

- [ ] **Etapa 6: criar commit das telas principais**

  Executar: `git add app/dashboard.tsx app/redesign.css scripts/redesign-styles-test.mjs && git commit -m "feat: refresh dashboard lists and cards"`.

### Tarefa 4: Formulários e painéis de domínio

**Arquivos:**
- Modificar: `app/workflow-panel.tsx`
- Modificar: `app/integration-panel.tsx`
- Modificar: `app/users-panel.tsx`
- Modificar: `app/budget-record-panel.tsx`
- Modificar: `app/budget-request-form.tsx`
- Modificar: `app/draft-request-form.tsx`
- Modificar: `app/redesign.css`
- Modificar: `scripts/redesign-styles-test.mjs`

**Interfaces:**
- Consome: componentes, nomes de campos, ações, permissões e contratos atuais desses painéis.
- Produz: classes semânticas `domain-section`, `section-heading`, `form-section`, `field-grid`, `action-bar` e `status-summary`, sem alterar `name`, `value`, `onSubmit`, payload ou condição de exibição.

- [ ] **Etapa 1: adicionar testes de estrutura e densidade dos formulários**

  Verificar que os painéis usam seções identificadas, rótulos permanecem associados aos controles, grids caem para uma coluna em até 600 px, campos têm largura mínima segura e ações primária/secundária/perigosa não se confundem. Verificar também que nenhuma regra CSS oculta controles por perfil.

- [ ] **Etapa 2: executar e confirmar a falha**

  Executar: `node scripts/redesign-styles-test.mjs`.

  Esperado: falha nas novas classes/condições responsivas.

- [ ] **Etapa 3: agrupar visualmente conferência, execução e prestação de contas**

  Em `workflow-panel.tsx` e `budget-record-panel.tsx`, adicionar apenas wrappers e títulos visuais coerentes, preservando a separação funcional já implementada, a estimativa antes da aprovação administrativa e o botão **Salvar e enviar para Diretoria Geral**.

- [ ] **Etapa 4: modernizar solicitação, rascunho, usuários e integração**

  Aplicar grids, cabeçalhos de seção e barras de ação a formulários novos/complementações, anexos, usuários e OpenClaw. Manter autosave, privacidade do rascunho, anexos R2, exclusão protegida de usuários e envio real desativado.

- [ ] **Etapa 5: executar a suíte funcional dos painéis alterados**

  Executar: `node scripts/administrative-simplification-test.mjs`, `node scripts/administrative-stages-test.mjs`, `node scripts/request-drafts-test.mjs`, `node scripts/budget-test.mjs`, `node scripts/budget-flow-test.mjs`, `node scripts/budget-files-test.mjs`, `node scripts/budget-records-test.mjs`, `node scripts/local-auth-test.mjs` e `node scripts/integration-test.mjs`.

  Esperado: todos terminam com código 0; nenhum teste faz envio real.

- [ ] **Etapa 6: criar commit dos painéis**

  Executar: `git add app/workflow-panel.tsx app/integration-panel.tsx app/users-panel.tsx app/budget-record-panel.tsx app/budget-request-form.tsx app/draft-request-form.tsx app/redesign.css scripts/redesign-styles-test.mjs && git commit -m "feat: unify forms and domain panels"`.

### Tarefa 5: Detalhes, histórico, janelas e responsividade

**Arquivos:**
- Modificar: `app/dashboard.tsx`
- Modificar: `app/request-history.tsx`
- Modificar: `app/request-archive-dialog.tsx`
- Modificar: `app/appearance.css`
- Modificar: `app/redesign.css`
- Modificar: `scripts/redesign-styles-test.mjs`

**Interfaces:**
- Consome: `Modal`, `RequestHistory`, `RequestArchiveDialog`, `AppearanceControl` e os diálogos/formulários existentes.
- Produz: cabeçalho de janela fixo, corpo rolável, barra de ações consistente, histórico legível e layouts responsivos sem overflow horizontal.

- [ ] **Etapa 1: adicionar testes dos casos críticos de janela e celular**

  Asserir `max-height`, rolagem interna, cabeçalho sticky, ações alcançáveis, largura segura `calc(100vw - ...)`, empilhamento em 600 px, foco visível e suporte a conteúdo longo. Incluir a combinação de tema escuro com `appearance-dialog` e as 11 cores existentes.

- [ ] **Etapa 2: executar e confirmar a falha**

  Executar: `node scripts/redesign-styles-test.mjs`.

  Esperado: falha nas regras de janela/responsividade ainda ausentes.

- [ ] **Etapa 3: padronizar janelas e detalhes de solicitação**

  Ajustar o `Modal` compartilhado e as classes de detalhes para cabeçalho, corpo e ações previsíveis. Arquivar/restaurar continua próximo ao título; formulários, anexos, conferência, execução, prestação de contas e histórico permanecem completos.

- [ ] **Etapa 4: padronizar histórico, arquivamento e Aparência**

  Melhorar apenas leitura, espaçamento e hierarquia. Preservar todos os eventos e a restrição de arquivamento ao Master; o diálogo de Aparência mantém modos e cores atuais.

- [ ] **Etapa 5: executar testes de histórico e arquivamento**

  Executar: `node scripts/redesign-styles-test.mjs`, `node scripts/request-archive-test.mjs`, `node scripts/request-archive-storage-test.mjs`, `node scripts/reopen-request-test.mjs`, `node scripts/recommended-quantity-test.mjs` e `node scripts/optional-needed-date-test.mjs`.

  Esperado: todos terminam com código 0.

- [ ] **Etapa 6: criar commit de detalhes e responsividade**

  Executar: `git add app/dashboard.tsx app/request-history.tsx app/request-archive-dialog.tsx app/appearance.css app/redesign.css scripts/redesign-styles-test.mjs && git commit -m "feat: polish dialogs and responsive details"`.

### Tarefa 6: Verificação integral, documentação e publicação

**Arquivos:**
- Modificar: `IMPLEMENTACAO.md`
- Modificar: `CONTINUAR-NO-VSCODE.md`
- Modificar: `docs/superpowers/specs/2026-11-12-redesign-global-design.md` somente se a implementação exigir registrar uma decisão visual já tomada.

**Interfaces:**
- Consome: todas as entregas anteriores e o projeto Sites identificado por `.openai/hosting.json`.
- Produz: documentação atualizada, pacote validado e nova versão no Site existente.

- [ ] **Etapa 1: executar a suíte de regressão sem servidor**

  Executar pelo menos: `node scripts/redesign-shell-test.mjs`, `node scripts/redesign-styles-test.mjs`, `node scripts/login-brand-test.mjs`, `node scripts/local-auth-test.mjs`, `node scripts/workflow-test.mjs`, `node scripts/estimate-trigger-test.mjs`, `node scripts/approval-visibility-test.mjs`, `node scripts/automatic-estimate-test.mjs`, `node scripts/budget-flow-test.mjs`, `node scripts/request-drafts-test.mjs`, `node scripts/request-archive-test.mjs`, `node scripts/finance-profile-test.mjs`, `node scripts/integration-test.mjs` e `node scripts/openclaw-test.mjs`.

  Esperado: todos terminam com código 0, sem habilitar ou enviar mensagens reais.

- [ ] **Etapa 2: executar tipos, lint de diferenças e build**

  Executar: `node node_modules/typescript/bin/tsc --noEmit`, `git diff --check` e `npm.cmd run build`.

  Esperado: código 0 em todos.

- [ ] **Etapa 3: fazer verificação visual autenticada**

  Iniciar o servidor local e verificar no navegador: Master e Setor; Visão geral, Solicitações, Estimativas, Aprovações, Orçamento, Configurações e detalhes; barra recolhida/expandida; tema claro/escuro; pelo menos Azul, Azul-petróleo e Laranja; desktop 1440 px, tablet 900 px e celular 390 px. Confirmar que nenhuma ação externa é disparada.

- [ ] **Etapa 4: conferir os cinco focos de revisão**

  Testar armazenamento indisponível/inválido, nome longo, todos os acentos no escuro, formulário longo no celular e perfis com menus diferentes. Corrigir qualquer falha antes de publicar.

- [ ] **Etapa 5: atualizar documentação operacional**

  Registrar novos arquivos, chave `estrelas-sidebar-v1`, breakpoints, comandos de teste e confirmação de que o redesenho não alterou regras ou integrações.

- [ ] **Etapa 6: criar commit final verificado**

  Executar: `git add IMPLEMENTACAO.md CONTINUAR-NO-VSCODE.md docs/superpowers/specs/2026-11-12-redesign-global-design.md && git commit -m "docs: record global interface redesign"` quando houver mudanças nesses arquivos.

- [ ] **Etapa 7: publicar pelo Sites e validar produção**

  Usar o fluxo oficial Sites com o mesmo `project_id`, preservar a audiência pública protegida pelo login local e aguardar implantação concluída. Abrir `https://ceea.colegioestrelas.com`, confirmar a versão nova, login, shell, tema e uma tela de leitura; não executar compras, WhatsApp ou mutações de produção.

