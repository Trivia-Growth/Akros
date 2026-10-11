# Feature Specification: Cliente 360 operacional

**Story**: E03-S07
**Created**: 2026-10-02
**Status**: Draft — refinado com a resposta do Bruno (2026-10-02) e as decisões de 2026-10-06;
plano revisado, sem implementação
**Input**: Bruno e Natália precisam centralizar o andamento da imigração, documentos e pagamentos,
hoje registrados em uma pasta OneDrive por cliente. A equipe cria acesso para o cliente acompanhar
e atuar pela plataforma; arquivos enviados pela plataforma são inseridos no OneDrive. Depois,
consolidar a situação de todos os clientes.

## Contexto e resultado esperado

A plataforma registra o estado operacional do caso; o OneDrive guarda os arquivos. Bruno e Natália
devem responder, ao abrir um cliente: em que fase está, o que falta, quem precisa agir, até quando e
qual é a próxima ação. O cliente vê as informações publicadas e suas tarefas, com instruções claras.

Um caso tem **participantes com papel definido pela versão do programa** (ADR-0018): no EB-2 NIW o
aplicante é o próprio beneficiário, com cônjuge opcional de apoio; no visto R a igreja é a aplicante
e o indivíduo é o beneficiário. Requisito restrito a um papel não é visível aos outros participantes.
O piloto cobre **EB-2 NIW e visto R**.

Reaproveitar o Cliente 360, programas de visto, jornada, documentos, pagamentos e timeline existentes.
As specs antigas E03-S02, E03-S03, E04-S13, E02-S03, E09-S01/S05 e E10-S01 são referências congeladas.
Esta entrega torna o fluxo operacional com dados e arquivos reais. E12-S04 continua responsável
por convite, login e revogação: esta feature usa esse acesso, sem duplicar sua gestão.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Equipe prepara e acompanha um caso (Priority: P1)

Bruno ou Natália registra o contrato do caso, de onde nascem programa de visto, participantes e seus
papéis, condições financeiras, prazos de resposta e prioridade contratual. A partir daí atribui
responsável interno, registra fase atual, solicitações documentais e pasta OneDrive. Pode incluir
cliente em andamento, preservando a pasta e distinguindo histórico importado de eventos novos.

**Why this priority**: informações confiáveis do caso são a base do portal e do resumo da carteira.
**Independent Test**: preparar um caso fictício e consultar fase, responsável, próxima ação e pendências.

**Acceptance Scenarios**:

1. **Given** um administrador autenticado, **When** prepara um caso e informa o programa,
   **Then** a jornada usa a versão escolhida do programa e o 360 mostra responsável, fase e próxima ação.
2. **Given** um cliente em andamento, **When** a equipe registra situação inicial e vincula sua pasta,
   **Then** mantém os arquivos existentes e registra autor, data e origem dessa situação inicial.
3. **Given** requisitos documentais e pagamentos cadastrados, **When** a equipe abre o 360,
   **Then** vê pendências separadas por tipo, responsável pela próxima ação e prazo quando definido.
4. **Given** um cadastro sem levantamento completo, **When** abre o resumo,
   **Then** vê "cadastro incompleto"; ausência de informações não significa ausência de pendências.
5. **Given** um contrato registrado com programa, participantes, condições financeiras e prioridade,
   **When** a equipe prepara o caso, **Then** cadastro, papéis, cobranças e prazos de resposta nascem
   desses dados, com origem registrada e campos faltantes apontados como cadastro incompleto.
6. **Given** um caso sem contrato registrado, **When** abre o 360, **Then** vê o caso como cadastro
   incompleto; o sistema não deriva cobrança, prazo nem prioridade de dado ausente.

### User Story 2 — Participante acessa a jornada e envia documento (Priority: P1)

Após o convite, o participante acompanha a jornada do caso, entende o que deve enviar e faz upload pelo portal.
A equipe recebe o arquivo na pasta vinculada ao caso, sem precisar transferi-lo manualmente.

**Why this priority**: fecha o fluxo solicitado de atuação do cliente pela plataforma.
**Independent Test**: cliente convidado envia um PDF solicitado; equipe abre o mesmo arquivo no 360
e confirma sua presença na pasta correta, sem acesso a arquivos de outro cliente.

**Acceptance Scenarios**:

1. **Given** participante com acesso ativo, **When** abre o portal, **Then** vê somente o caso de que
   participa, no que seu papel permite: jornada, documentos publicados, pagamentos e tarefas, sem
   notas internas da equipe.
2. **Given** uma solicitação em fase liberada, **When** envia PDF válido dentro do limite anunciado,
   **Then** recebe confirmação de recebimento durável, com data, nome e estado de armazenamento.
3. **Given** arquivo recebido, **When** seu armazenamento no OneDrive termina,
   **Then** o documento indica armazenamento concluído e aponta para o arquivo na pasta do caso.
4. **Given** indisponibilidade do OneDrive após recebimento durável, **When** consulta o envio,
   **Then** vê que foi recebido e aguarda armazenamento; a equipe vê a falha e pode reprocessar.
5. **Given** uma solicitação bloqueada ou pertencente a outro cliente, **When** tenta enviar ou
   baixar arquivo inclusive por chamada direta, **Then** a ação é recusada e nenhum vínculo é alterado.
6. **Given** arquivo inválido, **When** tenta enviar, **Then** vê motivo e instrução de correção,
   sem documento tratado como recebido; envio sem persistência durável também não é confirmado.
7. **Given** solicitação de documento de um familiar do caso, **When** o aplicante envia o arquivo,
   **Then** o documento mantém identificação desse familiar; vincular a familiar de outro caso é recusado.
8. **Given** fase atual com envios pendentes, **When** o participante abre a jornada, **Then** vê as
   tarefas apenas da fase liberada; as tarefas da fase seguinte não são listadas nem consultáveis por
   chamada direta antes de a fase atual estar concluída.

### User Story 3 — Equipe revisa documentos e controla etapas (Priority: P1)

A equipe aprova documentos ou devolve com orientação. O cliente envia nova versão sem perder a
anterior. A equipe aprova etapas e libera fases conforme o programa.

**Why this priority**: arquivo enviado não prova que o requisito foi atendido.
**Independent Test**: solicitar ajuste, receber nova versão e aprovar, consultando todo o histórico.

**Acceptance Scenarios**:

1. **Given** documento enviado, **When** a equipe devolve para ajustes com motivo obrigatório,
   **Then** o cliente vê orientação e a pendência volta para ele, preservando arquivo e decisão.
2. **Given** documento em ajustes, **When** cliente reenvia, **Then** cria nova versão e a pendência
   passa para revisão da equipe, sem apagar ou sobrescrever silenciosamente o envio anterior.
3. **Given** cliente autenticado, **When** tenta aprovar documento, concluir etapa ou liberar fase,
   **Then** a ação é recusada, mesmo por chamada direta.
4. **Given** requisitos de uma etapa atendidos, **When** a equipe aprova a etapa e libera a próxima
   fase elegível, **Then** o portal reflete o avanço e o histórico registra autor, data e mudança.
5. **Given** etapa com requisito obrigatório pendente, **When** tenta concluir pelo fluxo normal,
   **Then** a conclusão é recusada e os requisitos faltantes são apresentados.

### User Story 4 — Cliente acompanha pagamento e equipe confirma recebimento (Priority: P1)

A equipe cadastra compromissos financeiros reais do caso. Cliente acompanha vencimento e envia
comprovante; somente a equipe confirma recebimento ou registra divergência com orientação.

**Why this priority**: evita confundir comprovante enviado com pagamento efetivamente recebido.
**Independent Test**: cadastrar cobrança fictícia, enviar comprovante e confirmar pela equipe.

**Acceptance Scenarios**:

1. **Given** compromisso financeiro cadastrado, **When** cliente abre pagamentos, **Then** vê
   descrição, valor, moeda, vencimento e status; totais de moedas diferentes aparecem separados.
2. **Given** pagamento pendente, **When** envia comprovante válido, **Then** fica em conferência,
   com arquivo protegido e registro do envio, sem ser marcado automaticamente como pago.
3. **Given** comprovante em conferência, **When** equipe confirma recebimento ou divergência,
   **Then** ambos veem o resultado e o histórico registra autor, data e justificativa da divergência.
4. **Given** pagamento pendente com vencimento passado, **When** consulta o resumo, **Then** aparece
   vencido; um comprovante em conferência continua identificado como aguardando conferência.
5. **Given** cliente autenticado, **When** tenta alterar valor devido ou confirmar recebimento,
   **Then** a ação é recusada inclusive por chamada direta.

