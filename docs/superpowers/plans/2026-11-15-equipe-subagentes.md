# Configurar equipe de subagentes — plano aprovado

Objetivo: manter este chat como coordenador, cadastrar oito perfis e reutilizar as cinco worktrees sem alterar o aplicativo, produção ou trabalhos dos módulos. A divisão foi proposta e aprovada pelo usuário nesta conversa; implementação segue config/codex/EQUIPE.md.

- [x] Conferir status/branches, instruções, portas e formato nativo documentado.
- [x] Versionar perfis e instalador idempotente com proteção de arquivos existentes.
- [x] Instalar configuração local do projeto e instruções de delegação nas worktrees.
- [x] Validar formato nativo, instalação repetida e preservação dos cinco checkouts.
- [x] Revisar a entrega, preparar registro no Git e informar o uso ao usuário na conclusão.

Preservar os chats históricos. Não iniciar oito tarefas, corrigir o monitor OpenClaw, enviar mensagens, copiar segredos ou integrar branches de módulos como efeito desta configuração.

Validação: oito perfis em cada um dos dois diretórios locais; limite 3; check de instalação e reinstalação com changedFiles=0; Codex CLI 0.169.0-alpha.11.1 aceitou a configuração nos dois diretórios (`features list`, saída 0); module-workspace-test aprovou as cinco portas/branches e proteções. Validação independente conferiu perfis, ausência de overrides de modelo/permissões/MCP e manifestos. As cinco branches/SHA/status rastreados foram preservados. Temporários exclusivos e rejeição de caminhos externos/junctions normais e quebradas foram verificados em fixture local após o achado da revisão. Não foi feito teste de execução nativa de cada perfil em sessão nova; este coordenador já exercitou a delegação de validação com leitura explícita do perfil instalado.
