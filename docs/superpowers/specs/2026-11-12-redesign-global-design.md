# Redesign global da Central de Compras

## Intenção

Modernizar toda a interface autenticada da Central de Compras tomando as telas de referência como direção visual: navegação azul compacta, conteúdo amplo, hierarquia clara, formulários densos porém legíveis e identificação rápida das funções. A mudança deve tornar o sistema mais atraente, limpo e fácil de reconhecer sem alterar regras, permissões, dados ou integrações.

## Objetivos

- Aplicar uma linguagem visual única à visão geral, listas, formulários, detalhes, configurações, usuários, orçamento, integrações e janelas.
- Adotar uma barra lateral compacta com ícones, expansível para revelar os nomes das áreas.
- Criar cabeçalho de contexto com saudação, tela atual, identidade do Colégio Estrelas e ações de aparência, senha e saída.
- Melhorar contraste, espaçamento, estados ativos, tabelas, cartões, campos e ações principais.
- Preservar os temas claro/escuro e todas as cores de destaque existentes.
- Manter a experiência responsiva em desktop, tablet e celular.

## Não objetivos

- Não alterar o fluxo de compras, aprovações, estimativas, cotações ou arquivamento.
- Não modificar banco, credenciais, perfis, integrações OpenClaw ou hospedagem.
- Não reproduzir funções do sistema acadêmico mostrado nas referências que não pertençam à Central de Compras.
- Não trocar textos de negócio por termos genéricos nem esconder informações necessárias ao processo.

## Restrições

- Reaproveitar os componentes React existentes e suas ações para reduzir risco funcional.
- Preservar acessibilidade por teclado, rótulos, foco visível e áreas de toque adequadas.
- O menu compacto precisa continuar utilizável sem depender de tooltip; a expansão revela todos os nomes.
- A interface deve continuar legível com qualquer cor de destaque configurada.
- Nenhuma mensagem real deve ser enviada a fornecedores durante a validação.

## Abordagens consideradas

### 1. Modernização global sobre a estrutura existente — escolhida

Reorganizar o shell do painel e substituir os estilos globais, adicionando apenas o estado de expansão da navegação. Todos os componentes e comportamentos continuam sendo os atuais. É a opção com melhor equilíbrio entre consistência visual e preservação do sistema validado.

### 2. Reescrever todas as telas com novos componentes

Permitiria maior liberdade visual, mas duplicaria lógica e aumentaria o risco de regressões em formulários, permissões e históricos. Não é adequada ao requisito de preservar o sistema.

### 3. Criar um segundo tema visual opcional

Reduziria o impacto inicial, mas manteria duas interfaces para testar e dar suporte. Também deixaria a identificação das telas inconsistente entre usuários. Não foi escolhida.

## Estrutura visual proposta

### Navegação

- Barra lateral fixa e estreita na cor de destaque, com logomarca no topo e ícones das áreas.
- Usar a marca oficial `public/estrela-2026.png`, preservando seu fundo branco em um suporte próprio para manter fidelidade em temas claro e escuro.
- Botão para expandir ou recolher a navegação; expandida, mostra os nomes e contadores.
- Configurações, usuário e saída continuam facilmente acessíveis.
- Em celular, a navegação vira painel sobreposto, sem reduzir a área útil permanentemente.

### Cabeçalho e contexto

- Cabeçalho claro com saudação ao usuário, data local de Manaus e nome da tela atual.
- Ações de Aparência, alterar senha e sair permanecem visíveis e identificáveis.
- A área principal usa largura ampla, fundo suave e seções brancas bem delimitadas.

### Componentes

- Cartões com borda leve, raio consistente e sombra discreta.
- Tabelas mais compactas, cabeçalho destacado e linhas com estados fáceis de distinguir.
- Formulários com rótulos mais fortes, campos maiores e agrupamentos visuais claros.
- Botões principais em destaque; ações secundárias e perigosas com identidade própria.
- Janelas com cabeçalho fixo, corpo arejado e rodapé de ações consistente.
- Estados vazios, avisos, badges e métricas alinhados ao novo sistema visual.

### Responsividade

- Desktop prioriza visão ampla e densidade controlada.
- Tablet reduz colunas e permite menu sobreposto.
- Celular empilha campos e ações, mantém cabeçalhos enxutos e usa largura total para botões importantes.

## Preservação funcional

O trabalho altera apresentação e navegação visual. Eventos, payloads, endpoints, filtros, validações, permissões e registros permanecem inalterados. A lista de usuários, rascunhos, histórico, anexos, arquivamento, estimativas e aprovações continuam usando as mesmas fontes e regras.

## Verificação

- TypeScript sem erros e build de produção concluído.
- Testes existentes de autenticação e fluxo de compras.
- Verificação visual em tema claro e escuro, com navegação expandida/recolhida.
- Verificação em desktop e celular das telas principais, formulários, tabelas e janelas.
- Confirmação de que nenhum teste enviou mensagens reais.

