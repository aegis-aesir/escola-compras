# Integração Escolar Manager — auditoria e plano provisório v0.1

Data: 13/11/2026, America/Manaus. Etapa: somente planejamento. Este documento não é um escopo aprovado nem um plano executável de conector.

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
| Confirmado na pesquisa pública | Marca e site do fornecedor: Escolar Manager, `https://www.escolarmanager.com.br/`; catálogo com Web, Cursos e Smart [S1] | Fornecedor contratado, razão social, edição e versão usados pela escola continuam desconhecidos |
| Confirmado no catálogo público | Web anuncia contas a pagar, plano de contas e estoque; exportação XML no módulo de notas emitidas [S2] | Não comprova módulos contratados, exportação de compras, importação genérica ou API externa |
| Hipótese | O produto da escola pode ser o Escolar Manager Web desse fornecedor | Não assumir até identificação pelo usuário |
| Proposta técnica | Uma finalidade por piloto, uma direção por tipo de dado e conferência humana | Precisa de escolha da escola; não é requisito aprovado |
| Pendente | Edição/build, hospedagem, módulos licenciados, interfaces permitidas e documentação aplicável | Impede escolher transporte e implementar conector |
| Pendente | Resultado de negócio, dados mínimos, responsável, periodicidade e sistema responsável por cada campo | Impede fechar a primeira versão |

Não foi localizado conector Escolar Manager nem identificação contratual da instalação nos arquivos versionados pesquisados. As ocorrências encontradas tratam do roadmap e da coordenação. Isso não comprova ausência de integrações privadas oferecidas pelo fornecedor.

## 3. Fontes oficiais e alcance da verificação

Consulta em 13/11/2026, sem autenticação de escola:

