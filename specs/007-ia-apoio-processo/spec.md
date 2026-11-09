# Feature Specification: IA de apoio ao processo — pré-análise e rascunho de resposta

**Story**: E07-S05

**Feature Branch**: `feat/E07-S05-ia-apoio-processo`

**Created**: 2026-11-06

**Status**: Draft

**Input**: "IA de apoio ao processo (pré-análise + rascunho de resposta). Prioridade nº 1 do Bruno
(carta de 2026-10-02), story aberta em 2026-10-06, depende de E03-S07 (já implementada). Escopo:
pré-análise do documento recebido (como chegou, legibilidade, qualidade geral), cruzamento com os
requisitos do visto do caso, rascunho de resposta ao cliente com tom de gestão de
expectativa/ansiedade sobre os prazos contratuais; prioridade paga lida do contrato. IA nunca
aprova — documento e resposta sempre com confirmação humana (ADR-0005). Envio automático de
resposta fica fora de escopo até existir medição de confiança. Gate (research.md §7): mascaramento
de PII na infraestrutura da Akros antes de qualquer chamada externa, provedor dedicado à análise
com chave exclusiva no Vault, registro de qual versão de arquivo foi a qual provedor, desligamento
por caso. Limite técnico não resolvido: mascaramento quebra a checagem de legibilidade que precisa
da imagem crua."

Contexto: a Akros já tem análise automática de documento desde E07-S01 (`AnalisadorDocumentoPort`,
`MockAnalisadorDocumento`), mas é só mock — nunca chamou provedor de IA real, e não cobre rascunho
de resposta nem leitura do prazo contratual. Esta story troca o mock por um fluxo real respeitando
o gate de PII já decidido em `specs/005-cliente-360-operacional/research.md` §7, e acrescenta o
rascunho de resposta ao cliente que o Bruno pediu.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pré-análise de legibilidade e qualidade, sem sair da Akros (Priority: P1)

A equipe recebe um documento do cliente e quer saber, antes de abrir e ler, se o arquivo chegou de
forma utilizável: página legível, resolução suficiente, não cortado, não borrado, PDF com texto
pesquisável ou imagem escaneada. Essa checagem roda inteiramente dentro da infraestrutura da Akros
— nenhum arquivo nem imagem sai para provedor externo nesta pré-análise.

**Why this priority**: é a parte do pedido do Bruno que não depende de decisão de contrato com
provedor externo nem de ADR — entrega valor imediato e sozinha já reduz retrabalho (hoje a equipe
só descobre que o arquivo está ilegível quando abre).

**Independent Test**: enviar um PDF ilegível (foto tremida, página cortada, resolução baixa) e um
PDF de boa qualidade; a pré-análise aponta "legível" ou "problema encontrado" com o motivo, sem
nenhuma chamada de rede para fora da Akros.

**Acceptance Scenarios**:

1. **Given** um documento enviado pelo cliente com boa resolução e página completa, **When** a
   pré-análise roda, **Then** o resultado mostra "legível", sem bloquear o fluxo de revisão humana.
2. **Given** um documento com página cortada, resolução muito baixa, ou arquivo corrompido,
   **When** a pré-análise roda, **Then** o resultado mostra o motivo específico do problema
   (ex.: "resolução insuficiente", "página incompleta"), visível para a equipe antes de abrir o
   arquivo.
3. **Given** qualquer documento, **When** a pré-análise roda, **Then** nenhuma chamada de rede sai
   da infraestrutura da Akros para processar essa checagem.

---

### User Story 2 - Cruzamento com os requisitos do visto, com PII mascarada (Priority: P2)

A equipe quer saber se o conteúdo do documento atende ao requisito do visto do caso (mesmo
parecer que `AnalisadorDocumentoPort` já simula hoje, agora com dado real). O texto é extraído
localmente e mascarado antes de qualquer chamada ao provedor dedicado — nunca a imagem, nunca o
documento original.

**Why this priority**: é o núcleo do que `E07-S01`/`E07-S02` já prometem à UI (parecer antes da
fila humana) — troca o mock por dado real, mas só depois que a US1 prova que o documento é
legível.

**Independent Test**: enviar um documento de tipo conhecido (ex.: carta de recomendação) com texto
extraível; o parecer aponta aderência ao requisito esperado, e inspecionar o payload enviado ao
provedor confirma ausência de PII (nome completo, passaporte, data de nascimento) em claro.

**Acceptance Scenarios**:

1. **Given** um documento legível (US1 passou) com texto extraível, **When** o cruzamento roda,
   **Then** o parecer de aderência ao requisito do visto é gerado e PII identificável (passaporte,
   CPF, data de nascimento, nome completo) está mascarada em todo conteúdo enviado ao provedor
   externo.
2. **Given** um documento sem texto extraível localmente (ex.: só imagem, sem OCR confiável),
   **When** o cruzamento é solicitado, **Then** o sistema não envia a imagem ao provedor e marca o
   parecer como "não disponível — requer revisão manual", nunca mascarando de forma incompleta e
   enviando mesmo assim.
3. **Given** qualquer parecer gerado, **When** a equipe revisa, **Then** a decisão final
   (aprovado/ajustes) continua exclusivamente humana — o parecer nunca muda `Documento.status` por
   si só (mesma invariante de ADR-0005).

---

### User Story 3 - Rascunho de resposta ao cliente, com tom calibrado pelo contrato (Priority: P2)

Depois da pré-análise e do cruzamento, a equipe quer um rascunho de resposta ao cliente — pronto
para revisar e editar antes de enviar — que já reflita o prazo de análise contratado e a
prioridade do caso, para gerir a expectativa/ansiedade do cliente sobre quanto tempo falta.

**Why this priority**: é o segundo pedido explícito do Bruno (resposta, não só análise) e depende
do parecer da US2 já existir.

**Independent Test**: para um caso com contrato de prioridade "prioritaria" e outro "padrao", gerar
o rascunho para o mesmo tipo de problema no documento; o texto do rascunho prioritário referencia
um prazo de resposta menor, condizente com `crm.contratos.prazo_resposta_dias_uteis`.

**Acceptance Scenarios**:

1. **Given** um parecer de "ajustes necessários" e um contrato com prazo de resposta definido,
   **When** o rascunho é gerado, **Then** o texto menciona o prazo contratual sem prometer data
   exata de decisão do USCIS e sem tom alarmista.
2. **Given** um rascunho gerado, **When** a equipe revisa, **Then** o rascunho fica disponível para
   edição e só é enviado ao cliente por ação humana explícita — nenhum envio automático existe
   nesta story.
3. **Given** um caso marcado como "IA de apoio desligada" (ver FR-010), **When** a equipe abre o
   documento, **Then** nenhuma pré-análise, cruzamento ou rascunho é gerado automaticamente para
   aquele caso.

---

### Edge Cases

- O que acontece quando o provedor dedicado está indisponível ou expira a chave no Vault? A fila de
  revisão humana continua funcionando sem IA (mesmo padrão de degradação de E07-S01 — parecer
  ausente nunca bloqueia envio/revisão).
- Como o sistema evita reenviar o mesmo conteúdo ao provedor quando o documento é reenviado sem
  mudança? Evita custo duplicado e reduz superfície de exposição de dado.
- O que acontece se a extração de texto local (OCR) falhar silenciosamente e produzir texto
  incompleto? O parecer deve declarar baixa confiança em vez de aderência falsa.
- O que acontece com um documento cujo requisito não está mapeado no catálogo do programa (sem
  `objetivoRequisito` definido)? Pré-análise de legibilidade ainda roda; cruzamento com requisito
  não é possível e deve dizer isso explicitamente, não inventar aderência.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A pré-análise de legibilidade/qualidade do documento MUST rodar inteiramente dentro
  da infraestrutura da Akros, sem enviar o arquivo ou a imagem a qualquer provedor externo.
- **FR-002**: A pré-análise MUST reportar, no mínimo: se a página está completa (sem corte de
  borda), se a resolução é suficiente para leitura, se o arquivo é um PDF com texto pesquisável ou
  uma imagem escaneada, e se há indício de borrão/baixa nitidez.
- **FR-003**: Todo texto extraído de um documento MUST passar por mascaramento de PII (nome
  completo, número de passaporte, CPF/SSN, data de nascimento e demais identificadores diretos)
  antes de qualquer chamada de rede a provedor externo de IA.
- **FR-004**: O cruzamento com os requisitos do visto do caso MUST usar um provedor de IA dedicado
  a essa finalidade, com chave de API exclusiva armazenada no Vault — nunca a chave BYOK do agente
  de atendimento ao cliente (E13-S12/OpenRouter).
- **FR-005**: O sistema MUST registrar, para cada chamada ao provedor externo, qual versão do
  arquivo (ou do texto extraído dela) foi enviada e a qual provedor, de forma auditável.
