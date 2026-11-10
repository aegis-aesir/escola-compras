# Usuários locais — Colégio Estrelas

O sistema usa login e senha próprios. A hospedagem Sites e o D1 existentes foram preservados. A entrada precisa estar acessível sem login ChatGPT; os dados e operações continuam protegidos por sessão e permissões no servidor.

## Perfis

| Perfil | Permissão |
| --- | --- |
| Master (`admin`) | Acesso completo; cria usuários, altera perfis/setores, desativa acessos e emite senhas temporárias. Não pode remover seu próprio acesso Master. Alterações concorrentes não podem eliminar o último Master. |
| Setor (`solicitante`) | Preenche solicitações apenas do seu setor e consulta os próprios registros. Não recebe fornecedores, propostas, estimativas internas, histórico administrativo ou dados de usuários. |
| Diretoria Geral (`geral`) | Vê a fila aguardando aprovação da necessidade, com itens, justificativa, estimativa e parecer administrativo. Pode aprovar ou recusar; não cria pedidos nem executa compras. |
| Diretoria Administrativa (`administrativo`) | Mantém as funções administrativas do fluxo existente. Não gerencia usuários. |

O nome visível Master corresponde ao código `admin`, preservando as regras de compras existentes. Franciluce Lima aprova a necessidade, sem aprovação de valor ou teto financeiro.

## Contas iniciais

- `master`: Master inicial. Pode criar outros Masters.
- `setor.teste`: Setor de teste, vinculado inicialmente a Administrativo.
- `diretoria.geral`: Franciluce Lima, perfil Diretoria Geral.

As novas senhas temporárias são aleatórias e têm 8 caracteres. Senhas já emitidas continuam válidas até a troca; elas não são truncadas nem alteradas automaticamente. Não ficam no Git nem nesta documentação. O responsável usa o mesmo usuário Windows para abrir a janela de acesso:

```powershell
powershell.exe -NoProfile -File ./integrations/local-auth/show-initial-access.ps1
```

O arquivo `%USERPROFILE%/.openclaw/estrelas-compras/local-users.dpapi` é criptografado pelo Windows para o usuário/computador que o criou. Não compartilhar esse arquivo nem movê-lo para uma pasta de rede. A janela mostra as senhas iniciais; depois da troca elas deixam de ser válidas. Senhas emitidas posteriormente pelo Master aparecem uma única vez no painel.

Não enviar senhas no chat. Não são enviados e-mails ou mensagens WhatsApp para criar esses acessos.

## Proteções e operação

- Senhas com pelo menos 8 e até 128 caracteres, preservadas exatamente como digitadas. Hash scrypt com salt aleatório por senha, N=16384, r=8, p=5. Senhas em texto não são armazenadas no D1.
- Sessões aleatórias de oito horas: apenas o hash do token fica no banco. Cookie de produção `__Host-estrelas_session`, Secure, HttpOnly, SameSite=Strict e Path=/, sem Domain. O ambiente de desenvolvimento usa um cookie diferente, aceito apenas em desenvolvimento.
- Troca obrigatória da senha temporária antes de acessar dados. Logout revoga a sessão; troca de senha, redefinição, alteração de perfil e desativação invalidam sessões anteriores.
- Limites persistentes de tentativas por login e IP; verificação de origem nas operações autenticadas; cabeçalhos ChatGPT não autenticam o usuário.
- Nenhum cadastro público. A inicialização via `/api/auth/bootstrap` exige a assinatura do operador da ponte e funciona uma única vez. O lote original é guardado no cofre DPAPI antes da transmissão para recuperação em caso de interrupção; repetir o mesmo lote é idempotente. Depois disso só um Master autenticado cria usuários.
- Contas, sessões e limites usam novos tipos em `records`, sem migração, exclusão ou reinterpretação dos pedidos antigos. O histórico anterior e `school.owner` são preservados como dados históricos; `school.owner` não concede autenticação local.
- A ponte OpenClaw continua usando HMAC. Ao tornar a entrada acessível sem ChatGPT, a assinatura própria continua obrigatória para todas as operações da ponte.

O launcher da ponte e a configuração de envio WhatsApp não são alterados por esta mudança. Não usar mensagens reais de fornecedores para testar acessos.

## Administração

Em Configurações → Pessoas e acessos, um Master cria os usuários. Cada login é único e usa de 3 a 40 letras minúsculas, números, ponto, hífen ou sublinhado. Não precisa de e-mail. Defina um usuário por pessoa para manter a identificação no histórico.

Para recuperar acesso de outro usuário, emitir senha temporária no painel. Para recuperação administrativa quando nenhum Master consegue entrar, usar manutenção autorizada com acesso ao D1 e registrar a ação; não reabrir o bootstrap nem apagar a tabela de usuários.

## Validação

- `node scripts/local-auth-test.mjs`: D1 isolado, inicialização assinada/idempotente, hashes, sessões, troca obrigatória, redefinição, concorrência, limites, origem e projeções por perfil.
- `node scripts/local-access-smoke.mjs`: sessões locais reais, bloqueio de identidade ChatGPT forjada, separação de setores e ações da Diretoria Geral.
- `node scripts/smoke-test.mjs`: fluxo de compras com login local.
- TypeScript, build e revisão no navegador dos três perfis e da tela móvel.

Os scripts de teste usam somente `127.0.0.1:5173`, usuários identificados como TESTE LOCAL e bancos temporários. Nunca usar senhas dos usuários reais em scripts de teste.

Referências consultadas: [Cloudflare node:crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/), [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) e [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
