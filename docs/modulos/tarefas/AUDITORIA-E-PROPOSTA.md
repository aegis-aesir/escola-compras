# Tarefas e responsabilidades — auditoria e proposta preliminar

Data: 13/11/2026. Etapa autorizada: auditoria e planejamento inicial.
**Não é um desenho aprovado nem autorização para implementar.** As recomendações abaixo dependem das decisões indicadas na seção 4. Nenhuma regra de tarefas foi acrescentada ao produto.

## 1. Ambiente conferido e limites

- Raiz Git: `C:/Users/aegis/Documents/ChatGPT/Compras/escola-compras/.worktrees/tarefas`.
- Branch: `codex/tarefas`; base auditada: `fa211930be936b79aa5deee58ad3c3a307f9a927`.
- Manifesto: módulo `tarefas`, porta `5183`, servidor permitido `http://127.0.0.1:5183`. Porta conferida na configuração e no resolvedor do projeto; servidor não iniciado, disponibilidade da porta não testada.
- `git status --short` inicial sem alterações. Hooks próprios configurados em `.githooks`; manifesto e hooks preservados.
- Lidos integralmente: `AGENTS.override.md`, `AGENTS.md`, `COORDENACAO.md`, `IMPLEMENTACAO.md`, `CONTINUAR-NO-VSCODE.md`, `ROADMAP.md`, `.ceea-workspace/INICIAR-MODULO.md` e `.ceea-worktree.json`.
- As seções recentes de 13/11 substituem os trechos antigos sobre adiamento com cópia: compras mantêm a mesma solicitação, com rodadas e histórico. Esta proposta não modifica esse fluxo.
- Somente o coordenador integra a main e publica. Não consultar outras worktrees para presumir contratos disponíveis nesta branch. Nenhuma mensagem enviada a outro chat.
- ClickUp/Asana são referências conceituais, sem conexão a esses serviços. Escolar Manager permanece apenas no planejamento, sem conexão ou troca de dados.

## 2. Auditoria do código e reaproveitamento

| Área | Evidência nesta branch | Reaproveitamento e cuidado necessário |
| --- | --- | --- |
| Sessão e identidade | `app/local-session.ts`, `lib/local-auth.ts` | Usar o mesmo login, ID e sessão local. Contas inativas/excluídas não autenticam; identidade histórica é preservada. Não criar outro cadastro de pessoas. |
| Perfis e visibilidade | `app/model.ts`, `app/access.ts`, `app/process-navigation.ts` | Já existem Master, ADM, DG, Setor e Financeiro. As permissões atuais são de compras; não definem poderes sobre tarefas. |
| Diretório de responsáveis | `lib/local-auth.ts`, `app/api/data/route.ts`, `app/users-panel.tsx` | `members` completo só é entregue ao Master. ADM e Setor precisarão de uma lista mínima de responsáveis permitidos, validada no servidor; não abrir a administração de usuários para preencher um seletor. |
| Setores | `Settings.departments` em `app/model.ts`; ação `settings` em `app/api/data/route.ts` | Cadastro atual é uma lista de nomes, sem ID estável, hierarquia ou chefia por setor. Cada usuário possui um setor. Gestão de equipe não pode ser inferida desse campo. |
| Persistência | `db/schema.ts`, `drizzle/0000_flawless_korvac.sql` | `records` usa ID, kind, JSON e versão; `audit` guarda entidade, autor, ação e data. Usar concorrência por versão e gravação atômica com histórico. |
| API de compras | `app/api/data/route.ts` | A API lê registros e projeta dados por perfil; seu GET também pode executar consolidação de adiamentos e avanço de prazos. Não usá-la como mecanismo de leitura/atualização de tarefas. |
| Navegação | `app/dashboard.tsx`, `app/dashboard-shell.tsx`, `app/process-navigation.ts` | Inserção futura de Tarefas precisa alinhar união de telas, rótulos, ícones, descrições e perfis com os outros módulos. A navegação atual segue as etapas de compras. |
| Interface | `components/ui/`, `app/appearance.css`, `app/redesign.css` | Reutilizar controles, tabelas, diálogos, temas e comportamento responsivo. Lista e quadro de tarefas não existem no módulo atual. Não são necessários novos pacotes para a proposta básica. |
| Histórico | `app/request-history.tsx`, tabela `audit` | Reaproveitar a apresentação como referência; o componente e endpoint são específicos de solicitações. Histórico de tarefas precisa de sua própria autorização, inclusive para comentários e arquivos. |
| Anexos | `lib/budget-files.ts`, `app/budget-record-panel.tsx`, `worker/index.ts` | R2 privado, limite atual de 5 MB/arquivo e 20 arquivos por pedido, validação do conteúdo e download autenticado. Endpoint atual exige solicitação/rascunho, etapa e mês de compras: não aceita tarefa diretamente. Propor serviço de arquivos de tarefas com regras próprias e mesmo BUCKET, sem enfraquecer compras. |
| Execução automática | `app/integration-model.ts`, `lib/integrations.ts` | Os jobs existentes atendem pesquisa/cotação OpenClaw. Não equivalem a tarefas humanas e não devem receber status, comentários ou recorrências deste módulo. |
| POPs e Escolar Manager | `ROADMAP.md` | São módulos separados; não há contrato de POPs ou sincronização Escolar Manager demonstrado nesta branch. Não inventar endpoints nem depender de código não integrado. |

