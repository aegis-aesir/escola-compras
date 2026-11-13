# Entrega — Conhecimento e POPs

Data: 13/11/2026. Branch: `codex/conhecimento-pops`.
Etapa entregue: auditoria, comparação do acervo e proposta organizada por setor com os 31 complementares incluídos, exclusivamente documental.
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

## Pendências que impedem iniciar implementação

- Usuário definir leitura, edição, privacidade dos rascunhos, gestão/herança de permissões e publicação/aprovação.
- Usuário definir responsável/revisão/validade de POPs e poderes de arquivamento/restauração.
- Escolha de abordagem, desenho aprovado e plano técnico subsequente; contratos compartilhados precisam de alinhamento com o coordenador antes de integração.
- Fonte principal e inclusão dos 31 na proposta estão definidas. Ainda pendem importação no aplicativo, uso das variantes BSC/BDG, necessidade de busca no texto dos arquivos existentes e limites para arquivos acima de 5 MiB. Não pedir novamente autorização para incluir os 31 na proposta.

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

## Arquivos e contratos

- Somente os cinco Markdown desta pasta compõem a entrega acumulada; nesta atualização foram alterados os quatro documentos anteriores e adicionado `ORGANIZACAO-POR-SETOR.md`. Nenhum arquivo compartilhado de produto alterado. Resultados locais detalhados não entram no Git.
- Contratos/dependências propostos: navegação entre módulos, identidade e setores, capacidades documentais, tabelas prefixadas e anexos privados. Ainda não aprovados; detalhes na proposta.
- Nenhuma dependência instalada, migração criada/aplicada ou configuração alterada. Nenhum segredo incluído.
- Nenhum dado fictício de aplicação criado, banco consultado, servidor/ponte iniciado, mensagem enviada ou documento real copiado. O NAS foi acessado somente para a conferência autorizada, sem conectar o aplicativo a ele ou enviar conteúdo a serviços externos. Porta reservada conferida em código, sem teste de disponibilidade.

## Passos para o coordenador verificar

1. Conferir o SHA completo encaminhado pelo usuário e o diff desta branch: deve conter somente esta pasta de documentação.
2. Ler `AUDITORIA-E-PROPOSTA.md`, especialmente decisões pendentes e pontos compartilhados.
   Ler também `CONFERENCIA-NAS.md` e `COMPARACAO-ACERVO.md` para o acervo existente, a fonte principal aprovada e os grupos que precisam de revisão.
   A seleção proposta atual e os 31 complementares incluídos estão em `ORGANIZACAO-POR-SETOR.md`.
3. Tratar a entrega como planejamento; não há migração nem funcionalidade a publicar.
4. Aguardar as regras do usuário e o desenho aprovado antes de integrar código de produto. Não presumir histórico automaticamente compartilhado entre chats.

## Resumo copiável

Conhecimento e POPs: Doc's SIE mantida como referência principal e os 31 complementares incluídos na proposta por decisão do usuário. Acervo proposto organizado por setor em 557 conteúdos únicos (526 da referência + 31), com 962 origens preservadas em catálogo local. Distribuição: Pedagógico 318, Administrativo 39, Financeiro 40, RH 45, Operacional 29, TI 30 e Institucional 56. Sem alteração do NAS, importação, código, dependências ou migrações. Proposta em docs/modulos/conhecimento-pops/ORGANIZACAO-POR-SETOR.md. Pendem regras de acesso/publicação e desenho de implementação. Branch codex/conhecimento-pops; acrescentar o SHA completo informado na resposta final.
