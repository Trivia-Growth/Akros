# Feature Specification: Agente respondendo em WhatsApp e Instagram

**Story**: E13-S13 (inclui as correções que destravam E13-S12)
**Feature Branch**: `feat/E13-S13-agente-multicanal`
**Created**: 2026-10-01
**Status**: Draft
**Input**: "Precisamos do agente respondendo. Evolution já está pronta no projeto Atendimento; deixar
disponível também a API oficial do WhatsApp e o Direct do Instagram (o Heziom OS tem isso)."

Contexto: o código do agente Evolution + OpenRouter existe (E13-S12) mas **nunca respondeu**: a
migration não aplica no Supabase real, as Edge Functions não foram deployadas e o formato das
chamadas à Evolution é o da v1, que a instância atual (v2) não aceita. Evidências em
`docs/qa/caderno-de-teste-fase-real.md` (A-03, A-04, A-05, A-19) e referências de formato em
`/Users/lucasazevedo/GitHub/Atendimento` (Evolution, Meta) e `/Users/lucasazevedo/GitHub/heziomos`
(envio Meta).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cliente escreve no WhatsApp (Evolution) e o agente responde (Priority: P1)

Um administrador configura a conta Evolution e o agente na tela de Configurações. Quando uma pessoa
escreve para o número, o agente responde em português, no tom configurado. Pedido que exija a
equipe (jurídico, pagamento, humano) recebe a mensagem de encaminhamento.

**Why this priority**: é o pedido principal; sem ele o produto não atende ninguém.

**Independent Test**: com a Evolution real pareada, enviar "Oi, quero saber sobre o EB-2 NIW" ao
número e receber resposta do agente; enviar "quero falar com um advogado" e receber o handoff.

**Acceptance Scenarios**:

1. **Given** conta e agente ativos, **When** chega uma mensagem de texto no canal, **Then** o agente
   envia uma resposta e a conversa guarda a entrada e uma única saída.
2. **Given** a mesma mensagem entregue duas vezes pelo provedor, **When** o segundo envio chega,
   **Then** não há segunda resposta.
3. **Given** uma mensagem pedindo humano, advogado, pagamento ou contrato, **When** chega, **Then**
   sai a mensagem de encaminhamento e a IA não é chamada.
4. **Given** agente desligado ou conta inativa, **When** chega mensagem, **Then** ela é registrada
   na conversa, nada é respondido e o recibo fica "ignorado".
5. **Given** o número de quem escreve igual ao telefone de um cliente cadastrado (com ou sem
   formatação), **When** a mensagem chega, **Then** a conversa é vinculada a esse cliente.

---

### User Story 2 - O mesmo agente atende pelo WhatsApp oficial (Meta) (Priority: P1)

O administrador cadastra uma conta de WhatsApp oficial (Cloud API da Meta) e o agente passa a
responder também por ela, com as mesmas regras do Evolution.

**Why this priority**: o WhatsApp oficial é a via de produção da Akros; Evolution é transitória.

**Independent Test**: configurar a conta, registrar a URL de callback e o token de verificação no
painel da Meta, enviar uma mensagem pelo número de teste e receber a resposta.

**Acceptance Scenarios**:

1. **Given** a conta oficial configurada, **When** a Meta chama o endereço de verificação com o
   token correto, **Then** o desafio é devolvido; com token errado, é recusado.
2. **Given** uma entrega da Meta com assinatura inválida ou ausente, **When** chega, **Then** é
   recusada e nada é registrado.
3. **Given** uma mensagem de texto válida, assinada, para o número configurado, **When** chega,
   **Then** o agente responde pelo mesmo número usando a API oficial.
4. **Given** uma entrega para outro número ou outra conta de negócio, **When** chega, **Then** é
   ignorada.

---

### User Story 3 - O mesmo agente atende o Direct do Instagram (Priority: P2)

O administrador cadastra a conta do Instagram e o agente responde mensagens diretas, com as mesmas
regras.

**Independent Test**: enviar um direct à conta e receber a resposta do agente.

**Acceptance Scenarios**:

1. **Given** a conta configurada, **When** a Meta chama a verificação, **Then** vale a regra do
   WhatsApp oficial (token certo devolve o desafio).
2. **Given** um direct de texto válido e assinado, **When** chega, **Then** o agente responde ao
   remetente.
3. **Given** entrega sem assinatura válida ou de outra conta, **When** chega, **Then** é recusada
   ou ignorada.

---

### User Story 4 - Configurar canais sem expor segredos (Priority: P1)

Na tela de Configurações o administrador escolhe o tipo de canal (Evolution, WhatsApp oficial,
Instagram), preenche os dados e as chaves uma vez, e a tela mostra o que falta registrar no
provedor (endereço de callback). Nenhuma chave volta ao navegador.

**Acceptance Scenarios**:

1. **Given** o formulário, **When** o administrador salva, **Then** chaves vão cifradas para o cofre
   e a resposta devolve só identificadores e estado.
2. **Given** uma conta já configurada, **When** o administrador salva deixando a chave em branco,
   **Then** a chave guardada é mantida.
