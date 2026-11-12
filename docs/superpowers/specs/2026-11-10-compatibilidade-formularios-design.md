# Compatibilidade com os formulários e controles anteriores

Data: 10/11/2026. Estado: escopo aprovado expressamente pelo usuário em 10/11/2026; implementação e verificação em andamento.

## Objetivo e autorização existente

O usuário pediu a implantação de tudo que os formulários antigos fazem antes de simplificar o sistema. Determinou que os setores terão somente os formulários de orçamento; os demais documentos se aplicam às diretorias, respeitando as permissões existentes. Preservar o projeto, a hospedagem, os usuários e os dados existentes. Não enviar mensagens reais a fornecedores durante testes.

Fonte somente leitura: `Z:\Orçamentos e Compras\Mensal\DOCUMENTAÇÃO E MATRIZES`. Nenhum arquivo original foi alterado. A leitura considerou os textos e tabelas dos quatro DOCX, células/fórmulas/validações das duas planilhas, oito lâminas em imagem da apresentação e as duas imagens avulsas.

## Fontes e abrangência

| Arquivo | Requisitos que fornece | Destinatário no sistema |
| --- | --- | --- |
| Formulario_de_Solicitacao_Orcamentaria.docx | Solicitação mensal, verificações, referências, declaração; conferência, parecer, financeiro, decisão e execução | Setor nas seções 1–7; administração nas demais; DG na decisão da necessidade |
| Formulario_de_Solicitacao_Emergencial.docx | Ocorrência, riscos, solução, justificativa da emergência; avaliação e análise posterior | Setor nas seções 1–7; administração nas demais; DG na decisão da necessidade |
| Formulario_de_Orcamento_de_Assinaturas_Digitais.docx | Várias assinaturas na mesma demanda, ciclos, vigências, moedas, TI e privacidade; controle de contratação/ativação/renovação | Setor nas seções 1–7; administração nas demais; DG na decisão da necessidade |
| Mapa_de_Cotacoes.xlsx | Comparação de fornecedores, preços, condições, avaliações, escolha justificada e exceções | Administração |
| Planilha_Mestra_Orcamento_Mensal-Integrada.xlsx | Consolidação mensal, controles, indicadores, fechamento, ações corretivas, NF, tributos e pagamentos, matriz fiscal | Administração; consolidado como contexto de aprovação para DG |
| POP_Elaboracao_Analise_Aprovacao_Orcamento_Mensal.docx | Responsabilidades, devolução/complementação, calendário e indicadores | Regras e orientações por perfil |
| Ciclo estratégico para os orçamentos.pptx | Planejamento, classificação, responsabilidades e calendário | Orientações por perfil |
| Guia_do_Novo_Fluxo_Orçamentário.png | Resumo das etapas, prioridades e calendário | Orientações por perfil |
| WhatsApp Image 2026-08-10 at 03.10.36.jpeg | Fluxo visual do processo anterior | Referência de processo |

## Regras de precedência

Os arquivos são requisitos de referência; as instruções expressas da conversa e do AGENTS.md prevalecem quando houver divergência.

1. A Diretora Geral Franciluce Lima aprova a necessidade, sem aprovar valor, impor teto financeiro ou reaprovar por preço real superior à estimativa. Não recriar os campos antigos “valor aprovado”, “valor autorizado” e “saldo aprovado” como poderes financeiros da DG. Apresentar valores informativos como solicitado, recomendado, referência do pedido com necessidade aprovada, contratado e realizado; as diferenças são gerenciais e não disparam nova aprovação financeira.
2. A estimativa na internet e o parecer administrativo precedem a aprovação da necessidade. As cotações comerciais oficiais e a escolha do fornecedor continuam após essa aprovação, com Manaus primeiro e busca nacional após um dia útil sem proposta local válida. Documentos ou preços trazidos pelo setor são referências preliminares identificadas, sem virar proposta oficial automaticamente.
3. A quantidade de propostas segue a configuração existente. Documentar exceções justificadas (exclusividade, continuidade, padronização, indisponibilidade, emergência ou outro), com responsável e evidências. Não transformar a referência antiga a três cotações em regra fixa global.
4. Emergencial é um tipo de formulário e uma classificação que exige justificativa; não significa compra automaticamente autorizada, disparo de WhatsApp ou dispensa automática das aprovações.
5. Datas de implantação de agosto/setembro de 2026 são históricas. Usar o cronograma mensal permanente para os períodos novos. Não importar como agenda futura as datas e os dias da semana antigos.
6. As duas solicitações já preenchidas na planilha mestra não serão importadas automaticamente: são dados de referência a reconciliar, para evitar duplicação de pedidos existentes.
7. A matriz fiscal serve para controle documental e registro de orientação da Contabilidade. Não calcular ou inferir alíquotas, retenções ou tributos automaticamente.