- **[S1]** [Página oficial Escolar Manager](https://www.escolarmanager.com.br/), leitura pública com resposta HTTP 200. Identifica a marca e as linhas de produto; não identifica a contratação da escola.
- **[S2]** [Escolar Manager Web — módulos e funcionalidades](https://www.escolarmanager.com.br/solucoes/escolar-manager-web/), leitura pública com resposta HTTP 200. Página comercial, não contrato técnico de integração.
- Buscas: `"Escolar Manager" documentação integração API fornecedor`; `site:escolarmanager.com.br (API OR webhook OR integração OR exportação OR manual OR documentação)`; `"Escolar Manager" ("API" OR "Swagger" OR "webhook" OR "manual de integração")`.
- Nessas buscas e nas duas páginas lidas, não foi encontrada documentação técnica oficial de API/webhooks/arquivos para os casos de uso abaixo. Não concluir que inexiste; solicitar ao fornecedor o documento da edição contratada.
- Não confundir integração com aplicativo do próprio produto, remessa/retorno bancário ou XML de notas emitidas com uma interface genérica para CEEA Manager. Versão de aplicativo móvel de terceiros não determina o build do sistema de gestão.

## 4. Decisões de negócio necessárias

Ainda sem resposta; preencher antes de fechar escopo:

1. **Identidade:** edição (Web, desktop ou outra), fornecedor contratado, versão/build e módulos usados; aceitar referência pública ou identificação textual sem segredos.
2. **Resultado inicial:** qual trabalho repetido deve desaparecer, quem o realiza hoje e qual evidência mostrará sucesso.
3. **Autoridade:** onde cada dado é criado, corrigido e cancelado; quem resolve divergências. Não eleger dois responsáveis pelo mesmo campo.
4. **Momento:** evento que torna um registro elegível e prazo tolerável para sua atualização. Compra aprovada não equivale a obrigação financeira emitida, recebimento ou pagamento.
5. **Operação:** responsável nominal por conferência, substituto, volume aproximado, atraso tolerável e tratamento de exceções.
6. **Dados:** campos mínimos, quem pode consultá-los, finalidade, retenção e descarte. Sem inclusão automática de alunos, responsáveis, notas, saúde ou biometria.

As duas perguntas iniciais enviadas ao usuário agrupam identidade e finalidade. As demais decisões serão detalhadas a partir do caso escolhido, evitando definir funcionalidades por suposição.

## 5. Casos de uso candidatos e matriz de dados/finalidades

Todos os casos abaixo são hipóteses para discussão, não escopo aprovado. Frequências são opções a negociar, não agendamentos. Nenhuma troca está habilitada.

| Caso / finalidade | Dados mínimos candidatos | Sistema responsável proposto | Direção candidata | Gatilho / frequência a decidir | Condição e conferência |
| --- | --- | --- | --- | --- | --- |
| UC-01: evitar redigitação de obrigação de compra | ID da compra e da rodada, fornecedor vinculado, documento fiscal, competência, valor realizado, vencimento e eventual parcela | CEEA: solicitação/decisões; responsável pela obrigação no Escolar: confirmar | CEEA → Escolar | Após evento fiscal/administrativo escolhido; lote manual inicial ou frequência homologada | Aprovação da necessidade, revisão administrativa e interface oficial; não enviar estimativa como dívida |
| UC-02: acompanhar situação financeira sem recadastrar pagamento | ID externo da obrigação/parcela, estado, valor/data confirmados e referência de conciliação | Escolar somente se for a fonte financeira escolhida | Escolar → CEEA | Consulta manual ou atualização periódica documentada | Resultado entra para conferência; não marca automaticamente `Pago`, não libera nota, não executa pagamento |
| UC-03: reduzir divergência cadastral | IDs de fornecedor/plano de contas/centro de custo/unidade e descrições estritamente necessárias | Escolher por domínio; cadastro de fornecedores CEEA já existe | Uma direção por domínio, a escolher | Carga homologada e atualização conforme operação | Mapear conceitos antes; setor não equivale automaticamente a centro de custo; sem copiar usuários ou senhas |
| UC-04: informar disponibilidade de material | ID de item/local, unidade, saldo, instante e significado do saldo | Alinhar módulo Estoque e escola; Escolar só se escolhido como origem | Escolar → Estoque/CEEA ou sentido inverso, nunca ambos para o mesmo saldo | Consulta ou lote, prazo tolerável a definir | Saldo não implica reserva; não criar movimentação a partir de simples recebimento de compra |
| UC-05: conciliar totais administrativos | Competência, contagem, totais por categoria permitida e referências das diferenças | Cada sistema conserva seu histórico; divergência tem responsável humano | Comparação local de duas origens homologadas | Sob demanda ou fechamento | Não reabrir mês nem reescrever snapshot fechado; comparar a rodada correta |

Primeira versão proposta: escolher **um** desses resultados, com dados mínimos e confirmação humana. Se nenhum atender à necessidade real, substituir a matriz após a resposta do usuário. Sucesso futuro: repetição do mesmo evento não duplica registros, divergência é explicável, permissões são preservadas e o responsável consegue conferir cada operação. Metas numéricas de volume/tempo permanecem abertas.

## 6. Alternativas e suporte efetivamente comprovado

| Alternativa | Evidência atual | Uso possível / decisão |
| --- | --- | --- |
| Planejamento e conferência manual, sem conexão | Suportado pelo escopo atual e pelos registros já existentes no CEEA | Caminho disponível agora; recomendar como ponto de partida para definir regras |
| Lote de arquivo homologado pelo fornecedor | Não confirmado para os dados candidatos. XML de notas emitidas em [S2] é específico | Só escolher após layout, importação/exportação, permissões e edição compatível confirmados; prévia, validação e reconciliação locais |
| API oficial / processamento de eventos | Não foi localizada documentação pública aplicável | Só considerar após contrato, autenticação/escopos, IDs, paginação, limites, idempotência e homologação; webhook apenas se documentado |
| Rotina assistida pelo fornecedor | Serviço específico não confirmado | Perguntar se há procedimento oficial que atenda à finalidade; não presumir integração sob medida |

Não há, nesta auditoria, alternativa automatizada comprovadamente disponível para a instalação da escola. Banco direto, inspeção de APIs internas, automação de tela e reaproveitamento de sessão de usuário não são bases aprovadas. Não sondar endpoints, instalar cliente, pedir segredos ou montar conector enquanto faltarem identidade e suporte técnico oficial.

## 7. Identidade, mapeamento e deduplicação — propostas

- Preservar `Purchase.id`, protocolo e IDs existentes. `Supplier.id` é local; não o substituir por identificador externo.
- Relação externa proposta: `(instalação lógica, entidade, externalId) ↔ (tipo local, localId)`, com versão do mapeamento, autor, data e evidência. Não usar credencial como identificador de instalação.
- CNPJ normalizado, nome, telefone e descrição podem sugerir candidatos; não autorizam união automática. O `taxId` atual é opcional e não comprova identidade. Um mesmo fornecedor pode ter filiais; exigir decisão explícita.
- Itens atuais não têm ID estável individual: são arrays. Não usar nome ou índice sozinho para movimentações persistentes; alinhar identidade de item com Estoque antes de definir contrato.
- Pedido reapresentado preserva ID/protocolo e ganha nova rodada/competência. Chave só por pedido duplicaria ou sobrescreveria obrigações; exigir ID estável da rodada/operação, sem confundir `version` mutável com identidade.
- Deduplicar por evento/operação da origem e efeito de negócio. Arquivo: digest do lote mais chave estável de cada linha; hash do arquivo sozinho não impede duplicata em lotes diferentes.
- Documentos/parcelas demandam identidade própria. Número de nota sozinho é insuficiente. Chave fiscal, emitente, tipo, série e parcela só serão definidos se fizerem parte da interface e da finalidade aprovadas.
- Schema, moeda BRL/centavos, unidade, competência `YYYY-MM`, datas civis e timestamps com fuso devem ser explícitos. America/Manaus continua regendo competência; não converter data sem horário em instante UTC.
- Não fabricar IDs, estados, parcelas ou datas ausentes. Registro incompleto vai para pendência; reconciliação verifica contagens, totais, referências e efeitos individuais.

## 8. Permissões e rastreabilidade — propostas com limites existentes

- Reaproveitar sessão local e controle no servidor. Não criar usuários a partir do Escolar, SSO ou correspondência automática de permissões.
- Master e Administrativo já operam integrações OpenClaw; isso não concede automaticamente permissão para futura escrita no Escolar. Matriz de ações desse módulo ainda depende do caso e da escola.
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

- **Compras → integração:** referência da compra/rodada, versão capturada, finalidade, evento elegível e campos autorizados. O módulo consulta regras do domínio; confirmação externa não aprova necessidade, altera competência ou reabre mês.
- **Integração → Compras:** resultado verificável, ID externo, versão e pendência; alteração fiscal/financeira passa pela regra de negócio e pelo papel permitido. Não grava JSON de pedido diretamente.
- **Estoque ↔ integração:** dono do catálogo/saldo, IDs estáveis, locais, unidades, reservas, movimentação e reversão. Recebimento de compra não gera duas entradas em sistemas diferentes. Fechar esse contrato antes de UC-04.
- **Tarefas ↔ integração:** eventual pendência possui chave, responsável e referência autorizada; nova tentativa não cria outra tarefa. Não depender desse módulo para falha básica; só integrar após contrato confirmado.
- **Conhecimento/POPs:** eventual referência à instrução/versionamento, sem copiar documentos ou dados pessoais. Nenhuma dependência necessária para a primeira versão.
- **Infraestrutura compartilhada:** isolar futuros arquivos e tipos em diretórios do módulo, sem ampliar enum OpenClaw. Novos kinds/tabelas, permissões, rotas, menu, dependências e migrações deverão ser listados e alinhados antes da integração pelo coordenador.

## 12. Fases e critérios de passagem

| Fase | Entrega | Para avançar |
| --- | --- | --- |
| 0 — auditoria inicial, esta entrega | Evidências, matriz candidata, perguntas, riscos e fronteiras | Receber identidade e finalidade; não autoriza código |
| 1 — descoberta funcional e com fornecedor | Um caso escolhido, fluxo atual, campos, dono, direção, frequência, suporte e layout/API da edição | Escola confirma regras; fornecedor comprova interface; coordenador alinha contratos |
| 2 — desenho fechado, ainda planejamento | Contrato de dados, elegibilidade, permissões, idempotência, falhas, retenção e critérios de aceite | Usuário aprova desenho e autoriza expressamente uma próxima etapa; resposta às perguntas não autoriza implementação sozinha |
| 3 — eventual simulação local futura | Apenas dados fictícios e interface substituta, se autorizada | Evidência de repetição, ordem, conflito, permissões e reconciliação; nenhuma conexão real |
| 4 — eventual homologação futura | Plano específico em ambiente de teste oficial e configuração segura | Nova autorização e ambiente realmente isolado; sem acesso real nesta etapa |
| 5 — eventual operação futura | Revisão de entrega, modo gradual e procedimento de pausa | Coordenador integra/publica; escola autoriza operação e fornecedor suporta a interface |

Não estimar esforço de implementação ou prometer sincronização automática sem a fase 1. Não instalar dependências nem gerar migração agora.

## 13. Riscos e perguntas ao fornecedor

Riscos prioritários: produto/versão errados; módulo não licenciado; recurso comercial confundido com interface externa; duplicação de obrigação; duas fontes de saldo; mudança de rodada com mesmo protocolo; efeitos incertos; conflito com fechamento; vazamento de campos por payload amplo; indisponibilidade e evolução de contrato.

Roteiro para a escola encaminhar, sem envio automático:

1. Qual produto, edição, build e módulos estão contratados? Há diferenças entre Web/desktop e entre versões?
2. Para o caso escolhido, que interface oficial permite ler e/ou gravar? Fornecer documentação versionada, operações e campos, sem credenciais.
3. Há importação/exportação? Qual layout, encoding, formato de datas/valores, IDs, tamanho, validações e recibo por linha? Exportação XML fiscal cobre apenas notas emitidas ou há outro recurso documentado?
4. Se houver API, quais autenticação, escopos, paginação consistente, filtros de alteração/exclusão, limites, timeouts, erros e política de versão?
5. Há IDs imutáveis e referência externa única? Qual a garantia de idempotência e como consultar uma gravação após timeout?
6. Existem eventos/webhooks oficialmente oferecidos? Se sim, quais assinatura, replay, ordenação, repetição e confirmação? Não pressupor que existam.
7. Como tratar parcelamento, alteração, cancelamento, estorno, competência fechada e registros criados manualmente? Quem é a autoridade de cada campo?
8. Existe ambiente de homologação com dados fictícios, isolado de produção e de cobranças/mensagens reais? Como receber exemplos sanitizados de schema?
9. Quais licenças/custos, termos de acesso, responsáveis pelo suporte, manutenção e aviso de mudanças? Há limites de finalidade, retenção e auditoria?
10. Se não houver interface para terceiros, qual procedimento oficial manual/assistido atende ao caso sem acesso direto ao banco?

## 14. Pendências explícitas desta primeira versão

Identidade instalada, documentação técnica aplicável e finalidade não confirmadas. Sistemas responsáveis, direção, frequência, campos, IDs de rodada/item/parcela, permissões específicas, retenção, volumes e responsáveis permanecem propostas ou perguntas. A matriz será reduzida ao caso escolhido; nenhuma hipótese deste documento pode ser tratada como requisito aceito.
