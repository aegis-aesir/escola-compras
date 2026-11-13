# Integração Escolar Manager — auditoria e plano provisório v0.2

Data: 13/11/2026, America/Manaus. Etapa: somente planejamento. Este documento não é um escopo aprovado nem um plano executável de conector.

Atualizado com as respostas do usuário nesta sessão: Escolar Manager **Web**, versão **2026.21.1.3**; finalidade de complementar funções com biblioteca de conhecimentos do Estrelas e onboarding de RH, gestão de tarefas/responsabilidades e possível estoque compartilhado. O usuário **ainda vai avaliar** onde ficará o estoque oficial. Essa decisão permanece aberta, sem escolha automática.

## 1. Ambiente e limites confirmados

- Raiz: `C:\Users\aegis\Documents\ChatGPT\Compras\escola-compras\.worktrees\integracao-escolar-manager`.
- Branch: `codex/integracao-escolar-manager`. Base auditada: `fa211930be936b79aa5deee58ad3c3a307f9a927`.
- Manifesto reserva `http://127.0.0.1:5184`; nenhum servidor foi iniciado nesta etapa.
- Git estava limpo no início. Hook próprio de pre-push configurado; manifesto e hook preservados.
- Leituras obrigatórias: AGENTS.override.md, AGENTS.md, COORDENACAO.md, IMPLEMENTACAO.md, CONTINUAR-NO-VSCODE.md, ROADMAP.md, .ceea-workspace/INICIAR-MODULO.md e .ceea-worktree.json.
- Nenhuma conexão ao Escolar Manager, consulta a banco, transferência de registros escolares ou alteração de dados reais. Pesquisa externa limitada a páginas públicas e mecanismos de busca.
- Não abrir `/api/data` para descoberta: o código do GET chama consolidação de revisões e, para administração, avanço de prazos. A auditoria foi estática.
- Somente o coordenador `01a1b74c-f58c-7bd1-a47b-ea6c53153b36` integra main e publica. Não há mensagem automática para outros chats nesta entrega.

## 2. Fatos, hipóteses e pendências

| Classificação | Evidência / conclusão | Limite |
| --- | --- | --- |
| Confirmado no código | Produto local CEEA Manager; versão visível `2026.11.13.6` em `app/system-version.ts` | Não identifica versão publicada nem versão do Escolar Manager |
| Confirmado no projeto | React/Vinext, Workers/D1, login local, cinco perfis e documentos privados | Sem nova aplicação, hospedagem, autenticação ou dependência |
| Confirmado no projeto | ROADMAP exige planejar direção, frequência, permissões e interfaces reais | Não define dados a trocar nem prioridade de negócio |
| Confirmado na pesquisa pública | Marca e site do fornecedor: Escolar Manager, `https://www.escolarmanager.com.br/`; catálogo com Web, Cursos e Smart [S1] | Razão social/contratação da escola e suporte a esse build ainda não verificados |
| Confirmado no catálogo público | Web anuncia contas a pagar, plano de contas e estoque; exportação XML no módulo de notas emitidas [S2] | Não comprova módulos contratados, exportação de compras, importação genérica ou API externa |
| Informado pelo usuário | Escolar Manager Web, versão `2026.21.1.3` | Versão informada, sem acessar instalação, contrato ou autenticação; não validada nas páginas públicas |
| Informado pelo usuário | Complementar com conhecimento/onboarding RH, tarefas/responsabilidades e possível estoque compartilhado | Não comprova ausência desses recursos em todas as edições do produto; descreve a necessidade desta escola |
| Informado pelo usuário | Local do estoque oficial ainda será avaliado | Não eleger origem nem habilitar sincronização de saldos |
| Proposta técnica | Conhecimento e tarefas com registros próprios no CEEA; troca externa somente quando houver finalidade comprovada | Recomendação para avaliar; detalhes pertencem aos chats desses módulos |
| Pendente | Razão social contratada, hospedagem, módulos licenciados, interfaces permitidas e documentação aplicável a `2026.21.1.3` | Impede escolher transporte e implementar conector |
| Pendente | Dados mínimos realmente compartilhados, responsáveis, periodicidade e autoridade por campo | Impede fechar qualquer troca externa |

Não foi localizado conector Escolar Manager nem identificação contratual da instalação nos arquivos versionados pesquisados. As ocorrências encontradas tratam do roadmap e da coordenação. Isso não comprova ausência de integrações privadas oferecidas pelo fornecedor.