## Abordagens

**Recomendada:** ampliar o sistema atual com três modelos de solicitação, seções administrativas estruturadas e uma visão mensal. Reutilizar os estados e as integrações existentes; acrescentar apenas as etapas de complementação e adiamento necessárias. É a opção que mantém um único histórico, permissões e fonte de dados.

**Alternativa considerada:** incorporar Word/Excel para preenchimento externo e registrar somente o resultado no painel. Mantém retrabalho e não atende ao pedido de implantar os recursos dos formulários no próprio sistema.

**Alternativa considerada:** substituir o fluxo atual integralmente pelo POP antigo. Diverge da aprovação de necessidade já definida, da pesquisa automática e das cotações sob responsabilidade administrativa; não será utilizada sem nova decisão expressa do usuário.

## Experiência dos setores

Uma área “Solicitações de orçamento” com escolha entre mensal, emergencial e assinaturas digitais, formulário correspondente, confirmação do envio e consulta somente das próprias solicitações. O usuário fica vinculado ao seu setor; autoria e datas do sistema não são campos livremente alteráveis. Pode corrigir uma solicitação quando devolvida pela administração, com prazo, resposta e versão anterior preservados. Não acessa fornecedores internos, cotações oficiais, notas fiscais, pagamentos, relatórios ou controles administrativos.

### Campos comuns da solicitação

- Número/protocolo gerado pelo sistema, protocolo externo opcional e vínculo de complementação ao pedido original.
- Mês de referência, data de envio registrada pelo servidor, situação nova/complementação e origem planejada/eventual.
- Setor, responsável, cargo/função, contato e centro de custo/projeto.
- Data necessária, local de utilização/entrega, finalidade, justificativa, consequência da não aprovação e resultados/benefícios esperados.
- Prioridade Essencial/Importante/Adiável; preservar os rótulos Normal/Alta/Urgente nos registros antigos sem conversão silenciosa.
- Natureza recorrente/eventual, previsão prevista/não prevista, tipo Compra/Serviço/Contratação/Manutenção/Evento/Outro e vínculo operacional/pedagógico/outro.
- Itens repetíveis: descrição, quantidade, unidade, especificações, marca/padrão necessário, categoria e valor unitário estimado informado pelo setor. Totais derivados no servidor, em centavos; não substituir a estimativa pesquisada.
- Verificações declaradas do setor: estoque, duplicidade, quantidade e documentos disponíveis. Sem caixa marcada automaticamente em nome do usuário; ausência de documentos deve admitir justificativa.
- Referências preliminares repetíveis: item relacionado, fornecedor informado, plano/condição quando aplicável, moeda/valor, prazo, validade, documento/link/referência. Fornecedor indicado e justificativa. Esses dados não criam fornecedor ou cotação oficial por conta própria.
- Declaração explícita, nome e cargo do responsável e registro de aceite com autor e data/hora. O aceite autenticado substitui a assinatura digitada do Word; não alegar assinatura digital certificada.
- Anexos e links com nome, tipo, tamanho, autor e data; associar ao pedido e, quando útil, ao item ou cotação preliminar.

### Solicitação emergencial