## 3. Proposta da primeira versão

Objetivo: deixar claro quem fará cada atividade, para qual setor, até quando e em que situação, com contexto e rastreabilidade. Incluir tarefas independentes de compras; isso é uma proposta de abrangência a confirmar.

### Funcionalidades propostas

- Tarefa: título, descrição em texto, responsável por ID do usuário existente, setor cadastrado, prazo, prioridade e status; autor, datas e versão registrados pelo servidor. Recomenda-se um responsável principal, sem distribuição automática. Obrigatoriedade de responsável/prazo na criação ainda depende da escola.
- Status sugeridos: A fazer, Em andamento, Aguardando e Concluída. Motivo de espera pode ser registrado. Validação gerencial, cancelamento e reabertura dependem da regra de conclusão; nomes e transições não estão aprovados.
- Prioridades sugeridas: Baixa, Normal, Alta e Urgente, independentes da classificação orçamentária. Urgência não concede novas permissões nem executa ações por si só.
- Lista e quadro por status consultam as mesmas tarefas e os mesmos filtros. Alteração pelo quadro segue as mesmas regras de uma edição; oferecer controles acessíveis de mudança de status, sem exigir arrastar cartões.
- Detalhe com descrição, checklist de itens simples, comentários com autoria/data e anexos privados. Checklist não equivale a subtarefas. Não presumir edição/exclusão de comentários nem provas obrigatórias de conclusão.
- Busca por título/descrição e filtros por responsável, setor, status, prioridade, prazo e vínculo. Atraso é indicador derivado do prazo e da situação, sem criar transição automática.
- Minhas tarefas: foco no usuário responsável. Acompanhamento gerencial: abertas, atrasadas, próximas do prazo, por setor e por responsável, sempre limitado ao conjunto autorizado no servidor. Quantidades e filtros também respeitam visibilidade.
- Histórico de criação, atribuição, alterações de prazo/prioridade/status, checklist, comentários, anexos e vínculos. Reabertura/cancelamento com motivo, se aprovados. Preservar autoria anterior quando usuário mudar de nome, setor ou acesso.
- Permissões verificadas em listagem, detalhe, gravação, comentários, histórico e download; esconder um botão não substitui proteção do servidor. Nunca enviar credenciais ou o registro completo de autenticação em listas de responsáveis.

### Recursos avaliados para evolução

| Recurso | Recomendação preliminar | Regra necessária antes de ativar |
| --- | --- | --- |
| Recorrência | Depois do núcleo; checklist atende rotinas simples inicialmente | Calendário/dias sem expediente, horário de Manaus, geração por calendário ou conclusão, exceções e duplicidade. Não ligar a geração à ponte OpenClaw. |
| Subtarefas | Depois do núcleo; primeiro checklist sem responsável/prazo próprios | Se cada subtarefa terá responsável e prazo; efeito sobre conclusão da tarefa principal e visibilidade. |
| Dependências | Depois do núcleo | Dependência apenas informativa ou bloqueante, ciclos, reabertura e exposição de tarefas restritas. |
| Notificações por prioridade | Na primeira versão, propor indicadores dentro do sistema; envios e lembretes automáticos ficam para evolução | Quem recebe atribuição/atraso/urgência, antecedência, horários, escalonamento, canal, preferências e prevenção de repetição. Nenhum envio real autorizado. |

## 4. Decisões de negócio antes da implementação

As três primeiras decisões mudam o modelo de autorização e o fluxo e precisam de resposta. As recomendações são sugestões para discussão, não requisitos presumidos.

