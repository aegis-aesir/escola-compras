# Estoque — auditoria inicial e proposta de primeira versão

Data: 13/11/2026 (America/Manaus). Etapa entregue: auditoria e planejamento preliminar, sem implementação do produto. As propostas abaixo ainda precisam das decisões do usuário; não constituem regras aprovadas nem plano executivo autorizado.

## Ambiente e coordenação

- Raiz confirmada: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\estoque`.
- Branch confirmada: `codex/estoque`. Manifesto e launcher reservam `http://127.0.0.1:5181`.
- Base auditada: `fa211930be936b79aa5deee58ad3c3a307f9a927`.
- `git status --short` inicial sem alterações. Nenhuma alteração prévia foi removida.
- Coordenador: **CEEA Manager — Coordenação e publicação**, chat `01a1b74c-f58c-7bd1-a47b-ea6c53153b36`. Somente ele integra main, define a ordem final de migrações e publica.
- O SHA final desta entrega documental é informado no chat após o commit; não se tenta inserir o hash do próprio commit neste arquivo.

Foram lidos AGENTS.override.md, AGENTS.md, COORDENACAO.md, IMPLEMENTACAO.md, CONTINUAR-NO-VSCODE.md, ROADMAP.md, .ceea-workspace/INICIAR-MODULO.md e .ceea-worktree.json. Há trechos antigos sobre cópia de pedido adiado: prevalece a regra de 13/11/2026 de solicitação única, `deferredEdit` e `roundHistory`, confirmada nas instruções atuais e no código. Estoque não deve se vincular apenas ao protocolo, ignorando a rodada.

## Achados da auditoria e pontos reutilizáveis

| Parte existente | Evidência no checkout | Consequência para Estoque |
| --- | --- | --- |
| Login e sessão local | `lib/local-auth.ts`, `app/local-session.ts`: `readSession`, `currentLocalUser`, `requireLocalUser` | Usar a mesma sessão, IDs e perfis; sem novo login. A autenticação não define automaticamente quem poderá movimentar estoque. |
| Usuários e setores | `Member`, `Settings.departments` em `app/model.ts`; gestão em `app/users-panel.tsx` e API | Referenciar usuários existentes; reutilizar setores configurados. Setores são nomes, sem ID estável próprio. Mudança/remoção de setor deve preservar a referência histórica do movimento. |
| Permissões e projeções | `app/access.ts`, `app/process-navigation.ts`, `app/api/data/route.ts` | Aplicar autorização no servidor e projetar respostas por perfil. Financeiro continua só consultando compras aprovadas pela DG; não pode receber pedidos privados por meio de vínculos de estoque. |
| Shell, menu e aparência | `app/dashboard-shell.tsx`, `app/dashboard.tsx`, `app/appearance.css`, `app/redesign.css` | Integrar uma área de Estoque ao shell existente, preservando filas de compras, marca, temas e navegação móvel. O menu e a composição são pontos compartilhados. |
| Material solicitado | `itemSchema` em `app/model.ts` | Itens têm nome, quantidade inteira, unidade textual e categoria textual opcional. Não existe catálogo mestre de materiais nem ID estável por linha. Não deduzir material/categoria por nome. |
| Categorias de fornecedores | `supplierSchema`, `app/supplier-discovery.ts` | Categorias servem à pesquisa/cotação; não são automaticamente a classificação de estoque. Propor associação explícita, preservando textos e contratos existentes. |
| Recebimento atual | `app/workflow.ts`: ação `received` muda `ordered` para `received`; `app/budget-fields.ts` e `app/budget-workflow.ts`: aceite, responsável, data, situação parcial/N/A | É acompanhamento da compra, sem entradas quantitativas por item/local. Recebimento físico em estoque precisa de registro próprio e confirmação humana. Serviços/assinaturas não viram materiais automaticamente. |
| Persistência e auditoria | `db/schema.ts`, `drizzle/0000_flawless_korvac.sql`: `school`, `records` JSON com versão, `audit`; gravações condicionais em `app/api/data/route.ts` e `lib/budget-records.ts` | Reaproveitar D1, validação, versionamento e padrão de gravação com auditoria; consistência de saldo exige proteção própria contra saídas concorrentes e duplicidade. O esquema atual não tem tabelas de estoque. |
| Fechamento e reanálise | API de dados, fluxo orçamentário e históricos de rodadas | Não alterar fechamento, aprovações ou valores para viabilizar estoque. Reanálise/reapresentação não pode apagar ou repetir recebimentos físicos já registrados. |
| Histórico existente | `app/request-history.tsx` e consultas autorizadas da API | Reutilizar apresentação e padrões, mas guardar um histórico próprio completo de movimentações; a lista global limitada a 200 eventos não é extrato de estoque. |
| Isolamento local | `scripts/module-workspace.mjs`, `scripts/local-test-session.mjs`, hook pre-push da worktree | Dev e testes HTTP futuros somente no loopback 5181. Manter manifesto, hook e dados fictícios exclusivos desta pasta. |