### User Story 5 — Equipe prioriza a carteira inteira (Priority: P2)

Bruno e Natália veem todos os casos, com filtros por programa, fase, responsável, pendência e prazo.
Abrem o caso a partir de cada indicador para agir sobre os itens que produziram aquele resumo.

**Why this priority**: transforma os registros de cada cliente em rotina de acompanhamento da equipe.
**Independent Test**: preparar casos com documento ausente, revisão pendente e pagamento vencido;
conferir totais, filtros e vínculo com o 360.

**Acceptance Scenarios**:

1. **Given** carteira cadastrada, **When** abre a visão consolidada, **Then** vê casos ativos,
   pendências com cliente, revisões com Akros, pagamentos vencidos e vencimentos próximos.
2. **Given** um indicador ou filtro, **When** abre seus resultados, **Then** a lista corresponde
   exatamente aos casos e itens que produziram o total, com data da atualização dos dados.
3. **Given** mudança de documento, etapa ou pagamento, **When** recarrega portal, 360 e carteira,
   **Then** todos apresentam o mesmo estado confirmado, sem atualização manual de outro resumo.
4. **Given** vários impedimentos no mesmo caso, **When** vê o resumo, **Then** cada motivo permanece
   visível; cliente pode estar aguardando documentos e pagamento simultaneamente.
5. **Given** dados incompletos ou falha de consulta, **When** abre a carteira, **Then** vê a lacuna
   ou falha explicitamente; sistema não substitui informação indisponível por zero ou "em dia".

### User Story 6 — Caso com vários participantes e documento restrito (Priority: P1)

No visto R, a igreja é a aplicante e o indivíduo é o beneficiário; cada um recebe suas solicitações e
acessa o portal no que seu papel permite. Nos vistos com empregador, o documento fiscal da empresa não
pode ser visto pelo empregado. Os papéis e as restrições vêm da versão do programa do caso (ADR-0018).

**Why this priority**: sem isso o piloto do visto R não existe, e um erro de visibilidade expõe
documento fiscal de empresa ao beneficiário.
**Independent Test**: preparar caso R com dois participantes, convidar os dois, dirigir uma solicitação
a cada papel e tentar leitura cruzada do requisito restrito.

**Acceptance Scenarios**:

1. **Given** um programa que define aplicante organização e beneficiário pessoa, **When** a equipe
   prepara o caso e convida cada participante, **Then** cada um entra no portal com seu papel e o
   histórico registra quem convidou, quando e com que papel.
2. **Given** requisito marcado como restrito a um papel pelo programa, **When** participante de outro
   papel lista documentos, consulta por ID ou tenta baixar o arquivo por chamada direta, **Then** o
   requisito não aparece e a operação é recusada, sem revelar nome, tamanho ou metadados.
3. **Given** solicitação dirigida a um papel, **When** participante de outro papel tenta enviar,
   **Then** a ação é recusada; quando o programa marca o requisito como de envio conjunto, qualquer
   participante autorizado envia e a autoria do envio fica registrada.
4. **Given** dois participantes ativos, **When** o acesso de um é revogado, **Then** ele perde envio,
   consulta, download e retomada, e o outro continua operando normalmente.
5. **Given** caso EB-2 NIW com cônjuge incluído como apoio, **When** o cônjuge abre o portal, **Then**
   vê apenas o que o papel de apoio permite e nenhuma ação de aprovação lhe é oferecida nem aceita.
6. **Given** a versão do programa do caso congelada, **When** a equipe altera papéis ou restrições no
   catálogo do programa, **Then** os casos em andamento mantêm as regras da versão escolhida.

### User Story 7 — Participante vê avanço e previsão de protocolo (Priority: P2)

O portal mostra percentual de avanço do processo e, quando há histórico suficiente, uma estimativa de
data de protocolo calculada pelo ritmo de entrega do próprio caso e pelos prazos de análise da Akros.

**Why this priority**: dá ao cliente informação para decidir acelerar ou segurar, sem a equipe
responder individualmente. Depende dos dados das histórias P1.
**Independent Test**: caso com requisitos concluídos e entregas em datas distintas; conferir
percentual, estimativa, critério exibido e comportamento com histórico insuficiente.

**Acceptance Scenarios**:

1. **Given** requisitos e etapas da versão do programa, **When** o participante abre a jornada,
   **Then** vê percentual de avanço e o critério usado para calculá-lo.
2. **Given** levantamento incompleto, **When** abre o resumo, **Then** vê cadastro incompleto em vez
   de percentual; o sistema não apresenta avanço calculado sobre requisito não levantado.
3. **Given** histórico de entregas do caso, **When** consulta a previsão, **Then** a tela identifica
   explicitamente estimativa de **protocolo**, considera os prazos de análise da Akros e não apresenta
   previsão de decisão do USCIS nem chance de aprovação.
4. **Given** histórico insuficiente ou caso parado, **When** consulta a previsão, **Then** vê "sem
   previsão" com o motivo, em vez de uma data arbitrária.
5. **Given** mudança no ritmo de entrega, **When** recarrega, **Then** a estimativa é recalculada e
   mostra a data do cálculo.

### Edge Cases

- Duplo clique ou repetição de requisição não cria duas cobranças, decisões ou envios idênticos.
- Interrupção de upload distingue envio incompleto de recebimento confirmado; permite nova tentativa.
- Pasta renomeada não troca o cliente associado; pasta excluída gera impedimento visível à equipe.
- Nomes iguais não misturam arquivos de clientes ou versões de um documento.
- Duas revisões simultâneas não sobrescrevem decisões silenciosamente; equipe vê conflito e recarrega.
- Revogação de acesso impede novas operações, inclusive downloads e retomadas de envio.
- Documento aprovado só admite substituição por fluxo explícito com histórico; nova versão requer revisão.
- Arquivo já existente no OneDrive só conta como requisito atendido após vínculo e validação da equipe.
- Espera por terceiro ou USCIS identifica quem precisa agir e não gera cobrança indevida ao cliente.
- Participante adicionado depois não passa a ver requisito restrito a outro papel nem envio anterior
  que seu papel não alcança.
- Participante com acesso revogado e reativado não recupera janela de upload antiga nem sessão velha.
- Mesma pessoa participando de dois casos com papéis diferentes não mistura visibilidade entre eles.
- Contrato alterado depois do cadastro não reescreve silenciosamente cobranças já conciliadas:
  mudança gera registro novo com autor e origem.
- Fase concluída não revela retroativamente requisito restrito a outro papel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Equipe MUST preparar e consultar o caso com programa, fase, responsável e próxima ação (US1).
- **FR-002**: Pendências MUST mostrar tipo, responsável pela ação, prazo se definido e orientação (US1/US3).
- **FR-003**: Cliente MUST acessar somente os dados publicados do cadastro vinculado ao acesso (US2).
- **FR-004**: Plataforma MUST receber arquivos e armazená-los na pasta OneDrive vinculada ao caso (US2).
- **FR-005**: Recebimento e armazenamento MUST ter estados distintos; falha MUST ser visível e recuperável (US2).
- **FR-006**: Documento MUST manter versões, revisão humana e motivo obrigatório de ajustes (US3).
- **FR-007**: Apenas equipe MUST aprovar documento, etapa e liberação de fase; cliente só envia (US3).
- **FR-008**: Pagamentos MUST manter valor, moeda, vencimento, comprovante e confirmação humana (US4).
- **FR-009**: Valores de moedas diferentes MUST NOT ser somados em um único total (US4/US5).
- **FR-010**: Mudanças operacionais MUST registrar autor, momento, entidade e mudança, sem apagar histórico (US1–US4).
- **FR-011**: Carteira MUST permitir filtros e detalhamento dos itens de cada indicador (US5).
- **FR-012**: Portal, 360 e carteira MUST refletir os mesmos registros confirmados (US5).
- **FR-013**: Cadastro incompleto e dado indisponível MUST ser distinguíveis de zero pendências (US1/US5).
- **FR-014**: Arquivos MUST exigir autorização para envio e consulta; notas internas MUST NOT aparecer no portal (US2).
- **FR-015**: Jornadas MUST seguir o programa do caso; as fases EB-2 NIW não são fixadas para todos os vistos (US1).
- **FR-016**: Solicitações e arquivos MUST identificar o sujeito — participante, familiar incluído ou
  caso; sujeito de outro caso MUST NOT ser aceito (US2/US6).