| Decisão | Pergunta a resolver | Proposta inicial para avaliação |
| --- | --- | --- |
| Atribuição e gestão | Quem cria, atribui e redistribui? Pode atribuir entre setores? O perfil Setor representa uma pessoa ou uma conta compartilhada? Existe chefia por setor? | Master/ADM gerenciam tarefas da escola e atribuem a usuários ativos. Setor atualiza as recebidas. Criação própria, delegação e responsáveis sem login precisam de definição. |
| Visibilidade | Usuário vê somente tarefas próprias, todas do setor ou de toda a escola? Como DG e Financeiro participam? Há tarefas confidenciais? | Master/ADM com visão gerencial; demais com acesso às tarefas autorizadas para si. Visão setorial, autoria como concessão de acesso e confidencialidade ainda em aberto. Não ampliar poderes da DG/Financeiro por inferência. |
| Conclusão e alterações | Responsável conclui diretamente ou solicita validação? Quem reabre/cancela, altera prazo/prioridade e quais condições são obrigatórias? | Conclusão direta pelo responsável é o fluxo mais simples; se houver aceite gerencial, acrescentar Aguardando validação. Checklist/evidência não serão obrigatórios sem confirmação. |
| Abrangência e prazo | O primeiro uso abrange rotinas gerais ou somente atividades ligadas a compras/POPs? Responsável e prazo podem ficar pendentes na criação? | Abranger tarefas independentes e vínculos opcionais; um responsável principal. Prazo por data local de Manaus para simplificar, com horário somente se necessário. |
| Evolução | Há necessidade imediata de recorrência, subtarefas, dependências ou alertas externos? | Deixar esses quatro recursos para etapa posterior; manter checklist e indicadores internos no núcleo. |

Mudança de setor, desativação do responsável e remoção/renomeação de setores exigem preservar a referência histórica. Recomenda-se marcar tarefas abertas com responsável indisponível para revisão gerencial, sem transferi-las automaticamente. Se a escola precisar de múltiplos gestores por setor, será necessário contrato de vínculo/chefia que ainda não existe.

## 5. Alternativas técnicas e recomendação, ainda sem escolha aprovada

1. **Registros próprios no D1 existente (recomendada):** kinds exclusivos do módulo, esquema validado, regras e endpoints próprios. Reaproveita `records`, versões e infraestrutura sem acoplar tarefa ao estado da compra. Comentários e eventos podem ser registros separados para evitar regravar todo o histórico. Consultas/índices devem ser definidos conforme os filtros e o volume; não assumir que carregar todos os registros será adequado.
2. **Tabelas dedicadas no mesmo D1:** melhor integridade relacional e mais liberdade para consultas de dependência/recorrência, com maior quantidade de migrações e coordenação de schema. Considerar se esses recursos forem prioritários já na primeira versão.

Nenhuma alternativa exige novo aplicativo, autenticação, repositório ou hospedagem. A recomendação favorece o núcleo simples solicitado e a estrutura encontrada; não é implementação pronta.

Organização sugerida, sujeita ao desenho aprovado: `app/tarefas/` para modelo, regras e interface; `lib/tarefas/` para persistência/arquivos; `app/api/tarefas/` para API; scripts e documentação identificados pelo módulo. Pontos de roteamento dos arquivos serão definidos entre rota da aplicação e Worker conforme compatibilidade, sem criar dois endpoints para a mesma operação.

## 6. Contratos a alinhar com o coordenador e outros módulos

- **Usuários/setores:** usar IDs atuais dos usuários e os nomes cadastrados em `Settings.departments`. Não criar IDs de setor ou uma hierarquia global silenciosamente. Definir resposta mínima de responsáveis permitidos (ID, nome e setor, quando autorizado), independente de `members` administrativo, e o efeito de alterações cadastrais.
- **Compras:** vínculo opcional pelo ID estável da solicitação; se necessário, registrar também a rodada de referência sem copiar o pedido inteiro. Consultar a autorização atual da compra antes de exibir protocolo, título, histórico ou arquivos. Uma tarefa não concede acesso a uma compra e a conclusão não muda aprovação, etapa, pagamento, recebimento ou competência. Não reutilizar automaticamente anexos da compra como anexos da tarefa.
- **POPs:** contrato futuro de ID estável, versão publicada consultada e autorização de leitura, a combinar com conhecimento-pops via coordenador. Referência não copia documento nem equivale a ciência/treinamento. Se o contrato não estiver disponível, o vínculo funcional fica pendente e o núcleo independente pode ser entregue depois de aprovado.
- **Visibilidade do vínculo:** recomendar acesso ao conteúdo de tarefa vinculada restrito também pela origem, pois a própria descrição/comentário pode conter dados do pedido/POP; a escola deve validar como tratar tarefas entre pessoas sem acesso à origem. Não apenas ocultar o link e deixar o conteúdo exposto. Revalidar revogação de acesso em cada leitura.
- **Anexos:** kinds e prefixo R2 exclusivos de tarefas; mesmo armazenamento privado e proteção de sessão. Limites de 5 MB e 20 arquivos são referência existente, propostos para reutilização, não decisão já confirmada para tarefas. Definir política de retenção/arquivamento no desenho aprovado.
- **Histórico:** não misturar comentários privados com a atividade global de compras. A API atual consulta `audit` global para gestão; a futura estratégia deve impedir exposição cruzada, incluindo texto de eventos, nomes de arquivos e contagens. Alinhar filtragem/namespaces ou armazenamento de eventos do módulo.
- **Automação:** tarefas humanas ficam separadas dos jobs de pesquisa/cotação e das chaves OpenClaw. Recorrência/notificação exigiriam infraestrutura e regras próprias; nenhuma ativação nesta etapa.
- **Escolar Manager:** apenas registrar eventual necessidade futura; sem API presumida, acesso direto ao banco, mapeamento de alunos ou sincronização nesta entrega.