A API geral de compras também consolida revisões legadas e avança prazos administrativos durante leituras. A API própria de Estoque deve consultar apenas o necessário, sem chamar a API geral para executar uma movimentação nem acionar esses efeitos como parte dela.

## Alternativas e recomendação preliminar

1. **Controle centralizado na administração, dentro do CEEA Manager — recomendado para a primeira versão.** Cadastro e movimentação por Master/ADM; setores com o acesso que o usuário definir. Menos etapas novas, aproveita a execução administrativa atual. Precisa confirmar a operação real da escola.
2. **Operação distribuída por setores, dentro do mesmo aplicativo.** Cada setor registra retirada/recebimento ou solicita atendimento com conferência. Atende autonomia dos setores, mas exige decidir autorização, responsabilidade, confirmação e possivelmente uma nova fila de requisições de estoque.

Nenhuma alternativa foi escolhida pelo usuário nesta etapa. Aplicativo, autenticação e hospedagem separados não atendem às restrições do projeto.

## Proposta de V1 para discussão

- **Cadastros:** material com identificador próprio, descrição, unidade base, categoria, situação ativa/inativa; unidades e categorias de estoque; locais físicos. Vínculos existentes continuam consultáveis após inativação.
- **Saldo por material e local:** entradas menos saídas e ajustes, com mínimo por material/local e alerta visual de reposição. Alerta não compra, reserva ou cria solicitação automaticamente.
- **Movimentações:** saldo inicial por inventário, entrada avulsa autorizada, entrada de compra, saída para setor/responsável e ajuste com motivo. Quantidade física e valor financeiro permanecem conceitos separados. Transferência entre locais depende da necessidade confirmada; se incluída, origem/destino devem ser gravados atomicamente.
- **Rastreabilidade:** material, local, quantidade/unidade, motivo, usuário autor por ID, identificação histórica do autor/setor, data de registro e data física quando autorizada. Propor correção por estorno vinculado, preservando o movimento original, em vez de editar saldo silenciosamente.
- **Recebimento ligado à compra:** pessoa seleciona compra/rodada/linha, associa ao material e local e confirma quantidade efetivamente recebida. Propor entregas parciais com saldo ainda a receber; repetição da mesma operação não duplica entrada. Excedentes e equivalência de embalagens precisam de regra explícita.
- **Necessidades:** mostrar consulta contextual de disponibilidade após associação explícita de material; não reduzir quantidade solicitada, reservar, atender ou cancelar pedido automaticamente. Uma requisição interna com fila/aprovação só entra se o usuário optar por esse fluxo.
- **Consulta:** saldos, mínimos, histórico completo filtrável por material/local/setor/responsável/período e referências autorizadas à compra. Não expor documentos fiscais, preços ou pedidos privados a perfis sem acesso.

Fora da proposta básica, salvo decisão expressa: patrimônio/tombamento, empréstimos de bens, lote/validade, código de barras, custeio/valorização contábil, conversão automática de embalagens, compra automática, novas aprovações e integração operacional com Escolar Manager.

## Decisões de negócio necessárias antes da implementação

