# Entrega — Conhecimento e POPs

Data: 13/11/2026. Branch: `codex/conhecimento-pops`.
Etapa entregue: regras aprovadas registradas, desenho consolidado e plano de implementação em oito tarefas; mantém auditoria e organização do acervo com os 31 complementares. Somente documentação.
Base auditada: `fa211930be936b79aa5deee58ad3c3a307f9a927`.
O SHA completo desta entrega documental será informado na resposta final do chat após o commit e a conferência do push; não se trata de implementação pronta para publicar.

## Escopo concluído

- Leitura dos oito arquivos obrigatórios e conferência da raiz/branch/status/manifesto.
- Auditoria de sessão, perfis/setores, shell/navegação, UI, rascunhos, D1/auditoria, R2 e isolamento de desenvolvimento.
- Proposta, alternativas, decisões pendentes e pontos compartilhados em `AUDITORIA-E-PROPOSTA.md`, nesta pasta.
- Vínculos futuros com Tarefas e Materiais documentados sem implementar esses módulos. Escolar Manager permanece apenas planejamento.
- Conferência somente de leitura do NAS autorizada pelo usuário: estrutura, formatos, tamanhos e duplicidade amostral. Resultados agregados em `CONFERENCIA-NAS.md`; sem cópia/importação dos documentos.
- Decisão do usuário registrada: `Doc's SIE` é a referência principal. Comparados todos os 1.719 arquivos por SHA-256; resultado organizacional em `COMPARACAO-ACERVO.md`. Inventário detalhado e scripts apenas locais/ignorados, sem documentos originais no Git.
- Nova decisão incorporada: incluir os 31 complementares na proposta e organizar o acervo por setor. `ORGANIZACAO-POR-SETOR.md` relaciona os 31 e consolida 557 conteúdos únicos em sete áreas documentais; preservados 962 caminhos de origem em catálogo somente local.
- Na etapa anterior, proposta de regras por perfil/setor em `REGRAS-DE-ACESSO-E-PUBLICACAO.md`: matriz dos cinco perfis, oito setores, três públicos, editores, rascunhos, aprovação, revisões e arquivo. Naquela entrega aguardava aprovação e nenhuma concessão foi aplicada; a atualização seguinte registra a aprovação recebida.
- Atualização posterior: usuário aprovou integralmente as regras e autorizou consolidar desenho/plano. Aprovação registrada na política. `DESENHO-CONSOLIDADO.md` define escopo, experiência, estados, autorização, persistência, API, anexos/ingestão e contratos; `PLANO-DE-IMPLEMENTACAO.md` organiza oito tarefas com arquivos, interfaces, critérios e comandos futuros. Nenhuma tarefa foi executada.
- Revisão independente do desenho, conforme skill brainstorming: revisor não identificou lacuna importante que impeça um plano seguro; verificações técnicas restantes já estão previstas como marcos. Revisão do plano feita pelo autor para cobertura, interfaces e cinco riscos principais.

## Pendências que impedem iniciar implementação

- Política aprovada: não reabrir a aprovação das regras. Desenho e plano prontos para revisão antes de iniciar execução; execução direta nesta sessão é a recomendação, sem implementação nesta etapa.
- Indicar editores, vínculos de RH/subáreas e responsáveis documentais na preparação operacional, sem inventar usuários ou nomes.
- Avaliar editor/hash incremental, streaming multipart e dependências na tarefa 1. Alinhar contratos compartilhados e ordem da migração com coordenador antes de integração.
- Fonte principal e inclusão dos 31 estão definidas. Busca V1 cobre páginas/metadados, sem OCR/texto de anexos; arquivos têm limite planejado de 256 MiB com partes de 8 MiB, a validar localmente. Uso das variantes BSC/BDG não selecionadas e ingestão real ficam para etapa operacional autorizada separadamente. Não tocar nos originais do NAS.

## Verificações e resultados reais