### Arquivos comuns possivelmente afetados no futuro

| Arquivo/área | Motivo possível |
| --- | --- |
| `app/process-navigation.ts` | Nova área e autorização de navegação, coordenadas com estoque/POPs. |
| `app/dashboard-shell.tsx`, `app/dashboard.tsx` | Ícone, rótulo, composição e carregamento independente de tarefas. |
| `app/access.ts`, `app/model.ts` | Apenas se necessário para contratos comuns; preferir tipos/permissões próprios de tarefas sem mudar regras de compras. |
| `app/layout.tsx` | Importação de estilos próprios se necessária; evitar alterações globais. |
| `app/api/data/route.ts` | Somente se o desenho exigir isolamento da atividade global ou proteção cadastral de setores; não adicionar operações de tarefa ao fluxo de compras por conveniência. |
| `worker/index.ts`, `lib/budget-files.ts` | Somente se o roteamento ou extração de validação compartilhada de arquivos for necessário; preservar autorização de compras. |
| `db/schema.ts`, `drizzle/` | Apenas migrações aditivas identificadas por tarefas, se necessárias para tabelas/índices; ordem final é do coordenador. |
| `package.json`, lockfile, estilos globais | Nenhuma alteração prevista para o núcleo; qualquer necessidade posterior deverá ser justificada e registrada. |

## 7. Sequência proposta após as respostas

1. Fechar escopo, abordagem e matriz de atribuição/visibilidade/conclusão; elaborar desenho para aprovação. Não iniciar implementação enquanto essas regras estiverem pendentes.
2. Documentar contratos compartilhados e submetê-los ao alinhamento do coordenador antes da integração. Sem envio automático de mensagens entre chats.
3. Preparar plano de implementação do escopo aprovado: modelo e regras; persistência/API autorizada; lista/quadro/detalhe; comentários/checklist/anexos; filtros/visão gerencial; vínculos disponíveis e histórico.
4. Validar com dados fictícios e perfis distintos: negar anônimo e acesso por ID de outro usuário; testar atribuição inválida, responsável desativado, mudança de setor, concorrência 409, conclusão/reabertura e anexos privados conforme a matriz aprovada.
5. Testar tarefa vinculada sem permissão da origem, sem mudança automática do estado da compra e sem exposição de conteúdo por histórico, arquivos, filtros e indicadores. Regressão das compras e dos perfis existentes.
6. Tipos/build e inspeção local em desktop/celular e temas, usando apenas `127.0.0.1:5183`; entregar branch/SHA e migrações ao coordenador. Aprovação da escola para desenvolver não autoriza publicar ou migrar produção por este chat.

## 8. Validação efetivamente executada nesta etapa

- Conferência Git de raiz, branch e status inicial: correta, sem alterações existentes.
- Conferência do manifesto e resolvedor de ambiente: `codex/tarefas`, `5183`, `127.0.0.1`; rejeição de porta 5173 e destino de push main confirmada em asserções em memória.
- `node scripts/process-navigation-test.mjs`: PASS, saída `menu por perfil e filas exclusivas seguem as etapas do processo orçamentário`.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false --project tsconfig.json`: exit 0, sem erros.
- Os comandos foram chamados com caminhos absolutos e workdir explícito da worktree. Sem servidor, testes HTTP, build, migração ou validação de funcionalidade nova; não houve alteração de produto. Teste de navegação gerou apenas output local ignorado pelo Git.

Revisão desta proposta com o usuário é o próximo passo. As verificações acima descrevem a base existente; não comprovam um módulo ainda não implementado.
