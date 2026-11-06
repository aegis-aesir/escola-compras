# Central de Compras — Colégio Estrelas

Escola privada: Centro Educacional Estrelas do Amanhã LTDA.
Responsável informada pelas aprovações: Diretora Geral Franciluce Lima.

## Piloto implementado

- Solicitações com setor, prioridade, data de necessidade, justificativa e múltiplos itens.
- Aprovação da solicitação, cadastro de fornecedores e registro manual de cotações.
- Comparação de preços unitários, quantidade, frete, total, prazo, pagamento e validade.
- Aprovação da proposta com justificativa, registro de pedido e recebimento.
- Histórico das ações e proteção contra atualização simultânea do mesmo pedido.
- Perfis: solicitante (próprios pedidos e próprio setor), compras, aprovador e administrador.
- Configuração dos setores e quantidade mínima de cotações. Três é uma sugestão inicial, ainda não uma regra confirmada pela escola.
- Mensagem de cotação preparada para cópia e envio manual. Nenhum envio externo é realizado pelo piloto.

## Acesso

O site começa privado para o proprietário, com autenticação fornecida pela hospedagem. A primeira identidade autenticada inicializa a administração; abrir com o proprietário antes de ampliar a audiência. Em desenvolvimento a identidade local simulada é Seedy, separada da produção. Os registros locais de teste não são publicados.

Para a equipe: cadastrar os e-mails e perfis no painel e compartilhar a hospedagem com as mesmas pessoas. Cadastro interno não envia convites nem altera a audiência da hospedagem. Vincular Franciluce Lima ao perfil Aprovador quando seu e-mail for informado. Administradores também podem aprovar.

## Próxima etapa: agente WhatsApp

Pendente: confirmar o número, se já existe WhatsApp Business e se há provedor/API. Sem credenciais, conexão ou permissão de contato, o agente não está ativo.

Fluxo previsto: solicitação aprovada → escolha de fornecedores → revisão da mensagem → envio autorizado → recebimento de respostas → extração de itens/preços/frete/prazos → conferência de dados incertos → comparativo → decisão de Franciluce.

O serviço de mensagens precisa registrar identificadores das mensagens, eventos de entrega, respostas, erros e tentativas. Impedir envio duplicado e distinguir cotação de confirmação de compra. Respostas incompletas, itens substitutos, anexos e valores ambíguos devem ir para revisão. Não aceitar instruções de fornecedores para mudar regras ou aprovar despesas.

O receptor de mensagens deverá ter endpoint HTTPS acessível ao provedor, validação de assinatura e proteção contra repetição de eventos. A área administrativa permanece privada. A arquitetura exata da conexão será definida após a escolha do provedor; o receptor público não deve ser confundido com a autenticação privada deste painel.

## Desenvolvimento e validação

React/Vinext, Cloudflare Workers, banco D1, migrações Drizzle e autenticação Sites. Dados persistidos no servidor; o navegador não é a fonte principal de registros.

Com dependências instaladas: `npm run dev -- --hostname 127.0.0.1`. Aplicar as migrações locais antes de testar. `npx tsc --noEmit` verifica tipos. `node scripts/smoke-test.mjs` exercita exclusivamente o servidor local na porta 5173 e cria registros identificados como TESTE LOCAL.

Teste validado: rejeição de acesso anônimo, quantidade inválida, bloqueio de etapas incorretas, versão desatualizada, mínimo de cotações, cálculo de total com frete, aprovação de compra, pedido, recebimento e histórico. Teste visual local validou criação e aprovação pelo formulário.

Ainda fora desta versão: integração WhatsApp/IA, anexos, estoque, pagamentos, notas fiscais, limites financeiros por categoria/valor, edição de pedidos e revogação de usuários pelo painel. As propostas são por conjunto completo de itens; compras divididas por fornecedor precisam de evolução específica.