- `git rev-parse --show-toplevel`: raiz obrigatória `C:/Users/aegis/Documents/ChatGPT/Compras/escola-compras/.worktrees/conhecimento-pops`.
- `git branch --show-current`: `codex/conhecimento-pops`.
- `git status --short` inicial: vazio.
- Checagem sem escrita com `node --input-type=module -e` e `node:assert/strict`, importando `readModuleWorkspace`, `localDevelopmentBase`, `developmentArguments` e `allowedModulePush` de `scripts/module-workspace.mjs`: PASS para módulo/branch, URL `http://127.0.0.1:5182`, argumentos de host/porta e recusa de porta 5173/push main. Não executa push nem inicia servidor.
- Revisão documental: escopo, acesso, publicação/histórico, anexos, busca, vínculos e limites confrontados com o pedido e os caminhos auditados.
- Auditoria inicial: `git diff --cached --check` PASS para os dois documentos originais. Atualização NAS: `git diff --check` PASS; mudanças limitadas à documentação desta pasta.
- Build, tipos, testes de aplicação, HTTP e inspeção visual não executados: somente documentação alterada. Não afirmar funcionamento de editor, busca ou permissões ainda não implementados.
- Na conferência inicial do NAS, `Test-Path`, `Get-ChildItem`, `Get-Item` e `Get-FileHash -Algorithm SHA256`: leitura bem-sucedida, 200 pastas recursivas e 1.719 arquivos filtrados; três pares amostrados de PDFs administrativos com hashes iguais. Naquela etapa não foram comparados todos os arquivos nem analisado seu texto/diagramação.
- Atualização posterior, comparação completa: `python <worktree>/.ceea-workspace/compare_nas_readonly.py` terminou com código 0; 1.719 hashes calculados, sem erros. Dos 1.191 arquivos fora da referência: 403 idênticos, 14 de mesmo nome com bytes diferentes (XLSX) e 774 sem correspondência pelos critérios usados. Inclui 169/169 arquivos administrativos idênticos e 31 possíveis POPs complementares.
- `python <worktree>/.ceea-workspace/report_nas_comparison.py`: PASS, código 0; partição/contagens/hashes reconciliados e metadados dos 1.719 arquivos relidos sem alteração detectada. Nova enumeração PowerShell: mesmos 1.719 caminhos; três pares revalidados independentemente com Get-FileHash, com os resultados esperados. Textos, células e vigência não analisados.
- Comparação completa: `git diff --cached --check` PASS; staging conferido com exatamente os quatro Markdown desta pasta, sem inventário detalhado, scripts locais ou arquivos de produto.
- Organização por setor: `python <worktree>/.ceea-workspace/organize_nas_catalog.py` PASS, código 0. Validados 559 arquivos selecionados, 557 hashes únicos, 526 conteúdos da referência + 31 complementares, códigos DOC 01 a 26 completos e 962 origens preservadas. Tamanho/data dos 559 e lista de arquivos da referência sem mudanças detectadas.
- Conferência independente do JSON em PowerShell: 557 entradas/hashes únicos, 31 complementares, relatório AEE classificado em AEE, nenhum responsável inventado e nenhuma publicação definida. Agrupamentos complementares: 26 docentes, três convivência, um relatórios AEE e um avaliações adaptadas. O primeiro ensaio classificava AEE incorretamente devido ao prefixo numérico da pasta; o caso foi reproduzido, a regra corrigida e o catálogo final validado em `.ceea-workspace/nas-catalogo/20261113T182604Z/`.
- Organização: validação Python do documento e catálogo PASS, com 31 linhas numeradas na proposta, 557 hashes únicos, 962 origens distintas, totais por setor reconciliados e formatos complementares 30 DOCX + um PPTX. `git diff --cached --check` PASS; staging contém somente os cinco Markdown deste módulo, sem arquivos originais ou catálogo detalhado local.
- Proposta de governança: verificação documental Python PASS, cinco perfis existentes e oito setores atuais cobertos, situação explícita de aprovação pendente, acervo 557/31 preservado e seis documentos presentes. Revisados os exemplos de rascunho, restrição nominal, segregação de aprovação e revisão vencida; não são testes de regras implementadas. `git diff --cached --check` PASS, com somente quatro Markdown alterados/adicionados nesta etapa. Sem consulta ao NAS, servidor ou banco nesta etapa de regras.
- Consolidação posterior: verificação documental Python PASS para aprovação registrada, oito tarefas numeradas, oito documentos, contratos/limites e acervo 557/31 presentes; nenhum checkbox de execução marcado como realizado. `git diff --cached --check` PASS para exatamente seis Markdown desta atualização. Revisão independente do desenho sem lacunas impeditivas. Consulta somente a metadados locais do inventário identificou maior arquivo de 124,31 MiB e XLSB; documentação oficial Cloudflare consultada para planejar multipart. Sem acesso ao NAS, instalação, migração, servidor ou testes de aplicação nesta consolidação.

## Arquivos e contratos

- Somente os oito Markdown desta pasta compõem a entrega acumulada. Nesta atualização foram alterados auditoria, organização, política e entrega; adicionados desenho e plano. Nenhum arquivo compartilhado de produto alterado. Resultados locais detalhados não entram no Git.
- Contratos/dependências propostos: navegação entre módulos, identidade e setores, capacidades documentais, tabelas prefixadas e anexos privados. Ainda não aprovados; detalhes na proposta.
- Nenhuma dependência instalada, migração criada/aplicada ou configuração alterada. Nenhum segredo incluído.
- Nenhum dado fictício de aplicação criado, banco consultado, servidor/ponte iniciado, mensagem enviada ou documento real copiado. O NAS foi acessado somente para a conferência autorizada, sem conectar o aplicativo a ele ou enviar conteúdo a serviços externos. Porta reservada conferida em código, sem teste de disponibilidade.

## Passos para o coordenador verificar

1. Conferir o SHA completo encaminhado pelo usuário e o diff desta branch: deve conter somente esta pasta de documentação.
2. Ler `AUDITORIA-E-PROPOSTA.md`, especialmente decisões pendentes e pontos compartilhados.
   Ler também `CONFERENCIA-NAS.md` e `COMPARACAO-ACERVO.md` para o acervo existente, a fonte principal aprovada e os grupos que precisam de revisão.
   A seleção proposta atual e os 31 complementares incluídos estão em `ORGANIZACAO-POR-SETOR.md`.
   A governança em `REGRAS-DE-ACESSO-E-PUBLICACAO.md` foi aprovada pelo usuário. Ler `DESENHO-CONSOLIDADO.md` e `PLANO-DE-IMPLEMENTACAO.md` antes de qualquer execução.
3. Tratar a entrega como planejamento; não há migração nem funcionalidade a publicar.
4. Respeitar as regras já aprovadas e aguardar a revisão do desenho/plano antes da execução. Não presumir histórico automaticamente compartilhado entre chats.

## Resumo copiável

Conhecimento e POPs: regras integralmente aprovadas pelo usuário e registradas; desenho consolidado e plano de oito tarefas prontos em docs/modulos/conhecimento-pops/. Revisão independente sem lacunas impeditivas. Mantidos Doc's SIE e os 31 complementares (557 conteúdos únicos). Planejados isolamento D1/R2, aprovação por outra pessoa e uploads privados em partes para arquivos grandes. Sem implementação, acesso/alteração do NAS nesta etapa, importação, migrações ou publicação. Contratos e verificações futuros documentados; somente coordenador integra/publica. Branch codex/conhecimento-pops; acrescentar o SHA completo informado na resposta final.
