# CEEA Manager — próximos módulos

Direção registrada em 13/11/2026. Desenvolver e planejar em **chats separados**, reutilizando este projeto, hospedagem, dados e autenticação.

1. **Estoque:** gestão de estoque integrada às necessidades e compras. Requisitos e fluxos serão definidos no chat próprio.
2. **Conhecimento da empresa:** biblioteca de documentos, POPs e procedimentos, com organização e navegação inspiradas no Notion. Não pressupõe usar a API do Notion.
3. **Tarefas e responsabilidades:** acompanhamento inspirado no ClickUp/Asana. Papéis, atribuições, prazos e fluxos serão definidos no chat próprio. Não pressupõe conexão com serviços externos.
4. **Integração com Escolar Manager:** planejar dados a trocar, direção e frequência de sincronização, interfaces oficialmente disponíveis, permissões e rastreabilidade. Verificar a documentação e a configuração realmente oferecidas pelo fornecedor antes de propor implementação; não presumir existência de API ou acesso direto ao banco.

O usuário pediu separar os trabalhos em chats; não iniciar esses módulos junto à correção de exclusão ou ao ajuste do nome. Este registro não cria chats automaticamente nem autoriza transmitir dados a serviços externos. Preservar as regras atuais do processo orçamentário e evoluir o CEEA Manager a partir do código existente.


## Desenvolvimento paralelo — 13/11/2026

Compras permanece o módulo existente, agora com quinta worktree exclusiva (`compras`, `codex/compras`, 5185) para continuidade e correções. Não é um módulo a recriar; este coordenador mantém integração/publicação. Ler COORDENACAO.md.

O usuário autorizou worktrees separadas para os quatro módulos e definiu este chat como coordenador de integração e publicação. Ler **COORDENACAO.md** para caminhos, branches, portas, regras e entrega. Módulos enviam apenas suas branches; somente o coordenador mescla main e publica. Dados locais e chaves fictícias são independentes por worktree; não compartilhar credenciais/estado de produção. Os chats devem ser abertos nas pastas preparadas e não foram criados automaticamente.
