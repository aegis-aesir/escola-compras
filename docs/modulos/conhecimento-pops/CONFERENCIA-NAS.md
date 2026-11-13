# Conferência dos arquivos existentes no NAS

Data: 13/11/2026. Escopo autorizado pelo usuário: conferir arquivos e organização da pasta Consultoria no NAS, sem alterar os originais.

## Método e limites

- Enumeração em modo de leitura com `Test-Path`, `Get-ChildItem` e `Get-Item`; comparação amostral com `Get-FileHash -Algorithm SHA256`.
- Excluídos da contagem de arquivos: `.DS_Store`, `Thumbs.db` e nomes iniciados por `~$` (arquivos temporários do Office).
- Nenhum original alterado, renomeado, movido ou excluído; nenhum documento copiado para o repositório ou importado no sistema. Nenhum conteúdo enviado a serviços externos.
- Inventário baseado em nomes, pastas, extensões e tamanhos. O texto e a diagramação dos documentos não foram analisados; não há validação de aprovação, vigência ou completude dos POPs.
- Contagem observada durante a leitura, sem snapshot transacional do NAS; não representa quantidade de POPs únicos. Este relatório conserva apenas dados agregados e nomes de pastas organizacionais.

## Resultado da enumeração

Foram encontradas 16 pastas diretamente na raiz, 200 pastas no total recursivo e 1.719 arquivos após os filtros, sem erros de leitura reportados.

| Formato | Arquivos |
| --- | ---: |
| DOCX | 604 |
| PDF | 551 |
| PNG | 221 |
| XLSX | 152 |
| JPEG | 111 |
| PPTX | 71 |
| MP4 | 4 |
| XLS | 2 |
| RAR | 1 |
| XLSB | 1 |
| ZIP | 1 |

## Organização observada

- `Fluxos e POP's - ADM`: 169 arquivos, sendo 161 PDFs nas pastas de POPs e oito arquivos de fluxogramas em PDF/PPTX. Distribuição dos PDFs nas pastas de POPs: ADM 34, Financeiro 35, T.I 26, Operacional 26 e RH 40. A classificação reflete o nome da pasta, não uma auditoria do conteúdo de cada PDF.
- `Doc's SIE`: 528 arquivos, incluindo a estrutura `ADM - Fluxos e POP's`, fluxos pedagógicos, políticas internas, matrizes, ferramentas e outros documentos. Não presumir que toda essa pasta deva entrar na biblioteca de POPs.
- `P.O.P.s`: 286 arquivos, com subdivisões pedagógicas como AEE, convivência, normatização e provas adaptadas. Contém materiais de apoio e formatos variados; o nome da pasta não comprova que todos os arquivos são procedimentos.
- Há outras pastas setoriais com fluxos/POPs, inclusive coordenações, educação especial, educação infantil e pedagogia geral. A raiz também reúne evidências e registros operacionais; o escopo de eventual importação deve ser selecionado.

## Cópias e tamanhos

- Os três primeiros PDFs por nome da pasta de POPs ADM em `Fluxos e POP's - ADM` possuem correspondentes em `Doc's SIE/ADM - Fluxos e POP's` com mesmo tamanho e mesmo SHA-256: três pares idênticos confirmados.
- Essa amostra não comprova igualdade de todos os arquivos das duas árvores e não determina qual localização é a fonte oficial. Nomes repetidos em outras pastas podem representar cópias, modelos ou revisões diferentes.
- Acima do limite atual de 5 MiB dos anexos de compras: oito arquivos na árvore `Fluxos e POP's - ADM`, 39 em `Doc's SIE` e dois em `P.O.P.s`. Os números são por localização e não foram deduplicados. Há exemplos de fluxogramas em PDF e apresentações PPTX que excedem esse limite.

## Consequências para a proposta

1. Partir dos documentos prontos: catalogação, organização, busca e acesso são prioridades propostas. Não presumir que todos precisem ser convertidos em páginas editáveis.
2. Prever arquivo original preservado e eventual versão de leitura vinculados ao mesmo documento; DOCX/PDF com nomes semelhantes não são automaticamente duplicatas ou versões equivalentes.
3. Antes de importar, definir como tratar cópias e versões, usando `Doc's SIE` como referência principal conforme a decisão posterior do usuário. Importação deve ter prévia revisável, vínculo da origem e controle de duplicidade; nenhuma importação foi autorizada/executada nesta etapa.
4. Não herdar o limite de 5 MiB de compras sem avaliar o acervo selecionado. Dimensionar o limite e a entrega privada dos arquivos no desenho técnico, sem alterar o módulo de compras.
5. Busca por conteúdo de arquivos existentes exige extração e, em alguns casos, OCR; isso é um escopo diferente da busca apenas por título/categoria das páginas novas. Não prometer busca textual dos PDFs com base nesta conferência de metadados.
6. As regras de leitura, edição, publicação/aprovação e revisão de POPs continuam pendentes; documentos prontos não comprovam autorização para publicação ou acesso geral.

Atualização após a resposta do usuário: `Doc's SIE` foi definida como referência principal. A comparação completa por hash com as demais pastas está documentada em `COMPARACAO-ACERVO.md`, nesta pasta. A decisão substitui a pendência de escolher a fonte principal; seleção para importação e regras de publicação continuam abertas.

Atualização seguinte: o usuário incluiu os 31 complementares na proposta. A organização por setor está em `ORGANIZACAO-POR-SETOR.md`; não houve alteração no NAS, importação ou publicação.
