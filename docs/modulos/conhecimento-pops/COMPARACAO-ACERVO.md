# Comparação do acervo com a referência principal

Data: 13/11/2026. Decisão do usuário: usar `Doc's SIE` como referência principal e comparar com as demais pastas, sem alterar os originais.

## Resultado

Todos os 1.719 arquivos considerados na enumeração foram lidos para cálculo de SHA-256: 528 em `Doc's SIE` e 1.191 nas demais pastas. Foram processados 3.268.521.454 bytes, sem falhas de enumeração ou leitura.

| Classificação dos arquivos fora da referência | Quantidade |
| --- | ---: |
| Bytes idênticos a pelo menos um arquivo de Doc's SIE | 403 |
| Mesmo nome normalizado, mas bytes diferentes | 14 |
| Sem correspondência pelos critérios aplicados | 774 |
| Total comparado fora da referência | 1.191 |

As categorias são exclusivas. O total inclui registros operacionais, ferramentas, apresentações e outros materiais, além de POPs. Os 774 sem par não equivalem a 774 procedimentos novos.

## Distribuição por pasta

| Pasta | Idênticos à referência | Nome igual e bytes diferentes | Sem par identificado |
| --- | ---: | ---: | ---: |
| Coordenacao Bilingue | 25 | 2 | 11 |
| Coordenacao Orientacao | 14 | 0 | 79 |
| Coordenacao Trainee | 50 | 0 | 30 |
| Diretoria Administrativa | 0 | 0 | 0 |
| Educacao Especial | 20 | 0 | 220 |
| Educacao Infantil Maternal Jardim | 57 | 1 | 43 |
| Financeiro | 1 | 1 | 31 |
| Fluxos e POP's - ADM | 169 | 0 | 0 |
| Ger. Adm | 0 | 2 | 4 |
| Operacional | 0 | 0 | 4 |
| P.O.P.s | 26 | 0 | 260 |
| Pedagogia Geral | 41 | 2 | 67 |
| RH | 0 | 2 | 9 |
| Servicos Gerais | 0 | 2 | 3 |
| T.I | 0 | 2 | 13 |
| Total | 403 | 14 | 774 |

## Duplicados confirmados

- Todos os 169 arquivos de `Fluxos e POP's - ADM` têm cópia de bytes idênticos na referência. Para o catálogo proposto, a pasta pode ser tratada como origem adicional desses mesmos arquivos, sem necessidade de cadastrar outra cópia de conteúdo. Nada foi removido ou importado.
- Entre as 403 cópias fora da referência, seis têm nome diferente de todos os correspondentes na referência. Comparação apenas por nome não encontraria essas seis cópias.
- Dentro de `Doc's SIE`, há 526 hashes únicos para 528 arquivos. Um grupo contém três cópias idênticas da matriz mestra de processos pedagógicos, duas em Matrizes Mestra e uma na área de bússolas pedagógicas. São duas cópias redundantes além da primeira, sem indicação de exclusão.

## Arquivos diferentes que não devem ser substituídos automaticamente

Os 14 arquivos com mesmo nome normalizado e bytes diferentes são planilhas XLSX: oito ocorrências de `PAINEL DE GERENCIAMENTO - BSC` e seis de `BDG -BÚSSOLA DE DIAGNÓSTICO GERENCIAL_CEEA`. Estão distribuídas nas áreas indicadas na tabela. Não foi encontrado POP com divergência binária sob o mesmo nome normalizado nesta classificação.

Essas planilhas podem conter preenchimentos ou adaptações por setor. A diferença binária está comprovada; não foi feita comparação de células, fórmulas ou aprovação para determinar se são novas revisões, modelos distintos ou registros preenchidos.

Há também uma divergência dentro da própria referência: o BDG de mesmo nome em `Ferramentas Gerenciais` e em `PEDAGÓGICOS - BDG - BÚSSOLAS DE DIAGNÓSTICOS GERENCIAIS` tem hashes diferentes. A escolha da pasta principal não resolve qual variante se aplica a cada área. Preservar as duas até a definição de uso.

## POPs fora da referência que merecem revisão de inclusão

Entre os 774 sem correspondência identificada, 31 arquivos contêm POP no nome:

- 26 DOCX da série `POP_PED_DOC_01` a `POP_PED_DOC_26`, na pasta de POPs e fluxos docentes de Pedagogia Geral.
- Um DOCX sobre convivência escolar e disciplina em Coordenacao Orientacao.
- Quatro arquivos em `P.O.P.s`: relatório pedagógico AEE para demandas externas, boa convivência e aprendizagem, formação (PPTX) e avaliações adaptadas (DOCX).

Esses 31 arquivos não têm igualdade de bytes ou correspondência pelos critérios de nome/código usados. Isso não prova ausência de procedimento equivalente com outro título, nem comprova que estejam aprovados. Devem ser revisados como possíveis complementos da biblioteca, mantendo `Doc's SIE` como referência principal. Nenhuma inclusão automática foi feita.

## Critérios, rastreabilidade e limites

- Duplicidade exata: SHA-256 dos bytes completos, independentemente do nome. Após falhar esse critério, comparar nome normalizado (caixa, acentos, espaços e pontuação), nome-base em outro formato e código simples de POP. As duas últimas regras não acrescentaram pares nesta execução; códigos compostos e títulos reformulados não têm equivalência garantida.
- Arquivos temporários Office (`~$`), `.DS_Store` e `Thumbs.db` foram excluídos. Não houve links simbólicos pulados ou erros de leitura.
- Todos os pares de bytes idênticos foram reconciliados com os hashes do inventário. Conferida a partição dos 1.191 arquivos e a soma das categorias; nenhum hash dos outros 788 arquivos aparece na referência.
- Uma releitura dos metadados dos 1.719 arquivos não detectou mudança de tamanho/data após o cálculo de hashes. Uma nova enumeração não detectou arquivos adicionados/removidos. Não há snapshot transacional do NAS.
- Recalcularam-se com PowerShell `Get-FileHash -Algorithm SHA256` três pares escolhidos das categorias idêntico, diferente e idêntico com outro nome: todos conferiram com o inventário Python, com igualdade/desigualdade esperada.
- Data de modificação não foi usada como número de revisão ou evidência de vigência. Conteúdo textual, layout, células e equivalência semântica entre títulos não foram revisados.
- O relatório completo de correspondências, hashes e caminhos ficou somente local, na pasta ignorada `.ceea-workspace/nas-comparacao/20261113T181338Z/`, incluindo `COMPARACAO-DETALHADA.md`, `detalhes.json`, `resumo.json` e `verificacao.json`. Não acompanha o push ao GitHub; a entrega versionada contém apenas o resumo organizacional.
- Scripts locais usados: `.ceea-workspace/compare_nas_readonly.py` para enumeração/hashes e `.ceea-workspace/report_nas_comparison.py` para reconciliação e relatório. Usam leitura dos originais e escrita somente nos resultados locais desta worktree. Os scripts e resultados detalhados são ignorados pelo Git.

Nenhum original foi alterado, renomeado, movido, excluído ou copiado para o repositório. Nenhum texto/célula foi extraído ou enviado a serviço externo. Não houve implementação, importação, migração ou publicação.

## Encaminhamento para o desenho do módulo

Fonte principal definida: `Doc's SIE`. Propor uma única entrada documental por conteúdo exato, preservando os caminhos de origem como referência; arquivos divergentes permanecem separados. Antes de incluir os 31 possíveis POPs complementares ou consolidar as variantes BSC/BDG, revisar sua finalidade e aprovação. A seleção de documentos para importação e as regras de acesso/publicação ainda dependem do usuário.