| Decisão | Por que muda o produto | Recomendação ainda não aprovada |
| --- | --- | --- |
| 1. Materiais abrangidos | Consumíveis, bens emprestáveis e perecíveis exigem controles diferentes. | Começar com consumíveis; confirmar se alimentos exigem lote/validade ou se bens duráveis devem entrar desde já. |
| 2. Quem opera e quem vê | Define permissões de cadastro, entrada, saída, ajuste e estorno, além do que cada setor/DG/Financeiro pode consultar. | Master/ADM operam; definir acesso dos demais perfis com a escola. Não criar novo perfil automaticamente. |
| 3. Locais e retirada | Um almoxarifado central e estoques nos setores exigem fluxos distintos; retirada pode ser registro da administração ou pedido do setor. | Confirmar locais reais, uso de transferência e quem registra/recebe cada retirada. Não criar fila de atendimento sem necessidade. |
| 4. Unidade e embalagem | Compra usa quantidade inteira e unidade textual; estoque pode precisar de litros, quilos e frações. | Uma unidade base por material e associação/conversão conferida por pessoa; confirmar precisão, frações e necessidade de conversão na V1. Não mudar a regra de quantidades de compras. |
| 5. Recebimento de compras | Entregas parciais, excedentes, devoluções e compras antigas não podem ser inferidos do status atual. | Entrada por conferência física, parcial permitida, sem importação retroativa automática; confirmar devolução/excedente e se o aceite atual permanece independente. Compras arquivadas, reanalisadas ou de mês fechado exigem critério explícito para novos vínculos, sem reabrir mês ou alterar pedido automaticamente. |
| 6. Saldo inicial e correções | Saldo negativo, lançamento retroativo, perdas e estorno afetam confiabilidade e responsabilidade. | Inventário inicial documentado, bloquear saldo negativo e exigir motivo em ajuste/estorno. Confirmar retroatividade e se ajuste/estorno precisa de segunda conferência. |

A aprovação do escopo, a matriz de permissões e as regras aplicáveis desses seis grupos são pré-condições para começar a implementação. Valores propostos não serão tratados como respostas dadas. A integração Escolar Manager permanece somente planejamento, sem conexão, transmissão, configuração ou alteração de dados reais.

## Sequência proposta após as decisões

1. Consolidar o desenho aprovado, incluindo matriz de permissões, exemplos de compra/recebimento/retirada e regras de exceção; alinhar os contratos compartilhados com o coordenador antes da integração.
2. Implementar cadastros e saldo inicial com arquivos próprios do módulo e a mesma sessão. Validar inativação, unidade, setor e leitura por perfil.
3. Implementar entradas, saídas, ajustes e eventuais estornos/transferências com saldo consistente e histórico. Validar duas saídas simultâneas, repetição de requisição, motivo obrigatório e preservação da autoria.
4. Vincular recebimentos às compras com associação explícita e referência à rodada/linha. Validar parcial, repetição, unidade incompatível, excesso conforme regra aprovada e reanálise que preserve o movimento físico anterior.
5. Acrescentar consultas de mínimo/disponibilidade e navegação; executar regressões de compras/autenticação/orçamento e verificação visual local em desktop e celular, temas claro/escuro. Preparar entrega ao coordenador.

Esta sequência é um roteiro de escopo, não uma autorização de implementação nem um plano técnico fechado.

## Limites técnicos e contratos a alinhar