- **FR-017**: Caso MUST suportar vários participantes com papel vindo da versão do programa (aplicante,
  beneficiário, organização aplicante, familiar de apoio); participante sem acesso ao portal MUST ser
  possível (US6).
- **FR-018**: Visibilidade de requisito, documento e arquivo MUST seguir o papel definido pelo programa;
  item restrito MUST NOT ser listado, consultado, baixado nem ter metadados revelados a outro papel,
  inclusive por chamada direta (US6).
- **FR-019**: Papéis, requisitos dirigidos e restrições MUST vir da versão do programa congelada no
  caso; alteração posterior do catálogo MUST NOT mudar caso em andamento (US1/US6).
- **FR-020**: Convite e revogação MUST ser por participante e papel, reusando E12-S04; revogar um
  participante MUST NOT afetar os demais (US6).
- **FR-021**: Portal MUST publicar tarefas apenas da fase liberada; tarefas de fase seguinte MUST NOT
  ser visíveis nem consultáveis antes da conclusão da fase atual (US2/US3).
- **FR-022**: Cadastro do caso MUST nascer de um contrato registrado com programa, participantes e
  papéis, condições financeiras, prazos de resposta e prioridade contratual; contrato ausente ou
  incompleto MUST aparecer como cadastro incompleto (US1).
- **FR-023**: Cobranças MUST ser derivadas das condições do contrato registrado, preservando
  conciliação humana e sem gerar cobrança a partir de dado ausente (US4).
- **FR-024**: Portal MUST apresentar percentual de avanço calculado dos requisitos e etapas da versão
  do programa, com o critério visível (US7).
- **FR-025**: Previsão MUST ser identificada como estimativa de **protocolo**, derivada do ritmo de
  entrega do caso e dos prazos de análise da Akros; MUST NOT apresentar previsão de decisão do USCIS
  ou chance de aprovação, e histórico insuficiente MUST produzir "sem previsão" (US7).
- **FR-026**: Toda a equipe da Akros MUST alcançar o caso e seus registros; responsável interno é
  atribuição de trabalho e MUST NOT restringir a leitura da equipe (US1/US5).

### Key Entities

- **Cliente/caso**: cadastro existente, contrato de origem e vínculos de acesso dos participantes.
- **Participante**: sujeito do caso (pessoa ou organização) com papel do programa, acesso opcional
  ao portal e estado ativo/revogado.
- **Papel do programa**: papel declarado na versão do programa, com requisitos dirigidos, requisitos
  restritos e se o envio é individual ou conjunto.
- **Contrato**: origem do cadastro — programa, participantes, condições financeiras, prazos de
  resposta e prioridade contratual; registra autor, data e arquivo assinado quando houver.
- **Progresso e estimativa**: percentual derivado de requisitos/etapas e estimativa de protocolo com
  critério, data de cálculo e motivo quando indisponível.
- **Jornada**: processo associado ao programa e sua versão; contém fases e etapas.
- **Pendência**: item que exige ação, derivado de etapa, documento ou pagamento; inclui dono e prazo.
- **Documento e versão**: requisito, sujeito do documento, papel dirigido, marca de restrito, arquivo
  recebido, estado de armazenamento e revisão.
- **Pagamento**: compromisso financeiro, moeda, vencimento, comprovante e decisão da equipe.
- **Vínculo OneDrive**: pasta autorizada do caso, sem depender exclusivamente do nome exibido.
- **Evento de histórico**: registro de ação com autor, data e visibilidade interna ou publicada ao cliente.
- **Resumo da carteira**: agregação verificável dos casos e suas pendências.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Metas propostas para validação com Bruno e Natália durante o piloto:

- **SC-001**: Equipe identifica fase, impedimentos, dono e próxima ação de cada caso do piloto em até 60 segundos.
- **SC-002**: Em 100% dos envios confirmados do piloto, arquivo é recuperável e armazenamento concluído
  ou pendente está explícito; nenhum envio confirmado é perdido ou atribuído a outro cliente.
- **SC-003**: Em 100% dos cenários de aceite, carteira e detalhe apresentam os mesmos itens e totais.
- **SC-004**: Em 100% das tentativas de acesso cruzado testadas, cliente não consulta nem altera outro caso.
- **SC-005**: Equipe e cliente completam ciclo solicitação, envio, ajustes e aprovação pelo produto,
  sem transferência manual de arquivo nem atualização paralela de estado.