Além dos dados comuns, registrar data/hora e local da ocorrência, descrição do fato, quando/como identificado, pessoas/atividades/estruturas afetadas, naturezas de risco (segurança, estrutural, elétrica, hidráulica, operacional, pedagógica, tecnológica), impacto Baixo/Médio/Alto/Crítico, interrupção Sim/Não/Parcial, risco a pessoas e patrimônio, risco imediato, consequências da inação, prazo máximo seguro para solução, motivo da imprevisibilidade, impedimento de aguardar o ciclo, medidas provisórias adotadas, origem provável, indício e explicação de falha de planejamento/manutenção, intervenção proposta, especificações, resultado e prazo de execução.

Disponibilizar fornecedores/cotações preliminares existentes e justificativa se não houver. Registrar declaração específica da emergência. Avisar na própria interface que atrasos ou esquecimentos não caracterizam emergência automaticamente.

### Assinaturas digitais

- Uma assinatura por item: plataforma, plano/licença, quantidade de usuários/licenças, ciclo mensal/anual/outro, início e fim da vigência, quantidade de ciclos, moeda e valor por ciclo. Calcular o total da vigência considerando licenças e ciclos, com semântica explícita de preço por licença.
- Moedas BRL/USD/EUR/outra, taxa e data/base da conversão por moeda utilizada. Sem conversão presumida; marcar total consolidado em reais como incompleto quando faltar taxa. Contagem de assinaturas e total consolidado calculados.
- Objetivo geral, usuários/setores atendidos, ativação/renovação desejada, modalidade Nova/Renovação/Ampliação/Migração, uso Administrativo/Pedagógico/Misto, previsão orçamentária, dados pessoais Sim/Não, integrações Sim/Não e gestor das licenças.
- Verificações específicas: solução/licença equivalente ativa, ausência de duplicidade, quantidades/vigência, requisitos técnicos/compatibilidade, reajuste/renovação automática/cancelamento e documentos disponíveis.
- Validação TI/Segurança N/A/Pendente/Concluída; informações do setor são declaração inicial, e a conferência administrativa registra a validação técnica/privacidade quando aplicável.
- Referência preliminar de cada assinatura ou justificativa de ausência. Alternativas podem repetir o número do item.

## Experiência administrativa e Diretoria Geral

### Conferência e parecer

Conferência estruturada com Sim/Não/N/A para cada critério dos modelos originais. Modelo mensal: completude, necessidade/finalidade, quantidade, estoque, duplicidade, documentos, mercado, prioridade, redução/adiamento e fornecedor/condições. Modelo digital: somar individualização das assinaturas, licenças compatíveis, licença ativa, TI/privacidade, ciclos/vigência/reajuste/renovação e total consolidado. Emergencial: imprevisibilidade comprovada, risco do adiamento, proporcionalidade, valor/fornecedor e impossibilidade de aguardar.

Registrar pendências/esclarecimentos, prazo de complementação, resposta do setor, responsável, data/hora e histórico das revisões. O envio corrigido volta à estimativa/análise; aprovações e cotações não podem permanecer válidas para conteúdo alterado depois de aprovado. Por isso a edição pelo setor será limitada a pedidos devolvidos antes da aprovação geral.

Parecer com recomendação Aprovar integralmente/Aprovar parcialmente/Complementar/Adiar/Rejeitar (emergencial inclui medida provisória), prioridade validada, escopo/itens/quantidades recomendados, valor recomendado informativo, análise, justificativa, condições/ajustes, observações, assinatura autenticada/data e prazo da análise. Pedido parcial deve ter escopo identificável, sem comprar itens que foram excluídos. Registrar classificação emergencial validada e medida preventiva/corretiva quando pertinente.

### Avaliação financeira

Disponibilidade Integral/Parcial/Indisponível, valor disponível, impacto no caixa Baixo/Médio/Alto, período/forma de pagamento, condição recomendada, conta/centro de custo, responsável, data/hora e observações. Assinaturas: valor mensal equivalente e compromisso anual, com base e período explícitos. Acesso inicial por Master/Diretoria Administrativa; não criar papel Financeiro com acesso ampliado para o usuário de setor Financeiro.

### Decisão da necessidade

DG vê os pedidos aguardando decisão e o contexto necessário do parecer, estimativa e financeiro. Opções: aprovar, aprovar parte identificada do escopo, adiar ou rejeitar; emergência admite medida provisória com escopo identificável. Registrar condições não financeiras, prazo pertinente, determinação preventiva/corretiva, responsável autenticado, data/hora e protocolo. Não permitir edição de cotações, execução, conferência administrativa ou pagamento por esse perfil.

