---
name: estrelas-compras
description: "Guarda mensagens da conta operacional para conferência na Central de Compras. Não responde aos fornecedores."
metadata:
  { "openclaw": { "events": ["message:received"] } }
---

Este hook só registra texto recebido na conta operacional confirmada pela escola.
O runner entrega os registros ao Site com assinatura e idempotência. Instalar apenas
após configurar uma pasta privada e o acesso de serviço, conforme INTEGRACOES.md.
Não altera respostas automáticas de outros agentes já configurados no OpenClaw.
Anexos, grupos e identificadores sem telefone exigem conferência no WhatsApp.

Pasta padrão: `~/.openclaw/estrelas-compras/inbox`. Pode ser substituída por
`ESTRELAS_INBOX_DIR` no ambiente do processo do gateway.