## 3. Fontes oficiais e alcance da verificação

Consulta em 13/11/2026, sem autenticação de escola:

- **[S1]** [Página oficial Escolar Manager](https://www.escolarmanager.com.br/), leitura pública com resposta HTTP 200. Identifica a marca e as linhas de produto; não identifica a contratação da escola.
- **[S2]** [Escolar Manager Web — módulos e funcionalidades](https://www.escolarmanager.com.br/solucoes/escolar-manager-web/), leitura pública com resposta HTTP 200. Página comercial, não contrato técnico de integração.
- Buscas: `"Escolar Manager" documentação integração API fornecedor`; `site:escolarmanager.com.br (API OR webhook OR integração OR exportação OR manual OR documentação)`; `"Escolar Manager" ("API" OR "Swagger" OR "webhook" OR "manual de integração")`.
- Nessas buscas e nas duas páginas lidas, não foi encontrada documentação técnica oficial de API/webhooks/arquivos para os casos de uso abaixo. Não concluir que inexiste; solicitar ao fornecedor o documento da edição contratada.
- Não confundir integração com aplicativo do próprio produto, remessa/retorno bancário ou XML de notas emitidas com uma interface genérica para CEEA Manager. Versão de aplicativo móvel de terceiros não determina o build do sistema de gestão.

## 4. Decisões de negócio necessárias

Identidade funcional e finalidade já respondidas; decisões restantes antes de fechar escopo:

1. **Fornecedor e capacidade contratada:** confirmar razão social/fornecedor, módulos habilitados e documentação do Web `2026.21.1.3`; aceitar referência pública ou identificação textual sem segredos.
2. **Necessidade de troca:** o que os módulos complementares precisam obter do Escolar ou devolver a ele? Complementar funcionalidade não exige sincronizar dados por si só. Não pedir integração financeira, acadêmica ou de alunos que não foi solicitada.
3. **Autoridade de estoque:** usuário ainda vai avaliar o sistema do saldo oficial, entradas, saídas e catálogo; responsável pelo domínio e pelo inventário inicial também pendentes. Não eleger dois responsáveis pelo mesmo campo.
4. **Momento:** se houver troca, evento elegível e atraso tolerável. No onboarding, admissão/mudança/desligamento não devem ser inferidos de login ou inatividade; em tarefas, conclusão não implica recebimento de material.
5. **Operação:** responsável nominal por conferência, substituto, volume aproximado, atraso tolerável e tratamento de exceções.
6. **Dados:** campos mínimos, quem pode consultá-los, finalidade, retenção e descarte. Sem inclusão automática de alunos, responsáveis, notas, saúde ou biometria.

As duas perguntas iniciais foram respondidas, assim como a pergunta sobre estoque, cuja decisão foi adiada pelo usuário. Não repetir como bloqueio da auditoria nem interpretar a avaliação futura como escolha de arquitetura. Regras de RH e tarefas serão detalhadas nos chats próprios e alinhadas pelo coordenador.

## 5. Casos de uso candidatos e matriz de dados/finalidades

Os domínios abaixo correspondem à finalidade informada. Campos, trocas e critérios são propostas para discussão. Frequências são opções a negociar, não agendamentos. Nenhuma troca está habilitada. Integração financeira, folha, matrículas, notas e cobrança não integram esta primeira proposta.

| Caso / finalidade | Dados mínimos candidatos | Sistema responsável proposto | Direção candidata | Gatilho / frequência a decidir | Condição e conferência |
| --- | --- | --- | --- | --- | --- |
| UC-01: biblioteca e onboarding de RH | ID/versão de POP ou conteúdo, trilha, etapa e referência de pessoa somente quando necessária | CEEA proposto para conteúdos/trilhas; fonte de pessoas a definir, sem presumir cadastro RH no Escolar | Interna ao CEEA; nenhuma troca Escolar necessária no início | Publicação/revisão e início de onboarding definidos pelo módulo | Aprovação de conteúdo, quem acompanha e evidência de conclusão ainda serão definidos; aceite/leitura não equivalem automaticamente a treinamento concluído |
| UC-02: tarefas e responsabilidades | ID da tarefa, responsável local, prazo, estado e referência autorizada ao processo | CEEA proposto para tarefas e responsabilidades | Interna ao CEEA; externa apenas se surgir caso real | Criação/alteração conforme módulo; sem polling externo por padrão | Permissão por tarefa/processo; tarefa não aprova compra nem concede acesso a documento de RH |
| UC-03: evitar redigitar vínculo de colaborador, somente se necessário | ID externo estável, nome de exibição e vínculo/setor estritamente necessários | A definir; existência de cadastro de pessoal/interface no Escolar não confirmada | Eventual Escolar → CEEA, somente se for fonte oficial escolhida | Revisão manual ou frequência homologada a definir | Não importar folha, salário, documentos pessoais, senhas ou criar acesso automaticamente; possível manter cadastro local mínimo |
| UC-04: estoque compartilhado | ID de item/local, unidade, saldo e instante; se necessário, ID e tipo de movimentação | Usuário ainda vai avaliar; alinhar módulo Estoque e fornecedor | Indefinida: depende do dono de cada campo/operação | Consulta/lote/evento somente após definição da autoridade e interface | Saldo não implica reserva; recebimento de compra não pode gerar duas entradas; saldo e movimentações não são somados entre sistemas |
| UC-05: relacionar onboarding/tarefas/conhecimento | Referências internas de trilha, tarefa, conteúdo/versionamento e responsável autorizado | Contrato entre módulos CEEA, a alinhar pelo coordenador | Entre módulos locais; nenhuma transmissão ao Escolar por padrão | Evento local confirmado, se aprovado | Início repetido da mesma trilha não cria tarefas duplicadas; alteração de POP não reescreve evidência anterior |

Primeira versão proposta para alinhamento: CEEA concentra as funções complementares, usando os módulos já em discussão e dados próprios mínimos. Não criar conector Escolar para biblioteca/tarefas sem demonstrar necessidade de troca. Manter UC-04 em descoberta até a avaliação do usuário; só então escolher um fluxo externo mínimo, se necessário e oficialmente suportado. Sucesso futuro: responsabilidade de cada sistema clara, vínculo local sem duplicação e histórico/visibilidade preservados. Metas de volume/tempo e aceite de onboarding permanecem abertas.

## 6. Alternativas e suporte efetivamente comprovado

| Alternativa | Evidência atual | Uso possível / decisão |
| --- | --- | --- |
| Complemento funcional no CEEA, sem conexão externa | Planejamento permitido agora; biblioteca/onboarding e tarefas ainda dependem dos escopos dos chats próprios | Recomendado como base arquitetural; não afirmar que esses módulos já foram implementados |
| Lote de arquivo homologado pelo fornecedor | Não confirmado para os dados candidatos. XML de notas emitidas em [S2] é específico | Só escolher após layout, importação/exportação, permissões e edição compatível confirmados; prévia, validação e reconciliação locais |
| API oficial / processamento de eventos | Não foi localizada documentação pública aplicável | Só considerar após contrato, autenticação/escopos, IDs, paginação, limites, idempotência e homologação; webhook apenas se documentado |
| Rotina assistida pelo fornecedor | Serviço específico não confirmado | Perguntar se há procedimento oficial que atenda à finalidade; não presumir integração sob medida |

Não há, nesta auditoria, troca automatizada comprovadamente disponível para o Web `2026.21.1.3` da escola. A versão foi informada pelo usuário; compatibilidade técnica não foi verificada. Banco direto, inspeção de APIs internas, automação de tela e reaproveitamento de sessão de usuário não são bases aprovadas. Não sondar endpoints, instalar cliente, pedir segredos ou montar conector enquanto faltarem finalidade específica de troca e suporte técnico oficial.

## 7. Identidade, mapeamento e deduplicação — propostas

- Preservar `Purchase.id`, protocolo e IDs existentes. `Supplier.id` é local; não o substituir por identificador externo.
- Relação externa proposta: `(instalação lógica, entidade, externalId) ↔ (tipo local, localId)`, com versão do mapeamento, autor, data e evidência. Não usar credencial como identificador de instalação.
- Pessoa, conta de acesso e colaborador são conceitos distintos. E-mail/nome/setor não autorizam unir cadastros nem conceder papel. Se UC-03 for necessário, exigir vínculo estável aprovado e tratamento explícito de homônimos, mudança de vínculo e desligamento.
- Itens atuais não têm ID estável individual: são arrays. Não usar nome ou índice sozinho para movimentações persistentes; alinhar identidade de item com Estoque antes de definir contrato.
- Pedido reapresentado preserva ID/protocolo e ganha nova rodada/competência. Se uma entrada de estoque decorrer de compra, distinguir ID da rodada, recebimento e movimentação; não usar pedido sozinho para deduplicar nem confundir `version` mutável com identidade.
- Deduplicar por evento/operação da origem e efeito de negócio. Arquivo: digest do lote mais chave estável de cada linha; hash do arquivo sozinho não impede duplicata em lotes diferentes.
- Trilhas, atribuições, tarefas e versão de conteúdo precisam de identidades próprias nos respectivos módulos. Repetição do início de uma trilha deve referenciar a mesma atribuição; nova edição do POP não apaga conclusão ou evidência da versão anterior. São contratos propostos, não tipos já existentes.
- Schema, moeda BRL/centavos, unidade, competência `YYYY-MM`, datas civis e timestamps com fuso devem ser explícitos. America/Manaus continua regendo competência; não converter data sem horário em instante UTC.
- Não fabricar IDs, estados ou datas ausentes. Registro incompleto vai para pendência; reconciliação verifica contagens, saldos, referências e efeitos individuais conforme a finalidade.

## 8. Permissões e rastreabilidade — propostas com limites existentes

- Reaproveitar sessão local e controle no servidor. Não criar usuários a partir do Escolar, SSO ou correspondência automática de permissões.
- Master e Administrativo já operam integrações OpenClaw; isso não concede automaticamente permissão para futura escrita no Escolar. Matriz de ações desse módulo ainda depende do caso e da escola.
- Papéis de compras não conferem acesso automático a RH. Separar leitura de POP geral, acompanhamento de onboarding, execução de tarefa e eventual dado de colaborador; definir isso com os módulos próprios antes de expor qualquer informação. Tarefa compartilhada não pode revelar conteúdo privado por título, anexo ou link.
- Financeiro permanece somente leitura, apenas no universo autorizado após `generalApproval`, inclusive snapshots. Não recebe configuração, fila, credenciais ou payloads de integração e não dispara reprocessamento. DG mantém decisão da necessidade; Setor mantém seu próprio âmbito.
- Nunca mandar `Snapshot`, pedido completo ou histórico integral ao sistema externo. Construir lista explícita de campos e filtro por finalidade; excluir rascunhos/revisões privadas e dados internos não necessários.
- Auditoria futura: ID da operação, usuário local estável e nome de exibição, instantes, finalidade, entidade/rodada, versões origem/destino, mapeamento, digest, resultado, confirmação externa e justificativa de revisão. Não registrar segredos ou payload integral em log.
- `audit` atual guarda `actor` textual e evento; não oferece sozinho todos esses metadados. Propor registro próprio do módulo vinculado à auditoria, com retenção e acesso definidos; não declarar que já existe.
- Arquivos permanecem privados. Retenção de lotes/payloads, acesso e descarte exigem definição; não enviar anexos por padrão nem compartilhar URLs públicas.
- Se houver integração futura, credencial de serviço com escopo mínimo no servidor e configuração segura fora do chat, separada do OpenClaw. Nenhuma credencial é necessária nesta etapa.

## 9. Falhas, reprocessamento e conflitos — comportamento proposto

Fluxo conceitual: recebido/preparado → validado → pendente de conferência → autorizado → confirmado, com caminhos para rejeitado, falha, resultado incerto e cancelado. Não são novos estados de compra nem enumeração implementada.

| Situação | Tratamento proposto |
| --- | --- |
| Formato inválido ou mapeamento ausente | Bloquear efeito, explicar campo/linha sem expor dados indevidos; revisão humana |
| Lote parcialmente aceito | Recibo por operação; reprocessar apenas falhas verificadas; não reenviar lote inteiro cegamente |
| Timeout após possível escrita externa | Marcar incerto; consultar confirmação pela referência documentada; sem reenvio automático se não houver deduplicação garantida |
| Falha temporária / limite de taxa | Tentativas limitadas, espera crescente conforme fornecedor, mesma chave da operação e fila de pendências final |
| Sem permissão / credencial revogada | Pausar rotina e sinalizar responsável; sem fallback para credenciais pessoais ou OpenClaw |
| Evento repetido, antigo ou fora de ordem | Confirmar repetição sem novo efeito; rejeitar/reter versão obsoleta e solicitar reconciliação se faltar sequência |
| Alteração simultânea | Comparar versão capturada, revalidar e exigir revisão; nunca última gravação vence por padrão |
| Mês fechado, arquivamento ou nova rodada | Não gravar efeito em registro inelegível; invalidar preparação antiga; manter trilha. Não apagar efeito externo já confirmado |
| Cancelamento/estorno | Operação própria conforme regra oficial; não apagar origem nem inventar reversão externa |
| Divergência de valor, status ou unidade | Mostrar origem, evidência e responsável pelo campo; segregar pendência, sem alterar aprovação, estimativa ou saldo automaticamente |

Reprocessamento futuro exige permissão, justificativa, vínculo à tentativa original e nova conferência das condições atuais. Pausar o módulo deve interromper novos envios sem interromper compras e sem destruir fila/mapeamentos. API e banco de sistemas distintos não formam transação única; prever reconciliação, sem prometer atomicidade distribuída.

## 10. Reuso e pontos compartilhados auditados

| Componente existente | Reuso / limite |
| --- | --- |
| `app/local-session.ts`, `lib/local-auth.ts`, `app/access.ts` | Sessão, perfis e projeções. Ampliar ações somente após escopo e alinhamento; não copiar credenciais |
| `app/model.ts`, `app/workflow.ts`, `app/budget-workflow.ts` | IDs, validações e transições de compras; não contornar aprovação nem adicionar estados de sincronização ao fluxo |
| `app/budget-month.ts`, `lib/budget-records.ts` | Documento fiscal, mês/fechamento e versões; importação não equivale a pagamento autorizado |
| `db/schema.ts`, `app/api/data/route.ts` | Padrões de records/version e batch com auditoria. GET não é interface externa neutra; não fornecer Snapshot ao fornecedor |
| `lib/integrations.ts`, `app/integration-model.ts` | Referências de idempotência, lease, revisão e resultado incerto. Tipos, provedor e fila são específicos de OpenClaw; não reutilizar diretamente nem inserir jobs Escolar |
| `lib/budget-files.ts` | Referência para autorização e documentos privados; layout/retenção de lotes ainda indefinidos |
| `app/dashboard-shell.tsx`, `app/process-navigation.ts`, `app/appearance.ts`, `app/redesign.css` | Shell, menu e aparência. Eventual entrada do módulo é mudança compartilhada a coordenar; nenhuma tela criada agora |
| `scripts/module-workspace.mjs`, `.ceea-worktree.json`, `.githooks/pre-push` | Isolamento de porta/branch e proteção de envio preservados |

Não foi assumida a existência de código novo de Estoque, Tarefas ou Conhecimento em outras branches. Não executar merges nem ler histórico de outros chats por suposição.

## 11. Contratos entre módulos a alinhar com o coordenador

São propostas de fronteira, sem interfaces públicas criadas:

- **Compras → Estoque:** eventual recebimento elegível, referência da compra/rodada, ID próprio do recebimento/item e quantidade/unidade conferidas. Não gerar movimentação antes do contrato e da definição de autoridade. Confirmação externa não aprova necessidade, altera competência ou reabre mês.
- **Integração → módulos CEEA:** resultado verificável, ID externo, versão e pendência; alterações passam pelo domínio responsável e papel permitido. Não gravar JSON de pedido nem dados de RH diretamente.
- **Estoque ↔ integração:** dono do catálogo/saldo, IDs estáveis, locais, unidades, reservas, movimentação e reversão. Recebimento de compra não gera duas entradas em sistemas diferentes. Fechar esse contrato antes de UC-04.
- **Conhecimento/onboarding ↔ Tarefas:** ID da atribuição de trilha, etapa e versão do conteúdo, responsável e estado definido pelo domínio; deduplicar por atribuição/etapa, preservar evidência e aplicar autorização do documento no destino. Leitura/aceite e conclusão de tarefa não serão equiparados sem regra aprovada.
- **Tarefas ↔ integração:** eventual pendência possui chave, responsável e referência autorizada; nova tentativa não cria outra tarefa. Não depender desse módulo para falha básica; só integrar após contrato confirmado.
- **Pessoas/RH ↔ acesso:** eventual colaborador externo não cria usuário, papel ou sessão. Dados mínimos e autoridade de vínculo serão definidos se houver necessidade de UC-03; não pressupor folha/RH disponível no Escolar.
- **Infraestrutura compartilhada:** isolar futuros arquivos e tipos em diretórios do módulo, sem ampliar enum OpenClaw. Novos kinds/tabelas, permissões, rotas, menu, dependências e migrações deverão ser listados e alinhados antes da integração pelo coordenador.

## 12. Fases e critérios de passagem

| Fase | Entrega | Para avançar |
| --- | --- | --- |
| 0 — auditoria inicial, esta entrega | Evidências, Web/build e finalidade informados, matriz atualizada, riscos e fronteiras | Etapa documental concluída; não autoriza código |
| 1 — descoberta funcional e com fornecedor | Confirmar necessidade de troca além do complemento local; avaliar estoque, campos, dono, direção e suporte ao build | Escola avalia autoridade do estoque; fornecedor comprova interface se houver troca; coordenador alinha contratos |
| 2 — desenho fechado, ainda planejamento | Contrato de dados, elegibilidade, permissões, idempotência, falhas, retenção e critérios de aceite | Usuário aprova desenho e autoriza expressamente uma próxima etapa; resposta às perguntas não autoriza implementação sozinha |
| 3 — eventual simulação local futura | Apenas dados fictícios e interface substituta, se autorizada | Evidência de repetição, ordem, conflito, permissões e reconciliação; nenhuma conexão real |
| 4 — eventual homologação futura | Plano específico em ambiente de teste oficial e configuração segura | Nova autorização e ambiente realmente isolado; sem acesso real nesta etapa |
| 5 — eventual operação futura | Revisão de entrega, modo gradual e procedimento de pausa | Coordenador integra/publica; escola autoriza operação e fornecedor suporta a interface |

Não estimar esforço de implementação ou prometer sincronização automática sem a fase 1. Não instalar dependências nem gerar migração agora.

## 13. Riscos e perguntas ao fornecedor

Riscos prioritários: compatibilidade do build não comprovada; módulo não licenciado; recurso comercial confundido com interface externa; duplicação de movimento/duas fontes de saldo; cadastro de colaborador confundido com usuário; atribuição duplicada de trilha/tarefa; exposição de dados de RH por permissões de compras; mudança de conteúdo sem preservar evidência; efeitos incertos e evolução de contrato.

Roteiro para a escola encaminhar, sem envio automático:

1. Confirmar fornecedor contratado, módulos disponíveis e suporte ao Escolar Manager Web `2026.21.1.3` informado pela escola. A documentação fornecida corresponde a esse build?
2. Para o caso escolhido, que interface oficial permite ler e/ou gravar? Fornecer documentação versionada, operações e campos, sem credenciais.
3. Há importação/exportação oficial de catálogo, locais, unidades, saldos ou movimentos? Qual layout, encoding, datas/quantidades, IDs, tamanho, validações e recibo por linha? Não enviar exemplos com dados reais.
4. Se houver API, quais autenticação, escopos, paginação consistente, filtros de alteração/exclusão, limites, timeouts, erros e política de versão?
5. Há IDs imutáveis e referência externa única? Qual a garantia de idempotência e como consultar uma gravação após timeout?
6. Existem eventos/webhooks oficialmente oferecidos? Se sim, quais assinatura, replay, ordenação, repetição e confirmação? Não pressupor que existam.
7. Como distinguir saldo físico, disponível e reservado, movimento, inventário e reversão? Há unidades/locais, ajuste de saldo e registros manuais concorrentes? Como evitar lançar uma mesma entrada nos dois sistemas?
8. Existe ambiente de homologação com dados fictícios, isolado de produção e de cobranças/mensagens reais? Como receber exemplos sanitizados de schema?
9. Quais licenças/custos, termos de acesso, responsáveis pelo suporte, manutenção e aviso de mudanças? Há limites de finalidade, retenção e auditoria?
10. Se precisarmos de vínculo mínimo de colaborador, esse cadastro realmente existe no produto contratado e há leitura oficialmente autorizada? Se não houver interface para terceiros, qual procedimento manual/assistido é suportado sem banco direto? Nenhuma troca de RH é pressuposta.

## 14. Pendências explícitas desta primeira versão

Produto Web, build `2026.21.1.3` e finalidade complementar foram informados pelo usuário. Fornecedor contratado/documentação aplicável, necessidade concreta de troca externa e autoridade do estoque permanecem pendentes. O usuário ainda vai avaliar o estoque; nenhuma escolha foi inferida. Direção/frequência, campos, IDs de rodada/item/movimento/trilha, permissões de RH/tarefas, retenção, volumes e responsáveis seguem propostas ou perguntas. Detalhes funcionais pertencem aos chats dos módulos; este chat define fronteiras e permanece apenas em planejamento.