- **SC-006**: Em 100% das tentativas testadas, participante não lê, lista, baixa nem descobre metadados
  de requisito restrito a outro papel do mesmo caso.
- **SC-007**: Nos casos do piloto, cadastro, papéis e cobranças conferem com o contrato registrado, com
  origem rastreável; nenhuma cobrança nasce sem condição contratual correspondente.
- **SC-008**: Em 100% das telas do piloto que mostram previsão, o texto identifica estimativa de
  protocolo; nenhuma tela apresenta previsão de decisão do USCIS ou chance de aprovação.

## Assumptions

Propostas de escopo, ainda sujeitas ao refinamento:

- Plataforma continua single-tenant (ADR-0009): organização aplicante é sujeito do caso, não inquilino.
  Acesso do portal passa a ser por participação com papel do programa (ADR-0018); responsável interno
  continua sendo atribuição de trabalho, não papel de autorização.
- Um processo operacional por caso, com participantes do próprio caso. Jornadas históricas mono-titular
  continuam válidas: caso com um único participante aplicante é modelo suportado, não exceção.
- Usar versão do programa congelada no caso; piloto com EB-2 NIW e visto R, estrutura aplicável aos
  demais programas existentes.
- Financeiro usa cobrança derivada do contrato e confirmação manual; sem gateway, sem link gerado por
  API e sem valores fixos de taxas de imigração nesta story.
- Contrato entra como registro estruturado na plataforma, com o PDF assinado anexado quando houver;
  leitura automática do contrato por IA não faz parte desta story.
- PDFs finais no MVP, com limite de tamanho definido no plano e exibido antes do envio; traduções conforme requisito.
- Histórico anterior entra como situação inicial validada; não inventar eventos ou aprovação a partir do nome do arquivo.
- Cliente vê fases, solicitações e decisões publicadas; comentários de estratégia e notas internas ficam com equipe.
- Resumo, percentual e estimativa usam dados estruturados e regras explícitas, sem geração por IA.
  Esta story expõe os ganchos da pré-análise de documento e do rascunho de resposta (`AnalisadorDocumentoPort`
  e contexto do caso), mas não implementa IA.
- Fase não avança automaticamente por upload ou comprovante. MVP segue aprovação e liberação pela equipe,
  sem override de requisitos obrigatórios; exceções exigem refinamento separado.

### Decisões confirmadas

- **2026-10-02 — Público inicial**: clientes atuais, com piloto pequeno, confirmado pelo usuário.
  Vincular pastas existentes e registrar fase, documentos e pagamentos a partir de conferência da
  equipe. Quantidade de casos e programa do piloto ainda são propostas; não importar toda a base.
- **2026-10-02 — Armazenamento**: OneDrive empresarial da Akros, confirmado pelo usuário.
  A integração usa o armazenamento corporativo e vincula as pastas existentes dos casos do piloto.
  A conta proprietária e a pasta autorizada serão identificadas no preparo da integração.
- **2026-10-02 — Processo e família**: um processo por cliente/família, com acesso só do titular.
  **Revisada em 2026-10-06** pela resposta do Bruno: o modelo mono-titular continua válido para
  EB-2 NIW, mas deixa de ser a regra do caso. Ver decisão de 2026-10-06 abaixo.
- **2026-10-06 — Participantes por papel no MVP**: o visto R entra no piloto, então caso passa a ter
  vários participantes com papel vindo da versão do programa e visibilidade por papel, já nesta story.
  Registrado no ADR-0018. Decidido pelo usuário a partir da carta do Bruno de 2026-10-02.
- **2026-10-06 — IA de apoio em spec própria**: pré-análise de documento e rascunho de resposta ao
  cliente (prioridade nº 1 do Bruno) viram feature própria dependente desta (E07-S05), com
  `@prompt-engineer`, evals e OWASP LLM Top 10. Esta story entrega a operação real e os ganchos; sem
  dado real não há o que a IA analise. Decidido pelo usuário.
- **2026-10-06 — Dados sensíveis e IA**: antes de qualquer arquivo de cliente ir a provedor de IA,
  exige-se mascaramento de PII feito na infraestrutura da Akros, provedor dedicado só à análise e
  chave exclusiva dessa finalidade no Vault. Gate da story de IA, registrado aqui porque restringe o
  que esta story pode expor. Pendência técnica declarada: análise de legibilidade de imagem não é
  compatível com mascaramento — ver `research.md`.