3. **Given** um usuário que não é administrador, **When** tenta salvar, **Then** é recusado.
4. **Given** a Evolution inalcançável ao registrar o webhook, **When** o administrador salva,
   **Then** a conta fica inativa e a tela diz o motivo.

---

### User Story 5 - Registro e auditoria das conversas (Priority: P2)

Toda mensagem recebida e toda resposta ficam na conversa, no canal certo, com custo de IA quando
houver, visíveis ao administrador na tela de Comunicação.

**Acceptance Scenarios**:

1. **Given** uma conversa de Instagram, **When** o administrador abre Comunicação, **Then** vê o
   canal "Instagram" e as mensagens em ordem.
2. **Given** uma falha ao chamar a IA ou o provedor de envio, **When** ocorre, **Then** o recibo
   fica "falhou", nada é reenviado automaticamente e a conversa mostra só o que foi enviado.

### Edge Cases

- Mensagem de grupo, enviada pela própria conta, só de mídia/áudio, ou com texto vazio: ignorada.
- Texto acima de 4000 caracteres: truncado antes de ir à IA.
- Duas mensagens do mesmo contato ao mesmo tempo: a conversa mantém a ordem, sem perder nenhuma.
- Chave de IA ausente: recibo "ignorado", sem erro para o provedor (que reentregaria).
- Rajada de entregas do provedor: limitada por origem sem derrubar o uso normal.
- Resposta da IA acima do limite do canal: truncada.
- Janela de 24 h da API oficial: o agente só responde a mensagem recebida (dentro da janela).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada canal MUST autenticar a entrega antes de ler seu conteúdo (token em cabeçalho
  para Evolution; assinatura HMAC da Meta para WhatsApp oficial e Instagram), em tempo constante.
- **FR-002**: Toda entrega MUST ser deduplicada pelo identificador do provedor, por conta.
- **FR-003**: O agente MUST aplicar as mesmas regras nos três canais: encaminhar pedidos que exigem
  a equipe, não dar aconselhamento jurídico, não tratar pagamento, não ter ferramentas.
- **FR-004**: O envio MUST usar o formato aceito por cada provedor: Evolution v2
  (`number` + `text`), Graph API da Meta (`messages`).
- **FR-005**: Segredos MUST ficar no Vault; nenhum segredo MAY voltar ao navegador, a log ou a
  resposta de API.
- **FR-006**: Só administrador MUST poder criar ou alterar contas de canal e agentes.
- **FR-007**: A migration do agente MUST aplicar no Supabase real e MUST ter teste de banco que
  prove a normalização de telefone e a deduplicação.
- **FR-008**: Canal novo MUST ser acrescentado sem alterar o fluxo do agente (adaptador por canal).
- **FR-009**: Endpoints públicos MUST ter limite de uso e MUST responder só o necessário ao
  provedor (sem eco de erro interno).
- **FR-010**: O agente MUST nascer desligado; ativar é ação explícita do administrador.

### Key Entities

- **Conta de canal**: provedor (Evolution, WhatsApp oficial, Instagram), nome, identificador
  público, dados públicos do provedor, estado.
- **Segredo de canal**: chaves e tokens por conta, somente no cofre.
- **Agente**: orientação, tom, modelo, contas atendidas, estado.
- **Conversa**: identificada por conta + contato externo (telefone ou id do Instagram).
- **Recibo de entrada**: id do provedor, estado (recebido, respondido, encaminhado, ignorado,
  falhou).

### Assumptions

- A Evolution em uso é a v2 (formato validado em produção no projeto Atendimento).
- A Meta já tem app, número/conta e token permanente criados pelo administrador; este projeto
  não cria app na Meta nem faz o fluxo de OAuth da Meta (token colado na tela).
- Só mensagens de texto nesta story; mídia e áudio ficam para depois.
- Modelo de IA e chave OpenRouter são os já usados (E13-S12).
- O administrador pareia o número da Evolution (QR) no painel da própria Evolution.

### Out of Scope (vinculante)

- Pareamento por QR dentro do Akros; fluxo OAuth da Meta; templates de WhatsApp oficial; envio
  fora da janela de 24 h; mídia, áudio e comentários do Instagram; campanhas.
- Handoff com atribuição a atendente humano e notificação (só a mensagem de encaminhamento).
- Corrigir policies de RLS do cliente (A-02), renovação de token (A-06) e variáveis do Netlify
  (A-01): listados em `docs/epics/AJUSTES.md`.
- Aplicar migration, fazer deploy e alterar secrets em produção: etapa de rollout, com confirmação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mensagem recebida no WhatsApp (Evolution) é respondida em até 30 segundos em 95% dos
  casos de teste.
- **SC-002**: 0 respostas duplicadas em 20 reentregas do mesmo evento.
- **SC-003**: 100% das entregas Meta sem assinatura válida são recusadas, em teste automatizado.
- **SC-004**: 0 segredos em resposta de API, log ou tabela pública (verificado por teste).
- **SC-005**: Um administrador configura um canal e o agente em menos de 5 minutos sem ajuda.
