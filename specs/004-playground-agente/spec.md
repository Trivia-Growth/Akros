# Feature Specification: Playground do agente e agente sem canal

**Story**: E13-S14 (tier pequeno; estende E13-S13)
**Feature Branch**: `feat/E13-S14-playground-agente`
**Created**: 2026-10-02
**Status**: Draft
**Input**: "Quero estressar o agente num Playground, antes de configurar o Evolution com um WhatsApp,
para validar o comportamento e ver o que preciso alimentar de base."

## User Scenarios & Testing

### User Story 1 - Salvar o agente sem conectar nenhum canal (Priority: P1)

O administrador configura o agente (chave OpenRouter, modelo, orientação e tom) sem informar
WhatsApp, Instagram nem Evolution.

**Acceptance Scenarios**:

1. **Given** o formulário de Configurações, **When** o administrador não marca "Conectar um canal
   agora" e salva, **Then** só o agente é gravado e a chave vai ao cofre, sem criar conta de canal.
2. **Given** um agente salvo sem canal, **When** o administrador marca "Conectar um canal agora" e
   salva depois, **Then** o canal passa a atender por esse mesmo agente.
3. **Given** um pedido com canal e sem agente, **When** chega ao servidor, **Then** é recusado.

### User Story 2 - Conversar com o agente no Playground (Priority: P1)

Na aba Agente IA de Comunicação, o administrador escolhe um agente (ligado ou desligado) e conversa
como se fosse um cliente.

**Acceptance Scenarios**:

1. **Given** um agente com chave e modelo, **When** o administrador envia uma mensagem, **Then** vê a
   resposta do agente com modelo, tempo e custo, e a conversa de teste cresce.
2. **Given** uma conversa em andamento, **When** envia outra mensagem, **Then** o agente recebe o
   histórico dos testes anteriores (até 20 mensagens).
3. **Given** uma mensagem que pede advogado, pagamento ou humano, **When** enviada, **Then** a resposta
   é a mensagem de encaminhamento, marcada como tal, sem chamar a IA e sem custo.
4. **Given** qualquer conversa de teste, **When** o administrador clica "Nova conversa" ou recarrega,
   **Then** nada permanece: o Playground não grava conversa, evento, recibo nem cliente.
5. **Given** uma resposta recebida, **When** o administrador abre "Instruções que o modelo recebe",
   **Then** vê o texto exato enviado como instrução (orientação e tom mais as regras fixas).

### User Story 3 - Erros que se explicam (Priority: P2)

**Acceptance Scenarios**:

1. **Given** chave inválida, sem crédito, modelo inexistente, limite ou indisponibilidade da
   OpenRouter, **When** o administrador testa, **Then** a tela diz a causa em português e devolve o
   texto ao campo para tentar de novo.
2. **Given** um agente sem chave salva, **When** testa, **Then** a tela diz para salvar a chave na
   configuração do agente.

### Edge Cases

- Mensagem vazia, acima de 2.000 caracteres, histórico acima de 20, campo desconhecido: recusados.
- Usuário que não é administrador, ou sem o cabeçalho CSRF: recusado; nada é consultado.
- Muitos testes seguidos: limitados por hora (cada teste gasta crédito de LLM).
- A resposta nunca contém a chave OpenRouter nem trecho do erro original do provedor.

## Requirements

- **FR-001**: O servidor MUST aceitar salvar o agente sem canal e MUST recusar canal sem agente.
- **FR-002**: O Playground MUST usar a mesma decisão da produção (encaminhar ou chamar a IA com as
  mesmas instruções), implementada uma vez.
- **FR-003**: O Playground MUST ser restrito a administradores, exigir CSRF, ter teto de uso e MUST NOT
  gravar nada no banco.
- **FR-004**: Pedido que exige a equipe MUST NOT chamar a IA.
- **FR-005**: Erros da OpenRouter MUST virar mensagem útil ao administrador sem expor chave, corpo ou
  texto do cliente.
- **FR-006**: A tela MUST dizer que o agente só conhece "Orientação e tom" e a conversa (a base de
  conhecimento ainda não é consultada).

### Out of Scope (vinculante)

- Consultar a base de conhecimento no agente (fica como próxima story; hoje a "base" é o texto de
  orientação, ampliado para até 16 mil caracteres).
- Salvar transcrições de teste, avaliar respostas automaticamente, comparar modelos lado a lado.
- Qualquer envio por WhatsApp ou Instagram a partir do Playground.

## Success Criteria

- **SC-001**: O administrador sai de "chave do OpenRouter na mão" a "primeira resposta do agente" sem
  conectar canal algum.
- **SC-002**: 0 linhas gravadas em `comunicacao.*` por conversa de teste.
- **SC-003**: 100% dos erros da OpenRouter testados (401, 402, 404, 429, 5xx) mostram causa legível.