- **FR-006**: Nenhuma imagem ou arquivo original MUST ser enviado a provedor externo nesta story —
  análises que exigiriam a imagem crua (ver Assumption sobre escopo (c) do research.md §7) ficam
  fora de escopo até ADR próprio aprovar esse caminho.
- **FR-007**: O parecer de cruzamento com requisito e o rascunho de resposta MUST ser sempre
  apresentados como sugestão sujeita a confirmação humana — nenhum dos dois MUST alterar
  `Documento.status`, aprovar, nem enviar algo ao cliente por conta própria (mesma invariante de
  ADR-0005).
- **FR-008**: O rascunho de resposta ao cliente MUST considerar `prazoRespostaDiasUteis` e
  `prioridade` do contrato ativo do caso ao descrever o tempo de análise esperado, e MUST NOT
  prometer data de decisão do USCIS.
- **FR-009**: O envio do rascunho ao cliente MUST exigir ação humana explícita — envio automático
  fica fora de escopo desta story.
- **FR-010**: A equipe MUST poder desligar a IA de apoio (pré-análise, cruzamento e rascunho) por
  caso individual; com a IA desligada, nenhuma chamada automática de análise MUST ocorrer para
  aquele caso.
- **FR-011**: Quando o provedor externo estiver indisponível, sem chave configurada, ou a chamada
  falhar, o sistema MUST continuar permitindo a revisão humana do documento normalmente, marcando o
  parecer como indisponível em vez de bloquear o fluxo.
- **FR-012**: Quando não houver texto extraído com confiança suficiente para o cruzamento, o
  sistema MUST marcar o parecer como "não disponível — requer revisão manual" em vez de gerar uma
  aderência inventada.

### Key Entities

- **Pré-análise de recebimento**: resultado das checagens locais de legibilidade/qualidade de um
  documento (completude de página, resolução, tipo de PDF, nitidez), ligado a uma versão de
  arquivo específica.
- **Parecer de cruzamento**: aderência do conteúdo do documento ao requisito do visto esperado,
  gerado a partir de texto mascarado, com indicação de confiança e, quando aplicável, motivo de
  indisponibilidade.
- **Rascunho de resposta**: texto de resposta ao cliente sugerido pela IA, vinculado ao parecer que
  o originou e ao prazo/prioridade do contrato usados para calibrar o tom; existe em estado de
  rascunho até edição/envio humano.
- **Registro de processamento externo**: qual versão de arquivo (ou texto extraído dela) foi
  enviada a qual provedor e quando — trilha de auditoria exigida pelo gate de PII.
- **Configuração de IA de apoio por caso**: estado ligado/desligado da IA de apoio para um caso
  específico.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A equipe recebe o resultado da pré-análise de legibilidade antes de abrir o
  documento, sem que o arquivo deixe a infraestrutura da Akros nessa etapa.
- **SC-002**: 100% das chamadas a provedor externo de IA nesta feature carregam texto com PII
  mascarada, nunca a imagem ou o arquivo original.
- **SC-003**: Zero respostas são enviadas ao cliente sem confirmação humana explícita durante toda
  a vigência desta story.
- **SC-004**: Toda chamada a provedor externo é auditável — é possível responder "qual provedor
  processou qual versão de arquivo, e quando" para qualquer documento processado.
- **SC-005**: Quando o provedor externo falha ou está desligado para um caso, a equipe continua
  revisando e decidindo sobre o documento sem perda de funcionalidade essencial.

## Assumptions

- **Escopo (c) do research.md §7 (análise de imagem crua por provedor dedicado com retenção zero)
  fica fora desta story.** Entrega-se (a) checagens locais de legibilidade/qualidade e (b) OCR
  local + cruzamento por texto mascarado. Se a equipe de produto concluir que a pré-análise de
  qualidade de imagem (ex.: "foto tremida") exige mesmo assim ver a imagem, isso vira story
  separada após ADR específico — não bloqueia o valor desta entrega.
- O provedor de IA dedicado (qual serviço, qual modelo) é decisão técnica tratada no plano de
  implementação/ADR, não nesta especificação de produto.
- "Desligar a IA de apoio por caso" é uma ação disponível para qualquer usuário com papel admin,
  mesmo padrão de permissão das demais ações administrativas do caso (sem papel novo criado para
  isso).
- A extração de texto local (OCR) é tratada como componente de infraestrutura; sua qualidade
  mínima aceitável é validada durante o plano técnico, não nesta especificação.
- Esta story reaproveita o catálogo de requisitos por programa já existente (`programas`,
  E06-S01) para saber qual é o requisito esperado de cada documento — não cria um catálogo novo.