- **2026-10-06 — Pagamentos externos fora desta story**: QuickBooks, Global Pays, links recorrentes,
  previsão de recebimento, lembretes por WhatsApp/e-mail e agente financeiro de IA voltam ao roadmap
  como E10-S03 e E10-S05, com a orientação que faltava em 2026-09-08. Esta story mantém cobrança
  derivada do contrato, comprovante e conciliação manual. Decidido pelo usuário.

### Refinamento concluído nesta rodada

Público inicial, armazenamento, modelo de acesso (participantes por papel), programas do piloto
(EB-2 NIW + visto R) e fronteira com IA e pagamentos externos estão definidos. Seguem propostas as
metas e a seleção dos casos pela equipe; não bloqueiam o plano. Conta proprietária, pasta autorizada
e consentimento Microsoft continuam pré-requisitos do exercício da integração real.

**Perguntas devolvidas ao Bruno** (não bloqueiam o plano; bloqueiam a implementação do item citado):

1. **Liberação de fase** (pergunta 1 dele): MVP mantém o clique final da equipe, com liberação
   automática como configuração por programa depois do piloto. Confirmar.
2. **Manual do visto R** (pergunta 4 dele): quem escreve e até quando. **Bloqueia o piloto do R** —
   sem fases, etapas, requisitos por papel e restrições do R não há o que instanciar.
3. **Contrato no sistema** (pergunta 5 dele): proposta é formulário estruturado na plataforma mais
   upload do PDF assinado; extração automática do PDF fica em E07-S05. Confirmar.
4. **APIs de pagamento e WhatsApp** (pergunta 3 dele): confirmação de QuickBooks, Global Pays e API
   do WhatsApp é insumo de E10-S03/E10-S05, não desta story.
5. **Advogado parceiro**: pasta filtrada no OneDrive, como ele sugeriu, vira story própria; definir se
   a montagem é por comando da equipe ou automática.

### Dependencies

- E12-S04: convite, vínculo de acesso e revogação implementados e exercitados, hoje com spec em Draft.
  Precisa aceitar **convite por participante e papel**, não só titular por cliente (ADR-0018).
- Programa do visto R cadastrado com fases, etapas, requisitos por papel e requisitos restritos —
  manual do R escrito pela Akros. **Bloqueia o piloto do R**, não o restante da story.
- ADR-0018 aceito (participantes por papel). ADR da integração OneDrive segue pendente.
- A-02: corrigir autorização de transições de jornada, documentos e pagamentos antes de habilitar ações.
- Ambiente real alcançável, sessão funcional e conexão Microsoft autorizada para exercício do fluxo completo.
- Identificar conta proprietária e pasta corporativa autorizada no OneDrive empresarial antes de
  habilitar a integração; vínculo por caso conferido pela equipe.
- Equipe valida programa, requisitos, regras de revisão, situação inicial e dados de recebimento do piloto.

### Out of Scope (vinculante)

Fora desta story; o destino de cada item pedido pelo Bruno está indicado.

- Gateway, link de pagamento por API, cobrança recorrente, câmbio automático e emissão fiscal —
  QuickBooks e Global Pays, previsão de recebimento e visão financeira administrativa vão para
  **E10-S03**; agente de cobrança por IA e lembretes automáticos, para **E10-S05**.
- Pré-análise de documento por IA e rascunho de resposta ao cliente — **E07-S05**, dependente desta.
  Esta story só expõe os ganchos.
- IA aprovando documento ou determinando avanço, pagamento ou estratégia de imigração — fora sempre.
- Registro unificado de WhatsApp/e-mail como prova e chat no sistema com versão mobile —
  **E08-S04** e **E08-S05**.
- Compartilhamento com advogado parceiro (pasta filtrada no OneDrive) — story própria.
- Consulta automática de situação USCIS, promessa de aprovação ou estimativa jurídica de sucesso.
- Sincronização bidirecional de todas as pastas e importação automática de toda a base histórica.
- Assinatura eletrônica real.
- Participante de papel não declarado pela versão do programa, e portal de recomendantes ou terceiros
  com permissões próprias.
- Alterar arquivos diretamente no OneDrive e esperar atualização automática da jornada no MVP.

Detalhamento das propostas e sequência de entrega: [refinamento.md](refinamento.md).
