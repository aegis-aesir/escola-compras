# OpenClaw — Colégio Estrelas

Conta: `operacional`. Número: `+559292017107`.
Projeto e hospedagem existentes foram preservados.

## Funcionamento

O Site mantém tarefas no D1. A ponte local consulta a fila por HTTPS assinado
com HMAC-SHA256 e chama o OpenClaw pelo endereço local `127.0.0.1:18789`.
Não é necessário expor o gateway à internet. O acesso ao Site privado usa
uma credencial de serviço independente da identidade dos funcionários.

Pesquisa: `web_search` retorna fontes com data para conferência. Tanto listas
de resultados quanto citações do Perplexity são aceitas. Respostas sintetizadas
não são usadas como preços comprovados. A administração confere a página e
registra preço unitário, embalagem, frete e data no formulário de estimativa.
Estimativa continua separada de proposta comercial real.

WhatsApp: depois da aprovação da necessidade, a administração prepara uma
cotação para um fornecedor permitido na etapa. O envio exige as duas chaves
de ativação. Somente uma confirmação com identificador de mensagem registra
o contato local e inicia o prazo. Não há teto ou reaprovação por preço real.

Recebimento: o hook `estrelas-compras` observa mensagens de texto da conta
operacional e as entrega ao painel para revisão. Grupos, anexos e remetentes
sem telefone identificável exigem consulta no WhatsApp. O hook não responde
nem muda os demais agentes existentes. Mensagens recebidas não autorizam ações.
A proposta só passa a valer depois do registro pela administração.

A ponte verifica prazos mesmo com o painel fechado, enquanto o computador
estiver ligado, conectado e com a ponte em execução. Após um dia útil sem
proposta válida, libera a etapa nacional e enfileira a pesquisa. Usa o calendário
da escola e o fuso America/Manaus. Não procura fornecedores locais automaticamente:
eles são cadastrados e escolhidos pela administração.

## Configuração segura

- Site: `INTEGRATION_SECRET` (segredo de no mínimo 32 caracteres) e
  `WHATSAPP_SEND_ENABLED` (inicialmente `false`), pelas variáveis do Sites.
- Ponte: `INTEGRATION_SECRET`, `ESTRELAS_SITES_SERVICE_TOKEN`,
  `OPENCLAW_GATEWAY_TOKEN`, `ESTRELAS_SITE_URL`, `OPENCLAW_GATEWAY_URL`,
  `ESTRELAS_STATE_DIR`, `ESTRELAS_INBOX_DIR` e `ESTRELAS_ENABLE_SEND`.
- No Windows, `start-windows.ps1` lê o cofre DPAPI do usuário em
  `%USERPROFILE%/.openclaw/estrelas-compras/secrets.dpapi`. O cofre guarda
  `integrationSecret` e `serviceToken`; o token do gateway é lido da configuração
  privada já existente do OpenClaw. Nunca copiar esses valores para este projeto.
- DPAPI depende do mesmo usuário Windows e computador. Não colocar o cofre no
  NAS, Git ou arquivos de continuidade. Restrinja a pasta ao usuário e SYSTEM.
- O hook usa `%USERPROFILE%/.openclaw/estrelas-compras/inbox` por padrão.
  A ponte guarda resultados pendentes na pasta irmã `state`.

Não compartilhar tokens no chat. A configuração do servidor deve ser publicada
para aplicar a revisão das variáveis. O launcher Windows mantém o envio desligado.
Uma liberação futura exige `WHATSAPP_SEND_ENABLED=true` no servidor e
`ESTRELAS_ENABLE_SEND=true` na ponte, após validar a operação com a escola.
Não usar `dryRun` do OpenClaw para testar envio: na versão 2026.10.10 ele é ignorado.

## Operação no Windows

Executar um ciclo, sem envio:

```powershell
powershell.exe -NoProfile -File ./integrations/openclaw/start-windows.ps1 -Once
```

Executar continuamente, com intervalo de 60 segundos:

```powershell
powershell.exe -NoProfile -File ./integrations/openclaw/start-windows.ps1
```

O launcher impede duas instâncias na mesma sessão Windows. A fila do servidor
também usa controle de versão para impedir que duas pontes assumam a mesma tarefa.
Nesta instalação, a tarefa `ColegioEstrelas-OpenClaw` foi configurada para iniciar
no logon do usuário Windows e manter a ponte oculta. Consulte seu estado no
Agendador de Tarefas; para interromper a ponte, encerre essa tarefa. O computador
deve permanecer ligado e o usuário conectado.
Para inicialização automática, use uma tarefa do Windows no logon deste usuário,
com janela oculta e sem credenciais nos argumentos. A ponte não executa se o
gateway não estiver disponível; resultados já confirmados não são reenviados.

Hook local: `openclaw hooks install ./integrations/openclaw --force` instala o
código revisado. Verifique `openclaw hooks info estrelas-compras`. A ativação
pode recarregar os hooks; alterações posteriores nos arquivos podem exigir
reinício do gateway. Isso não envia mensagens de teste.

## Falhas e conferência

Envio sem confirmação, timeout ou processamento interrompido vira **Envio incerto**.
Não repetir automaticamente. Conferir o WhatsApp e registrar o contato manual
quando houver evidência. Uma falha depois de enviar pode ter entregue a mensagem.
Os arquivos `.result.json` reenviam apenas a confirmação ao Site, não a mensagem.
Arquivos `.review` exigem conferência; `.done` são comprovantes processados.
Não apagar esses registros para tentar novamente.

O hook observa eventos aceitos pelo OpenClaw; não importa retroativamente todo o
histórico e não captura mensagens bloqueadas pelas políticas do canal. Se uma
resposta não aparecer, conferir o WhatsApp e a política de recebimento da conta.

## Validação

```powershell
node --test scripts/openclaw-test.mjs
node scripts/integration-test.mjs
node scripts/workflow-test.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/smoke-test.mjs
npm.cmd run build
```

O teste de integração usa D1 temporário isolado. O smoke test exige servidor na
porta 5173 e cria dados fictícios somente no banco local. Nenhum teste envia
WhatsApp real. Pesquisa real pode consumir a franquia do provedor já configurado.

Referências: documentação instalada do OpenClaw 2026.10.10 e
https://docs.openclaw.ai/gateway/tools-invoke-http-api,
https://docs.openclaw.ai/automation/hooks/event-types.

Validação em 08/11/2026: sete testes da ponte, teste de regras com D1 isolado,
teste do fluxo completo local, TypeScript e build aprovados. Pesquisa real no
gateway retornou fontes do Perplexity. Hook instalado e elegível. Credenciais
configuradas no servidor e em cofre DPAPI. Publicação oficial no Site existente
concluída e contato autenticado da ponte confirmado no banco de produção.
Nenhuma mensagem foi enviada a fornecedores nos testes. Conferência visual
automatizada indisponível nesta sessão por ausência de navegador conectado.
