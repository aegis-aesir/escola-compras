# Agenda de contatos e seleção para cotação

## Pedido e decisões do usuário

Criar uma agenda onde apareçam todos os contatos e permitir importar novos contatos; a cotação deve usar apenas contatos pertinentes ao material ou serviço. O usuário confirmou **as duas entradas**: arquivos CSV/VCF e sincronização pelo WhatsApp. Manter o sistema existente e as sete cotações reais com envio desativado.

Este documento é uma proposta de implementação; a cobertura possível da sincronização WhatsApp, descrita abaixo, precisa ser explicitamente aprovada antes de implementar. Não foi feita importação de contatos reais nesta preparação.

## Experiência proposta

Em Cotação, o acesso Fornecedores passa a **Agenda de contatos**. A agenda reúne os fornecedores existentes e os novos contatos gerais, com pesquisa por nome, empresa, telefone e categoria, filtros de classificação/abrangência e paginação. Exibir quantidade total e origem dos registros.

Ações: **Novo contato**, **Importar arquivo**, **Sincronizar WhatsApp** e **Classificar para cotação**. Editar preserva ID, autoria, versões e histórico. Não incluir exclusão permanente nesta entrega.

Importações apresentam prévia, erros por linha, duplicados e resultado real de gravação. Telefones repetidos não criam outro contato nem sobrescrevem categorias, nomes ou condições já conferidos. Cada telefone é um registro, inclusive quando uma pessoa tem vários números. Contatos sem telefone utilizável ficam listados nos erros da prévia, sem serem gravados como destinatários.

Contatos gerais ou sem classificação aparecem na agenda, mas não são fornecedores elegíveis. Para habilitar um novo contato para cotação, a administração confirma segmento comercial e abrangência (Manaus ou nacional). Permitir classificação em lote dos contatos selecionados. Não inferir Manaus pelo DDD e não transformar pessoa/contato pessoal em loja pelo nome. Dados opcionais vindos do arquivo são sugestões visíveis para conferência.

## Cotação e pertinência

Reutilizar as regras atuais de `supplier-discovery.ts`, incluindo manutenção material versus serviço, categoria explícita, categoria ausente/ambígua e etapa local/nacional. Preservar itens originais.

Na janela de cotação, mostrar somente fornecedores classificados e compatíveis com pelo menos um item, indicando os itens atendidos. Oferecer **Selecionar todos os compatíveis** e **Limpar seleção**, preservando revisão explícita e botão de preparação. Contatos gerais, sem classificação ou fora da abrangência não entram na lista. Não executar preparação ou envio ao importar/sincronizar/classificar/abrir a janela.

Revalidar a mesma compatibilidade no servidor ao preparar e antes de retirar da fila. Se houver edição de telefone depois de preparar uma tarefa, a tarefa antiga não pode ser enviada para o telefone anterior nem ser redirecionada silenciosamente. Edição de telefone com envio em processamento/incerto exige conferência, sem reenvio automático. Nenhuma seleção/avaliação comercial ou aprovação da solicitação muda.

## Importação CSV e VCF

- CSV UTF-8 com BOM opcional, separador vírgula/ponto e vírgula/tabulação, aspas e quebras de linha dentro de campos; cabeçalhos comuns em português e de exportação do Google Contacts.
- VCF 3/4: FN/N, ORG, TEL, EMAIL, categorias/endereço quando fornecidos; linhas dobradas e caracteres escapados. Detectar codificação/formato não suportado e informar a linha, sem truncar silenciosamente.
- Prévia com normalização de telefones e país explícito para números sem DDI. Preservar números brasileiros de oito ou nove dígitos após DDD; não acrescentar o nono dígito automaticamente. Excluir grupos, LIDs opacos e entradas de telefone inválidas.
- Limite proposto: 5 MB/arquivo e 5.000 números por arquivo. Importar em lotes pequenos, revalidando tudo no servidor, com progresso e retomada segura por telefone. Se parte dos lotes falhar, mostrar quantos foram confirmados e permitir repetir sem duplicar.
- Arquivos são lidos para a prévia no navegador; enviar apenas os campos de contato selecionados, sem persistir o arquivo original. Campos extras não são instruções nem código. Sem importação automática de mensagens ou anexos.

## Sincronização WhatsApp — cobertura verificável

O WhatsApp/OpenClaw instalado não fornece uma API de agenda completa do celular. Foi verificado o código oficial instalado: `listWhatsAppDirectoryPeersFromConfig` usa `allowFrom`; usá-lo como agenda importaria apenas a lista de permissão. A inspeção somente de tabelas/colunas do banco local encontrou `channel_ingress_events`, sem tabela de agenda/contatos. Não consultar credenciais para tentar obter uma agenda e não usar a conta pessoal como alternativa.