### Mapa de cotações

Reutilizar propostas reais do sistema e acrescentar CNPJ/CPF e e-mail/telefone do fornecedor, responsável/data da pesquisa, condições de pagamento, prazo de execução/entrega, validade, frete incluso Sim/Não/N/A, garantia, NF Sim/Não/N/A, disponibilidade imediata, regularidade cadastral, observações, documentos e moeda/base de valor quando necessário.

Mostrar preço unitário, quantidade, subtotal de item, subtotal da proposta, frete/outras despesas e total geral. Não adicionar frete duas vezes. Propostas parciais/incomparáveis devem ficar identificadas e não ser selecionadas como atendimento integral.

Avaliação Favorável/Regular/Desfavorável para preço, qualidade/adequação, prazo, pagamento, garantia/suporte e histórico/confiabilidade. Critério Menor preço/Melhor custo-benefício, fornecedor recomendado, justificativa objetiva caso não seja o menor, riscos/ressalvas, exceção justificada à quantidade configurada de propostas e evidência. Escolha/validação comercial pela administração, sem nova aprovação de fornecedor/valor pela DG.

### Execução e prestação de contas

Registrar comunicação ao setor (data/responsável), fornecedor utilizado, contratação/compra/execução, valor contratado e realizado, data, conferência e responsável, situação Concluída/Parcial/Pendente, NF/documento, diferenças para estimativa/contratado com justificativa e observações. Recebimento/aceite e encaminhamento ao financeiro são separados do pagamento.

Assinaturas: Contratada/Ativada/Renovada, ativação/renovação efetiva, ciclo de cobrança real, próxima revisão/cancelamento, conferência dos acessos/licenças e conclusão. Emergencial: autorização da necessidade e execução com data/hora, fornecedor CNPJ/CPF, provas, causa posterior, possibilidade de prevenção, ação preventiva, responsável e prazo.

### Notas fiscais, tributos e pagamentos

Uma ou mais notas por solicitação, cada uma com fornecedor, número, emissão, valor, vencimento, recebido/aceito, CNPJ correto, XML, envio à Contabilidade, tributo/guia, vencimento do tributo, liberação, data do pagamento, status e pendência/observação. Documentos vinculados, com trilha de auditoria.

Bloquear o registro de pagamento enquanto faltar requisito aplicável de recebimento, documento correto, XML ou dispensa justificada e validação/liberação contábil. Operações que exigem retorno da Contabilidade permanecem bloqueadas até orientação registrada. N/A exige justificativa onde admitido. Não executar pagamentos bancários nem enviar mensagens à Contabilidade automaticamente.

Matriz fiscal com os 12 cenários originais e seus textos de alerta/conduta/documentos/responsáveis: compra no Amazonas; interestadual; marketplace; patrimônio; uso/consumo; revenda/repasse; serviço PJ; serviço PF; frete separado; devolução/troca/cancelamento/complemento; reembolso a colaborador; operação não prevista/CNPJ duvidoso. Registrar validação Pendente/Validado/Ajustar e referência à orientação formal. O sistema controla pendências, sem calcular tributação.

## Consolidação, calendário e fechamento mensal

Área administrativa por mês de referência, com totais solicitado pelo setor, recomendado, referência dos pedidos com necessidade aprovada, contratado e realizado. Mostrar diferenças informativas sem teto de aprovação. Valores ausentes permanecem ausentes (não virar zero silenciosamente). Agrupar por setor, natureza, prioridade e status; mostrar emergenciais, devolvidos, adiados e rejeitados.

Indicadores: entregues no prazo, devolvidos por falta de informação, cobertura de cotações/exceções, solicitações sem parecer/decisão/documentos/encerramento, quantidade/valor de emergenciais, diferenças gerenciais e pendências fiscais. Sem importar fórmulas quebradas ou células auxiliares da planilha: por exemplo, o Resumo possui fórmulas de redução/saldo e referências de totais que precisam ser recalculadas a partir dos registros, não copiadas literalmente.

