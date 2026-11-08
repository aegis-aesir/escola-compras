# Busca de fornecedores por categoria

Escopo autorizado: pesquisar o banco interno antes da internet; preferir
Google Maps para fornecedores de Manaus. Preservar aprovação, prazo nacional,
hospedagem, registros e envio desativado.

Decisões: categoria explícita por item, usando as mesmas sugestões do cadastro
de fornecedores. Comparação sem diferença de acento, caixa ou espaço, sem
supor equivalência entre categorias diferentes. Pedidos antigos podem ter as
categorias preenchidas pela administração. Um pedido pode ter várias categorias.

Depois da aprovação, consultar fornecedores locais para cada categoria. Só
enfileirar busca externa para categorias sem cadastro compatível. Reconsultar
o cadastro antes de executar uma tarefa. Repetir a regra para fornecedores
nacionais apenas quando a etapa nacional for liberada. Busca Maps via pesquisa
web do OpenClaw, com retorno a sites locais quando não houver links Maps; não
afirmar acesso direto à API Places ou dados de contato verificados.

Resultados são fontes para revisão, com data. Cadastro por fonte exige confirmação
do nome, telefone, localização e categoria; guardar a origem. Não enviar mensagens
ou converter automaticamente resultado de busca em proposta comercial.

- [x] Testar seleção interna, categorias ausentes, escopo, deduplicação e corrida com novo cadastro.
- [x] Implementar categorias, descoberta, cadastro a partir de fonte e interfaces.
- [x] Testar preferência Maps e fallback web no runner sem envio.
- [x] Revisão independente e validação; preparar atualização da ponte e publicação Sites.

Revisão: corrigidos cadastro concorrente com sucesso indevido e tarefas nacionais
antigas sem categoria. Testes reproduziram as falhas antes das correções. Teste
real mostrou páginas genéricas do Maps; foram excluídas da identificação de
empresas. Novo teste real retornou fontes locais pelo fallback web, sem mensagens
e sem inserir fornecedores fictícios no banco de produção. Sem navegador conectado
nesta sessão, a revisão da interface ficou limitada ao código, tipos e build.
