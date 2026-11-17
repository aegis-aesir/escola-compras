# WhatsApp selecionado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Importar somente mensagens selecionadas e confirmar propostas editáveis com rastreabilidade.
**Architecture:** Protocolo compartilhado de seleção; extração e associação puras; integração D1 transacional; inbox agrupada.
**Tech Stack:** Node, TypeScript, React, Zod e D1 existentes.
**Spec:** docs/superpowers/specs/2026-11-17-inbox-opt-in-design.md

## Global Constraints

- Somente fixtures; sem runtime/segredos/publicação/envios reais.
- Preservar dados, permissões, número operacional e histórico.
- pesquisa-web para pesquisas; operacional para WhatsApp.

## Review Focus

- Backlog antigo não pode passar por seleção implícita.
- Receipt de outro telefone/conflitos nunca vinculam automaticamente.
- Campo ausente não vira zero/preço presumido.
- Versões concorrentes não podem duplicar confirmação.
- Histórico legado permanece acessível fora da fila padrão.

### Task 1: Opt-in
- [x] Escrever e observar falhas dos testes de hook/runner/protocolo.
- [x] Implementar CLI e validação antes de persistir/importar; manter legado.
- [x] Rodar testes de protocolo e transporte simulado.

### Task 2: Associação e proposta
- [x] Escrever e observar falhas de associação/extração/confirmação.
- [x] Implementar extração conservadora, versões e transação com transition quote.
- [x] Rodar testes D1 isolados, permissões, atualização e duplicidade.

### Task 3: UI e entrega
- [x] Implementar caixa compacta e formulário preliminar editável.
- [x] Trocar roteamento por pesquisa-web e ajustar regressões.
- [x] Rodar tipos, regressões e build; revisão leitura; documentar instalação e commitar.

Decisões de execução: gateway permaneceu parado; hook independente facilita instalação offline. UI oferece colar mensagem sem ID técnico, CLI mantém receipt/correlation quando conhecidos. Extração de binários fica limitada ao texto explicitamente indicado (sem OCR), com original privado preservado. Revisão de leitura encontrou e corrigiu quantidade confundida com prazo de pagamento, frete condicional, referências conflitantes e normalização de telefone; testes cobrem os casos. QA visual coordenador confirmou a revisão48 e a ajuda recolhida.