- Preferir `app/estoque/` (tipos, regras, permissões, componentes, CSS próprio), `app/api/estoque/route.ts`, `lib/estoque/` (persistência) e testes próprios em `scripts/estoque-*.mjs`. Nomes são sugestões para o desenho posterior; nenhum desses arquivos foi criado.
- Pontos compartilhados provavelmente necessários: `app/process-navigation.ts`, `app/dashboard-shell.tsx` e `app/dashboard.tsx` para abrir Estoque; `app/access.ts` se houver capacidade compartilhada; `app/model.ts` apenas se um contrato comum realmente precisar ser estendido. Reutilizar a sessão sem modificar login.
- Não ampliar `Snapshot` nem adicionar dados sensíveis ao payload geral por conveniência; preferir leitura própria paginada/projetada. Não entregar a lista completa de usuários a setores para escolher um responsável.
- Unidade, categoria e associação material/linha devem ficar em contratos próprios; não transformar retroativamente textos legados em identificadores nem inferir equivalência por descrição.
- Referência de compra precisa de ID do pedido, identificação de rodada e linha com snapshot da especificação/unidade/quantidade autorizada. Como as linhas não têm ID estável, a estratégia de identidade deve ser fechada antes de codificar. Nunca depender apenas de posição no array atual ou do protocolo.
- Comparar persistência com tipos próprios em `records` versus tabelas `estoque_*`. Recomendação técnica preliminar: tabelas próprias para movimentos, associações e saldos/versões, com unicidade/idempotência e gravação atômica com auditoria. A escolha exige desenho aprovado; não há SQL pronto ou migração aplicada. Qualquer migração será aditiva, identificada pelo módulo e ordenada pelo coordenador.
- Movimentos físicos não serão apagados/recriados por aprovação, recusa, adiamento, reanálise, arquivamento ou fechamento financeiro. Qualquer mudança no aceite/status da compra depende de regra expressa e revisão do contrato comum.
- A configuração atual permite remover um setor quando não há usuário vinculado; o estoque precisará preservar referências históricas e alinhar eventual bloqueio de remoção. Não introduzir IDs globais de setor unilateralmente.
- Responsável pelo local, destinatário físico e autor do lançamento são conceitos distintos. Definir campos exigidos a partir da operação, preservando identificação histórica se o usuário for excluído/desativado.
- Sem nova dependência prevista para esta etapa; sem novo repositório, aplicação, domínio ou hospedagem.

## Validações executadas nesta etapa

Todos os comandos de shell usaram explicitamente a raiz da worktree como `workdir`.

| Comando/verificação | Resultado real |
| --- | --- |
| `git rev-parse --show-toplevel` | Raiz exclusiva de Estoque confirmada. |
| `git branch --show-current` | `codex/estoque`. |
| `git status --short` inicial | Sem alterações. |
| Leitura do manifesto, launcher e configuração `core.hooksPath` | Porta 5181 e hook exclusivo da worktree confirmados. |
| Verificação Node em memória de `readModuleWorkspace`, `localDevelopmentBase`, `developmentArguments`, `allowedModulePush` | Código 0; branch/loopback 5181 corretos, push para main recusado, push para `codex/estoque` permitido. Sem iniciar servidor. |
| `node scripts/workflow-test.mjs` | Código 0; separação dos papéis, prazo útil, feriado e busca nacional passaram nas asserções existentes. |
| `node scripts/process-navigation-test.mjs` | Código 0; menu por perfil e filas exclusivas passaram. |
| `node node_modules/typescript/bin/tsc --noEmit` | Código 0, sem diagnósticos. |

São verificações da base auditada; não comprovam funcionalidade de estoque, que ainda não foi implementada. Não houve build, teste HTTP, servidor de desenvolvimento, inspeção visual ou migração nesta etapa documental. As saídas locais dos testes são ignoradas pelo Git. Nenhum banco real, credencial, anexo, R2, cofre ou runtime de produção foi copiado ou acessado. Nenhuma ponte ou mensagem real foi acionada.

## Entrega e verificação pelo coordenador

- Arquivo alterado nesta etapa: somente `docs/modulos/estoque/ENTREGA.md` (novo).
- Arquivos compartilhados alterados: nenhum.
- Migrações, dependências ou configurações alteradas: nenhuma.
- Pendência principal: respostas do usuário às decisões de negócio e aprovação do desenho antes da implementação.
- Conferir o SHA final informado no chat, revisar o diff documental da `codex/estoque` e executar `git diff --check`. Não há módulo funcional para publicar nesta entrega.
- Nenhuma mensagem automática foi enviada ao coordenador. O usuário pode encaminhar o resumo e o SHA final pelo próprio chat.