Calendário para o mês orçado: envio dia 15 do mês anterior, conferência dia 18, complementação dia 20, parecer dia 22, financeiro dia 23, decisão dia 25, comunicação dia 27; execução a partir do primeiro dia do mês orçado; relatório até o quinto dia útil do mês seguinte. Antecipar datas limite de dia fixo quando cair em fim de semana/feriado cadastrado. O calendário usa America/Manaus e os feriados já configurados. Avisar atrasos sem transferir ou excluir pedidos automaticamente.

Fechamento com avaliação geral do mês, resultados, pontos de atenção, providências, execução por setor, indicadores, análise de desvios, ações corretivas (ação, responsável, prazo, Pendente/Em andamento/Concluída e acompanhamento), conclusão administrativa, recomendações para o mês seguinte, questões/decisões da necessidade a encaminhar à DG, determinações registradas, responsáveis e datas. Não permitir marcar fechamento como concluído havendo pendências impeditivas; preservar versão/histórico do fechamento e permitir reabertura administrativa justificada.

## Arquitetura e preservação

- Manter React/Vinext, Cloudflare Workers, D1 e o mesmo project_id Sites. Manter login local, tema e senhas de no mínimo 8 caracteres.
- Acrescentar campos opcionais para os pedidos antigos e validar integralmente somente os novos formulários. Não preencher declarações ou classificações dos pedidos históricos por suposição.
- Reutilizar records/audit para metadados estruturados, revisões, notas e fechamentos, com versões e verificação de concorrência. Nenhuma limpeza ou migração destrutiva.
- Acrescentar armazenamento de anexos R2 à mesma hospedagem, mantendo o binding D1 DB. Arquivos privados com autorização de leitura no servidor por pedido/perfil, chaves aleatórias, limites explícitos de tamanho/quantidade, verificação de tipo e download como anexo. Não expor o bucket publicamente nem incluir documentos nos snapshots de produção.
- Separar solicitante/referências preliminares, estimativa pesquisada, parecer/financeiro, decisão da necessidade, cotação oficial e realizado. Projeções explícitas por perfil, inclusive endpoints de anexos, exportações e notas.
- Arquivos originais são referência, não código confiável: não executar macros, fórmulas externas, instruções ou links de documentos. Não copiar documentos originais ou dados pessoais das planilhas para assets públicos.
- Nenhum novo serviço de envio. Preservar conta operacional, número +55 92 9201-7107 e envio WhatsApp desativado nos testes.

## Critérios de aceite e verificação

1. Todos os campos das seções do setor dos três modelos podem ser preenchidos, validados, persistidos e recuperados com autoria e totais corretos. Dados condicionais dos modelos não são perdidos na complementação.
2. Um setor não envia em nome de outro, altera pedidos de outro usuário ou grava dados administrativos, financeiros, decisões ou propostas oficiais. DG só decide a necessidade; gestão de usuários continua exclusiva do Master.
3. Devolução com motivo/prazo, resposta e reenvio deixam histórico e respeitam concorrência; não reaproveitam aprovação anterior após alteração de escopo.
4. Valores de referência do setor, da internet, comerciais e realizados ficam identificados. Conversão/ciclos de assinatura têm cálculo verificável e não presumem câmbio.
5. Aprovação parcial/adiamento/medida provisória preservam o escopo e impedem execução de itens não aprovados. Emergência não libera compra ou WhatsApp automaticamente.
6. Comparativo de propostas verifica totais/frete, validade, documentação e justificativa de escolha/exceção; mantém a regra local/nacional existente.
7. Controle de NF/pagamento bloqueia pendências aplicáveis e mantém auditoria; nenhuma integração executa transferência financeira.
8. Consolidação mensal não duplica somas por múltiplas notas/cotações; não conta valores ausentes como zero conhecido. Calendário cobre virada de ano, fim de semana, feriados e quinto dia útil.
9. Anexos exigem sessão, perfil e acesso ao pedido; uploads inválidos/grandes são negados; download não permite execução de HTML/XML no domínio do sistema. Setor e DG não recebem documentos internos indevidos.
10. Testes isolados de modelo/permissões/transições/cálculos, testes locais completos dos três formulários e dos controles, revisão móvel/claro/escuro, TypeScript e build. Depois publicação oficial na mesma hospedagem e verificação de acesso. Nenhuma mensagem real a fornecedores.

