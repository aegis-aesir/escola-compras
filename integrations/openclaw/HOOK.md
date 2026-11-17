---
name: estrelas-compras
description: "Hook sem captura. Mensagens são importadas somente por indicação explícita na CLI ou no painel."
metadata:
  { "openclaw": { "events": ["message:received"] } }
---

O handler deliberadamente não grava, registra em log ou encaminha eventos recebidos.
Metadados/textos de fornecedores nunca concedem autorização de importação.
Instalar somente handler.js é suficiente: ele não tem imports nem dependências.
Não iniciar/reiniciar gateway nem reativar tarefas para instalar esta proteção.

O operador indica cada mensagem pela CLI select-message.mjs ou pela caixa do painel.
O runner só entrega JSON com protocolo selected-message-v1 e seleção explícita.
Backlog antigo permanece intocado e não é importado. Nunca marcar toda a pasta,
um contato ou conversa como autorizados. Documentação: docs/modulos/compras/WHATSAPP-SELECIONADO.md.