**Proposta viável nesta instalação:** o botão sincroniza os **contatos das conversas disponíveis no OpenClaw da conta operacional**, extraindo apenas identidade, nome e telefone das entradas nativas retidas. Não importa corpo de mensagem, anexos, grupos ou contatos sem telefone resolvido. Fornecedores existentes continuam visíveis; contatos do celular que não aparecem nessa fonte são complementados por CSV/VCF.

O produto deve mostrar a cobertura claramente: **“Contatos conhecidos do WhatsApp operacional; pode não incluir toda a agenda do celular.”** Exibir última sincronização, quantidade de novos/duplicados/pendentes, conta, alcance da fonte e falhas reais. Não apresentar a sincronização como completa ou bem-sucedida se a fonte não estiver disponível.

O clique administrativo solicita uma sincronização na fila própria de contatos. A ponte existente atende somente solicitações explícitas e anuncia capacidade `contacts-v1`; pontes antigas continuam funcionando para mensagens/pesquisa, e a UI indica atualização necessária para contatos. O adaptador local abre a fonte em modo estritamente somente leitura, filtra `channel_id=whatsapp` e `account_id=operacional`, valida formato/versão e extrai campos específicos por SQL. Não exporta payloads inteiros, política allowFrom ou tokens. Consulta uma fotografia finita por execução; paginação/cursor e deduplicação permitem recuperação sem perder contatos do lote.

O resultado fica em prévia administrativa antes da importação/classificação. A ponte autentica pelo acesso de serviço/HMAC existente; respostas são vinculadas à solicitação de sincronização, com prazo e controle de versão. Concluir fora de prazo ou sem solicitação ativa é recusado. Falhas da sincronização de contatos não bloqueiam a importação de respostas nem a fila atual. Não abrir conexão WhatsApp paralela, relogar, alterar credenciais, restaurar sessão, reiniciar serviços ou ativar envio para sincronizar.

**Limite importante para aprovação:** a agenda completa do aparelho não pode ser prometida por esta sincronização; para isso a entrada garantida é o arquivo CSV/VCF exportado pelo usuário. Se for indispensável sincronizar integralmente a agenda do aparelho, será necessário definir outro provedor/conector de contatos antes de implementar essa parte.

## Arquitetura e compatibilidade

Abordagem recomendada: uma agenda única que reúne fornecedores existentes (`supplier`) e novos contatos gerais (`agenda_contact`) no armazenamento `records`. Reaproveitar IDs/regras dos fornecedores e os contratos atuais de cotação; novos contatos só passam a `supplier`, preservando UUID, após classificação administrativa explícita. Promover não pode colidir com outro telefone já cadastrado. Nenhuma migração/destruição de registros legados.

Alternativas avaliadas: tornar todo contato um fornecedor com categoria fictícia causaria seleção indevida; manter duas agendas independentes duplicaria telefones e dificultaria a conferência. A projeção única com classificação preserva o catálogo atual e separa contatos não comerciais.

Separar parser/normalização, persistência/deduplicação, API administrativa, painel da agenda, formulário de importação e adaptador WhatsApp. Não ampliar o arquivo dashboard com a lógica de importação. Usar componentes e estilos do sistema atual, sem dependência nova se a plataforma existente bastar.

Master/ADM consultam e alteram a agenda. Setor, DG e Financeiro não recebem os novos contatos, resultados de sincronização ou fonte privada nas APIs. As operações administrativas validam sessão, origem, corpo, quantidade, tipos e versão no servidor; a ponte valida HMAC e escopo de operação. Importação nunca sobrescreve cadastro conferido; atualização é uma ação explícita, com versão e auditoria.

## Validação e entrega

Somente dados fictícios locais na porta 5185. Testes devem cobrir parsers reais, telefones antigos/formatados, duplicação concorrente e repetição, permissões/CSRF/limites, classificação, material versus serviço, abrangência, IDs históricos e edição de telefone versus tarefa preparada. Adaptador WhatsApp testado com SQLite fictício: somente conta operacional, sem grupos/autoidentidade/LIDs, esquema incompatível e sem exportar texto/anexos. Teste de sincronização ponta a ponta com transporte simulado, sem contatos/mensagens reais.

Validar agenda/importação/cotação em desktop e celular, erros, vazio, filtros, progresso e retomada, sem habilitar envios. Rodar tipos, build e suítes de fornecedores/contatos/integração/perfis afetadas. Preservar as duas chaves de envio e as sete tarefas reais. Nenhuma importação em produção, instalação/reinício da ponte ou publicação pelo chat de Compras; preparar documentação/branch/SHA para revisão e integração pelo coordenador.

## Decisões deixadas ao implementador

Nomes exatos de arquivos/helpers, tamanhos de página e lotes dentro dos limites, apresentação dos filtros e organização dos testes. Não são decisões abertas: conta operacional, ausência de envio automático, revisão das classificações, privacidade, compatibilidade e cobertura limitada da fonte WhatsApp.