## Decisões deixadas à implementação

Organização visual em seções para tornar o preenchimento extenso utilizável, nomes internos de campos, limites técnicos razoáveis de anexos, layout da consolidação e formatos de exportação administrativa. Preferir componentes pequenos, testes das regras de negócio e ausência de dependências novas quando o projeto já oferece recursos suficientes.

## Definições após a revisão do desenho

As escolhas abaixo são propostas de implementação, não políticas já confirmadas pela escola. Integram o escopo a conferir.

### Retomada de adiamento e medida provisória

Pedidos adiados não voltam ao fluxo nem mudam de competência automaticamente. A administração registra a retomada com justificativa, data e mês de referência proposto. A competência original permanece no histórico. Conteúdo alterado volta à estimativa e à análise; mesmo sem alteração, a retomada após adiamento pela DG exige uma nova decisão da necessidade. O consolidado identifica a transferência de competência, sem duplicar valores nos dois meses.

Uma medida provisória autoriza somente o escopo temporário explicitamente escolhido na decisão. A solução definitiva é outra solicitação vinculada à ocorrência original, seguindo todas as etapas. Não ampliar automaticamente o escopo nem reaproveitar autorização provisória para a solução definitiva. Conservar vínculos para a análise posterior da emergência e evitar dupla contagem.

### Pendências no fechamento e continuidade entre meses

Fechar a posição do mês não significa declarar que todas as compras e parcelas terminaram. São impeditivos: realizado/contratado sem aprovação da necessidade válida; documento obrigatório ausente para operação já marcada como paga; pagamento marcado sem liberação válida; registro de encerramento inconsistente com recebimento/aceite e encaminhamento financeiro; diferença financeira sem explicação registrada; pedido aberto sem responsável e próxima ação definidos. Solicitações ainda não decididas precisam de encaminhamento explícito, como adiar, devolver ou manter pendência com responsável e prazo.

Compras com entrega futura e pagamentos ainda não vencidos podem permanecer em acompanhamento, desde que o fechamento liste solicitação/nota, saldo ou valor a confirmar, responsável, próxima ação e prazo. O mês seguinte mostra esses acompanhamentos como posição trazida do período anterior, sem somar novamente o valor originalmente solicitado. Pendências abertas continuam visíveis após fechar. Um fechamento gera uma versão da posição conhecida naquele momento; corrigir dados posteriores exige reabertura justificada e nova versão, preservando a anterior.

### Aplicabilidade fiscal e dispensa

A aplicação fiscal é registrada pela administração a partir de orientação formal da Contabilidade, sem decisão tributária automática pelo sistema. Para cada documento, exigir uma avaliação explícita dos requisitos: recebido/aceito, documento no CNPJ correto, XML/documento fiscal equivalente e orientação contábil aplicável. Estado inicial Pendente; campos vazios nunca equivalem a dispensa.

XML pode ter N/A para um documento que não usa XML, desde que informado o tipo documental, a justificativa e a referência à orientação da Contabilidade. Recebimento pode ter liberação excepcional anterior ao aceite (ex.: adiantamento contratual), somente com justificativa, documento que prevê a condição e referência da autorização administrativa/contábil. Isso não marca o bem como recebido. Documento no CNPJ correto não pode receber N/A sem orientação formal que descreva a exceção, como reembolso autorizado com comprovantes.

Nos cenários que a matriz identifica como bloqueados até orientação, exigir retorno contábil registrado antes de liberar. Nos demais, permitir registrar “consulta não necessária”, com justificativa de enquadramento baseada em orientação formal identificada. Não basta o usuário marcar Liberado: o servidor verifica todos os requisitos aplicáveis, as dispensas e suas evidências. Autor do registro e responsável externo que emitiu a orientação são identificados separadamente; uma transcrição administrativa não será apresentada como assinatura da Contabilidade.
