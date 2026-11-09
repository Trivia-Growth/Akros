# Feature Specification: Evolution confiável — conectar um número e receber mensagens de primeira

**Story**: E13-S15 (continua em E13-S16: saída durável, saúde e resposta humana)
**Feature Branch**: `feat/E13-S15-evolution-confiavel`
**Created**: 2026-10-27
**Status**: Draft
**Input**: "Conectar um número do Evolution no Akros pela tela, espelhando o que já funciona no
TriviAtende, para a recepção funcionar de primeira. Trazer para cá o tratamento das falhas que o
TriviAtende já resolveu."

Contexto: o Akros já tem um caminho feliz para Evolution (E13-S12/S13: formulário, registro de
webhook, recebimento de texto, resposta do agente). Ele nunca foi provado contra uma Evolution real
(achado A-19) e depende de passos manuais fora do produto (criar e parear a instância no painel da
Evolution). O TriviAtende resolve isso com um fluxo guiado e provado. Esta story traz **a conexão e
a recepção**; **a saída durável** (retry, saúde do canal, resposta humana) é a E13-S16.

Referência de comportamento (somente leitura): repositório `Atendimento`, `origin/main` `2a6d0ab7`
(`evolution-configurar`, `evolution-pareamento`, `evolution-webhook`,
`packages/shared/src/atendimento/evento-evolution.ts`). Análise completa em
`analise-canais-atendimento.md` (relatório de 2026-10-27).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conectar o servidor Evolution e saber se ele serve (Priority: P1)

O administrador informa o endereço do servidor Evolution e a chave de administração dele. O Akros
confere se o endereço é seguro, mede a versão do servidor e diz, em linguagem clara, se aquela versão
está **provada** para o Akros. Versão não provada **bloqueia** a conexão, com o motivo.

**Why this priority**: sem servidor compatível nada mais funciona; hoje o Akros aceita qualquer URL
e só descobre o problema quando a primeira mensagem falha.

**Independent Test**: com um servidor de teste (ou fake), salvar URL e chave e ver o estado
"compatível" ou "incompatível, com motivo", sem que a chave apareça em nenhuma resposta.

**Acceptance Scenarios**:

1. **Given** um servidor Evolution acessível por HTTPS e com versão provada, **When** o administrador
   salva URL e chave, **Then** o Akros mostra "compatível" com a versão detectada e guarda a chave
   fora do banco de negócio, mostrando só os 4 últimos caracteres.
2. **Given** um servidor com versão que o Akros nunca provou, **When** o administrador salva,
   **Then** o estado é "incompatível" com o motivo (versão ou capacidade ausente) e nenhuma instância
   pode ser criada nele.
3. **Given** uma URL sem HTTPS, com usuário/senha embutidos, com consulta, apontando para rede
   privada, loopback ou endereço de metadados (inclusive quando o nome resolve para um desses),
   **When** o administrador salva, **Then** o Akros recusa antes de qualquer chamada ao servidor.
4. **Given** um usuário que não é administrador, **When** tenta salvar o servidor, **Then** é
   recusado e nada é gravado.

---

### User Story 2 - Criar a instância e instalar o webhook com prova (Priority: P1)

Para um número do WhatsApp, o administrador cria o canal e o Akros cria a instância na Evolution e
instala o webhook protegido por um segredo próprio. O Akros **só declara sucesso depois de reler o
webhook no servidor e conferir que foi aplicado** (endereço, segredo, eventos e opções). Se algo
falhar no meio, o canal fica "configuração incompleta" e o administrador consegue **retomar** sem
duplicar a instância.

**Why this priority**: hoje o Akros pode dizer "salvo" sem que o webhook tenha sido aplicado, e a
instância precisa ser criada à mão fora do produto.

**Independent Test**: com a Evolution fake, executar o fluxo completo e as falhas (resposta de
sucesso sem aplicar, queda entre criar e instalar, nome de instância já existente) e conferir o
estado final de cada uma.

**Acceptance Scenarios**:

1. **Given** servidor compatível e canal novo, **When** o administrador cria a instância e instala o
   webhook, **Then** a instância existe com nome derivado do canal, o webhook relido confere com o
   esperado e o canal passa para "aguardando pareamento".
2. **Given** a Evolution que responde sucesso ao gravar o webhook mas não o aplica, **When** o Akros
   relê, **Then** o canal **não** avança, fica "configuração incompleta" e o administrador vê o
   motivo.
3. **Given** a criação da instância concluída e a instalação do webhook interrompida, **When** o
   administrador retoma, **Then** o Akros reaproveita a mesma instância e termina a instalação sem
   criar outra.
4. **Given** um nome de instância que já existe no servidor (nova tentativa após falha parcial),
   **When** o Akros tenta criar, **Then** recupera o acesso da instância existente em vez de falhar
   ou duplicar.
5. **Given** qualquer etapa, **When** ela termina (sucesso, recusa ou falha), **Then** fica uma
   linha de auditoria sem segredo, URL completa ou telefone.

---

### User Story 3 - Parear o número e confirmar que é o número certo (Priority: P1)

O administrador vê o QR Code na tela do Akros, escaneia com o WhatsApp do número do canal e o Akros
mostra "conectado" **somente quando o número pareado for exatamente o número cadastrado no canal**.
Pareamento com outro número é recusado e explicado.

**Why this priority**: sem isso o administrador precisa abrir o painel da Evolution, e um número
trocado por engano passaria a receber e responder como se fosse o da Akros.

**Independent Test**: com a Evolution fake, gerar QR, simular conexão com o número esperado e com
outro número e conferir os dois resultados.

**Acceptance Scenarios**:

1. **Given** canal "aguardando pareamento", **When** o administrador pede o QR, **Then** vê o QR por
   tempo limitado; o QR não é gravado em banco, log nem resposta persistida.
2. **Given** o WhatsApp do número esperado escaneou o QR, **When** o Akros consulta o estado, **Then**
   o canal vira "conectado e verificado".
3. **Given** o WhatsApp de **outro** número escaneou o QR, **When** o Akros consulta o estado,
   **Then** o canal **não** vira "conectado" e o administrador é avisado do número divergente.
4. **Given** o canal conectado e depois a sessão cai no WhatsApp, **When** o Akros recebe o evento de
   conexão ou o administrador abre a tela, **Then** o estado volta para "desconectado".
5. **Given** o administrador aceita o risco de banimento do número (Evolution não é a via oficial),
   **When** confirma, **Then** o aceite fica registrado com autor e horário, e sem o aceite o QR não
   é gerado.

---

### User Story 4 - Receber a mensagem na conversa certa (Priority: P1)

Uma pessoa escreve para o número conectado. O Akros aceita o evento **só se vier do servidor
configurado para aquele canal**, registra a mensagem **uma única vez** (mesmo que a Evolution
reenvie) na conversa daquele canal e daquela pessoa, e o agente continua respondendo como hoje.

**Why this priority**: é o objetivo final; precisa continuar funcionando e ficar mais robusto.

**Independent Test**: enviar eventos de teste ao endereço do webhook com e sem o segredo, repetidos e
de outro canal.

**Acceptance Scenarios**:

1. **Given** evento de mensagem de texto com o segredo correto, **When** chega, **Then** a mensagem
   aparece uma vez na conversa do canal e do remetente, e o agente decide a resposta.
2. **Given** o mesmo evento reenviado, **When** chega de novo, **Then** nada é duplicado e nenhuma
   segunda resposta é gerada.
3. **Given** evento sem segredo ou com segredo errado, **When** chega, **Then** é recusado **antes**
   de ler o conteúdo, e nada é gravado.
4. **Given** evento de conexão (conectou, desconectou, QR atualizado), **When** chega autenticado,
   **Then** o estado do canal é atualizado e nenhuma mensagem é criada.
5. **Given** mensagem de grupo, enviada pela própria conta, reação ou apagada, **When** chega,
   **Then** é reconhecida sem erro e **não** gera resposta do agente. (Anexos **não** entram aqui:
   ver US8.)
6. **Given** evento de um canal que não existe, está desativado ou pertence a outra conta, **When**
   chega, **Then** é recusado sem revelar o motivo.

---

### User Story 5 - Remetente sem número visível não é adivinhado (Priority: P2)

Às vezes o WhatsApp identifica o remetente por um código interno (LID) em vez do telefone. O Akros
descobre o telefone **somente** por dados que o próprio WhatsApp entrega (campo alternativo do evento
ou histórico da mesma instância). Se não houver prova, **não adivinha**.

**Why this priority**: sem isso, parte dos clientes escreve e nunca recebe resposta, ou pior, é
associada à pessoa errada.

**Independent Test**: eventos de teste com remetente por código interno, com e sem telefone
alternativo e com telefones conflitantes.

**Acceptance Scenarios**:

1. **Given** remetente por código interno e telefone alternativo no evento, **When** chega, **Then**
   a mensagem é registrada com o telefone, normalizado sem sufixo de dispositivo.
2. **Given** remetente por código interno sem telefone alternativo e com **exatamente um** telefone
   comprovado no histórico da mesma instância, **When** chega, **Then** usa esse telefone.
3. **Given** telefones divergentes entre campos do mesmo evento, ou mais de um telefone no histórico,
   **When** chega, **Then** o telefone **não** é usado.
4. **Given** remetente por código interno sem nenhuma prova de telefone, **When** chega, **Then** a
   mensagem é **guardada** numa conversa marcada "contato não identificado" (identificada pelo código
   interno, nunca apresentada como telefone), visível **só à equipe**, **sem** vínculo com cliente e
   **sem** resposta do agente. (Decisão de 2026-10-27; difere do TriviAtende, que descarta.)
5. **Given** uma conversa "contato não identificado" e uma nova mensagem do mesmo remetente **com**
   telefone comprovado, **When** chega, **Then** a nova mensagem segue a conversa do telefone e a
   conversa não identificada **não** é mesclada automaticamente.
6. **Given** qualquer das hipóteses acima, **When** o Akros consulta o histórico da Evolution,
   **Then** nome e foto do contato **nunca** servem de prova de identidade.

---

### User Story 6 - Telefone compartilhado não vaza conversa entre clientes (Priority: P2)

Quando mais de um cliente cadastrado tem o mesmo telefone (por exemplo, família no mesmo caso), o
Akros **não** escolhe um deles: a conversa fica sem vínculo com cliente, visível à equipe, e **nenhum**
cliente a vê no portal até uma pessoa da equipe vincular.

**Why this priority**: hoje o Akros vincula ao cliente cadastrado mais antigo, e a regra de acesso do
portal mostra ao cliente as conversas vinculadas a ele. Isso pode expor mensagem a quem não deveria.

**Independent Test**: dois clientes com o mesmo telefone; mensagem recebida; cada cliente consulta o
portal; a equipe consulta o painel.

**Acceptance Scenarios**:

1. **Given** exatamente um cliente com aquele telefone (qualquer formatação), **When** chega
   mensagem, **Then** a conversa vincula a ele, como hoje.
2. **Given** dois ou mais clientes com o mesmo telefone, **When** chega mensagem, **Then** a conversa
   fica **sem** vínculo e nenhum dos dois clientes a lê no portal.
3. **Given** nenhum cliente com aquele telefone, **When** chega mensagem, **Then** a conversa fica
   sem vínculo (não vira cliente nem lead nesta story).
4. **Given** conversa já vinculada a um cliente, **When** chega nova mensagem do mesmo contato,
   **Then** o vínculo existente é mantido (não é reatribuído por regra automática).

---

### User Story 7 - Operar sem armadilhas conhecidas (Priority: P3)

O produto não oferece ações que a experiência do TriviAtende provou perigosas e não expõe segredo em
nenhum lugar.

**Independent Test**: inspeção da tela, das respostas e dos logs.

**Acceptance Scenarios**:

1. **Given** uma versão de servidor marcada como afetada pelo defeito em que sair da sessão para de
   receber mensagens, **When** o administrador vê as ações do canal, **Then** **não** existe ação
   "reiniciar pareamento" por saída de sessão; aparece a orientação de reiniciar o servidor.
2. **Given** qualquer etapa (salvar servidor, criar instância, instalar webhook, QR, estado,
   webhook recebido), **When** se inspecionam resposta, log, banco e erro, **Then** não há chave do
   servidor, chave da instância, segredo do webhook, QR nem corpo de mensagem.

---

### User Story 8 - Anexos recebidos não somem (Priority: P2)

Quando o cliente envia imagem, documento, áudio ou vídeo, o Akros **guarda o arquivo** num
armazenamento privado, registra a mensagem na conversa (com a legenda, se houver) e a equipe consegue
abrir o anexo. O agente responde com a mensagem de encaminhamento à equipe, sem tentar interpretar o
arquivo. Figurinha vira um aviso em texto. Se o arquivo não puder ser baixado, a mensagem **ainda**
é registrada, marcada "anexo não baixado".

**Why this priority**: hoje (e no TriviAtende) imagem e documento são descartados em silêncio; para
imigração, o cliente costuma mandar documento pelo WhatsApp.

**Independent Test**: eventos de teste de imagem com legenda, documento, áudio, vídeo e figurinha;
conferir conversa, arquivo guardado, acesso da equipe e acesso negado ao cliente.

**Acceptance Scenarios**:

1. **Given** uma imagem ou documento recebido de contato identificado, **When** chega, **Then** a
   conversa ganha uma mensagem com o tipo, o nome do arquivo e a legenda; o arquivo fica guardado em
   área privada; a equipe abre o anexo; nenhum cliente o acessa pelo portal.
2. **Given** a mesma mídia reenviada pela Evolution, **When** chega de novo, **Then** não duplica
   mensagem nem arquivo.
3. **Given** um arquivo acima do limite de tamanho ou de tipo não permitido, **When** chega, **Then**
   a mensagem é registrada como "anexo não baixado" com o motivo, sem guardar o arquivo.
4. **Given** falha ao baixar o arquivo da Evolution, **When** chega, **Then** a mensagem é registrada
   como "anexo não baixado" e o evento **não** é perdido nem reentregue em laço.
5. **Given** o agente ativo, **When** chega anexo de contato identificado, **Then** o cliente recebe
   a mensagem de encaminhamento à equipe, sem custo de IA.
6. **Given** anexo de remetente sem telefone comprovado, **When** chega, **Then** é guardado na
   conversa "contato não identificado" e **não** recebe resposta.
7. **Given** uma figurinha, **When** chega, **Then** a conversa registra um aviso em texto
   ("figurinha recebida") e o agente envia a mensagem de encaminhamento, sem presumir significado.

### User Story 9 - Áudio do cliente vira texto (Priority: P2)

Quando o cliente manda um **áudio**, o Akros o guarda (US8) e, se a transcrição estiver ligada, o
transforma em texto: o agente entende o que foi dito e responde, e a equipe lê a conversa sem ouvir
cada áudio. O texto aparece marcado como transcrição automática. Se a transcrição não funcionar por
qualquer motivo, nada se perde: o áudio fica guardado, a conversa registra o motivo e o cliente
recebe o encaminhamento à equipe. A transcrição nasce **desligada** e só liga depois de o
administrador aceitar que o áudio sai do Akros e de a chave e o modelo serem verificados.

**Why this priority**: no WhatsApp o áudio é a forma principal de contato de muitos clientes; sem
transcrição o agente fica mudo exatamente com quem mais o usa.

**Independent Test**: provedor de transcrição falso; áudio com fala, sem fala, com falha do provedor,
com teto estourado, com a transcrição desligada, de remetente não identificado; conferir texto da
mensagem, marca de transcrição, resposta enviada e que a chave nunca aparece em registro, resposta
ou log.

**Acceptance Scenarios**:

1. **Given** a transcrição ligada e um áudio de contato identificado, **When** chega, **Then** a
   mensagem da conversa traz o texto falado marcado como transcrição automática, o áudio original
   continua guardado e o agente responde como a um texto.
2. **Given** um áudio transcrito que pede um humano ("quero falar com um advogado"), **When** chega,
   **Then** o cliente recebe o encaminhamento à equipe, sem custo de IA.
3. **Given** a transcrição desligada, **When** chega um áudio, **Then** o comportamento é o da US8
   (anexo + encaminhamento) e nenhum provedor é chamado.
4. **Given** falha do provedor, chave recusada, áudio sem fala, teto de gasto atingido ou
   configuração ilegível, **When** chega um áudio, **Then** o áudio fica guardado, a conversa registra
   o motivo (código, nunca texto do provedor), o cliente recebe o encaminhamento e o evento **não** é
   perdido nem reentregue em laço.
5. **Given** áudio de remetente sem telefone comprovado, **When** chega, **Then** o texto é guardado
   para a equipe e ninguém responde.
6. **Given** a mesma mensagem reentregue, **When** chega de novo, **Then** não é baixada nem
   transcrita de novo.
7. **Given** imagem, documento, vídeo ou áudio não baixado, **When** chega, **Then** nenhum provedor
   de transcrição é chamado.
8. **Given** o administrador sem aceite do envio de dados, ou sem chave e modelo verificados,
   **When** tenta ligar a transcrição, **Then** a função recusa; trocar provedor, modelo ou chave
   exige novo teste, e trocar de provedor exige novo aceite.

### Edge Cases

- Servidor Evolution fora do ar ao salvar, criar, instalar ou consultar: erro claro, nenhum avanço de
  estado, nada gravado pela metade além do que permite retomar.
- Servidor responde com versão ausente ou formato inesperado: tratado como incompatível.
- Redirecionamento do servidor para outro endereço: recusado.
- Duas pessoas administradoras configurando o mesmo canal ao mesmo tempo: a segunda operação não
  duplica instância nem sobrescreve segredo sem aviso.
- Evento com corpo maior que o limite ou que não é JSON: recusado sem processar.
- Telefone com formatos diferentes (com `+`, espaços, nono dígito): comparado pela forma canônica.
- Reenvio de evento muito tempo depois do original: continua sem duplicar.
- Chave do servidor trocada no servidor: a próxima chamada falha de forma clara e o administrador
  pode atualizar a chave sem recriar a instância.
- Áudio muito longo ou sem fala (silêncio, ruído): a transcrição pode vir vazia ou errada; vazia vira
  "sem fala reconhecida" e cai no encaminhamento; o texto sempre carrega o aviso "pode conter erros".
- Transcrição maior que o limite de uma mensagem: é cortada (nunca recusada pelo registro, o que
  faria a Evolution reentregar para sempre).
- Provedor demora: a espera tem teto; estourado, cai no encaminhamento.
- Canal desativado pelo administrador: as mensagens continuam sendo registradas (a equipe as vê) e o
  agente não responde; só canal apagado ou sem credencial recusa o evento.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que **somente administrador** configure servidor, instância,
  webhook, pareamento e aceite de risco; qualquer outro papel ou usuário anônimo MUST ser recusado,
  inclusive com identificador de papel forjado no corpo.
- **FR-002**: O sistema MUST validar o endereço do servidor antes de qualquer chamada: exigir HTTPS,
  recusar credencial embutida, consulta e fragmento, recusar rede privada, loopback, link-local e
  endereço de metadados, revalidar o endereço resolvido a cada chamada externa e recusar
  redirecionamento.
- **FR-003**: O sistema MUST medir a versão do servidor e compará-la com uma **matriz de
  compatibilidade** que lista, por versão, as capacidades **provadas**. Para aceitar instâncias são
  obrigatórias cinco, provadas pelo smoke numa instância efêmera sem número pareado: criar instância,
  QR, estado de conexão, webhook com cabeçalho e eventos do webhook. Versão ausente da matriz ou com
  capacidade faltando MUST bloquear a criação de instância e explicar o motivo. O **envio de texto**
  só se prova com número pareado: MUST ser provado pela mensagem de teste do produto (ou pelo smoke com
  instância pareada) e é condição para **ativar** o canal (FR-028).
- **FR-004**: A matriz de compatibilidade MUST poder ser consultada e atualizada pelo administrador
  sem alterar código, e cada alteração MUST ser auditada. Nenhuma versão entra sem evidência de
  smoke de contrato.
- **FR-005**: O sistema MUST criar a instância de forma **idempotente**, com nome derivado do canal
  (nunca escolhido pelo navegador); se o nome já existir no servidor, MUST recuperar o acesso da
  instância existente.
- **FR-006**: O sistema MUST instalar o webhook com: endereço do canal, segredo próprio de pelo menos
  256 bits em cabeçalho, eventos de QR, conexão, mensagens recebidas, atualização de mensagens e
  envio, e **sem** conteúdo de mídia em base64.
- **FR-007**: O sistema MUST **reler** o webhook no servidor após instalar e só avançar o estado se
  endereço, segredo (cabeçalho), conjunto de eventos e opções conferirem exatamente.
- **FR-008**: O sistema MUST manter estados do canal: sem credencial, configuração incompleta,
  aguardando pareamento, conectado e verificado, desconectado e erro, e MUST mostrá-los ao
  administrador com o motivo da última falha.
- **FR-009**: Falha entre qualquer par de etapas MUST deixar o canal em "configuração incompleta" com
  ação de retomar; MUST NOT apagar recursos remotos automaticamente nem ativar o canal.
- **FR-010**: O QR Code MUST existir apenas em memória, com validade curta e uso único, MUST NOT ser
  gravado em banco, log ou resposta persistida, e MUST NOT ser gerado sem o aceite de risco
  registrado.
- **FR-011**: O estado "conectado e verificado" MUST exigir que o número efetivamente pareado seja
  igual ao número cadastrado no canal; número divergente MUST ser recusado e explicado.
- **FR-012**: O webhook MUST autenticar a chamada (segredo do canal, comparação em tempo constante)
  **antes** de ler ou interpretar o corpo, MUST limitar o tamanho do corpo, MUST exigir JSON e MUST
  responder o mínimo ao provedor, sem expor o motivo da recusa.
- **FR-013**: O canal MUST ser identificado por um identificador público na rota do webhook; evento
  de canal inexistente, apagado ou sem credencial MUST ser recusado e MUST NOT cair em canal
  padrão. Canal **desativado** (ativa=falso) ou ainda não conectado continua REGISTRANDO as mensagens
  (spec 003, US1.4) e MUST NOT responder.
- **FR-014**: O sistema MUST deduplicar mensagens recebidas por canal e identificador do provedor, de
  modo que reentrega não duplique mensagem nem resposta.
- **FR-015**: O webhook MUST tratar eventos de conexão e de QR atualizando o estado do canal, sem
  criar mensagem, e MUST reconhecer (sem erro) os eventos de atualização e envio.
- **FR-016**: O sistema MUST ignorar sem erro e sem resposta do agente: mensagem de grupo, mensagem
  da própria conta, reação e mensagem apagada. Nenhum outro tipo de mensagem MAY ser descartado em
  silêncio (ver FR-026).
- **FR-017**: Para remetente identificado por código interno (LID), o sistema MUST obter o telefone
  somente de campo alternativo do próprio evento ou de par comprovado no histórico da mesma
  instância; MUST normalizar sufixo de dispositivo; MUST recusar telefones conflitantes; MUST NOT
  usar nome ou foto como prova.
- **FR-018**: O vínculo conversa–cliente MUST ocorrer apenas quando houver **exatamente um** cliente
  com o telefone (comparação canônica); com zero ou mais de um, a conversa MUST ficar sem vínculo e
  MUST NOT ser visível a nenhum cliente no portal. Vínculo existente MUST NOT ser reatribuído
  automaticamente.
- **FR-019**: O sistema MUST NOT oferecer ação de reiniciar pareamento por saída de sessão quando a
  versão do servidor estiver marcada na matriz como afetada, e MUST mostrar a orientação de
  reiniciar o servidor.
- **FR-020**: Nenhum segredo (chave do servidor, chave da instância, segredo do webhook), QR ou corpo
  de mensagem MAY aparecer em resposta de API, log, evento, erro, banco de negócio ou auditoria; a
  chave do servidor e a da instância MUST ficar no cofre, e o banco guarda só referência e os 4
  últimos caracteres.
- **FR-021**: Todas as funções públicas novas MUST ter limite de uso, entrada validada em formato
  fechado (campo desconhecido é recusado) e, quando chamadas pelo navegador, proteção contra
  requisição forjada.
- **FR-022**: Todas as telas novas MUST ter texto em PT-BR e EN, sem texto fixo no componente.
- **FR-023**: O sistema MUST permitir mais de um número Evolution (um canal por número) no mesmo
  servidor, sem misturar conversa, segredo ou estado entre canais.
- **FR-024**: Cada Acceptance Scenario MUST ter teste executável; o contrato com a Evolution MUST ser
  provado em **smoke contra o servidor real** antes de o agente ser ligado nesse canal.
- **FR-025**: Mensagem de texto de remetente sem telefone comprovado MUST ser guardada, em conversa
  marcada "contato não identificado", visível apenas à equipe, sem vínculo com cliente e sem resposta
  do agente; MUST ser deduplicada como as demais; MUST NOT ser mesclada automaticamente a outra
  conversa.
- **FR-026**: Anexo recebido (imagem, documento, áudio, vídeo) MUST ser registrado na conversa com
  tipo, nome, tipo de arquivo, tamanho e legenda; o arquivo MUST ser guardado em área privada com
  limite de tamanho e lista de tipos permitidos; a equipe (administrador) MUST conseguir abri-lo por
  link temporário; nenhum cliente MAY acessá-lo. Falha de download, tamanho excedido ou tipo não
  permitido MUST registrar a mensagem como "anexo não baixado" com o motivo, nunca descartá-la.
- **FR-027**: Para anexo de contato identificado, com agente e canal ativos, o sistema MUST enviar a
  mensagem de encaminhamento à equipe, sem chamar o modelo de IA; para contato não identificado,
  MUST NOT responder. Figurinha MUST virar aviso em texto.
- **FR-028**: O administrador MUST poder enviar uma mensagem de teste, por um canal conectado e verificado, a
  um número **diferente** do canal; o sucesso registra o envio como provado na versão do servidor, e
  sem essa prova o canal MUST NOT poder ser ativado. Ativar/desativar o canal e vincular o agente que o
  atende são ações do administrador, nunca do cliente.

- **FR-029**: Com a transcrição ligada, áudio baixado e guardado MUST ser transcrito antes de
  registrar a mensagem; o texto MUST virar o texto da mensagem, marcado como transcrição automática,
  e o agente MUST atendê-lo como a um texto. O áudio original MUST continuar guardado.
- **FR-030**: Falha de transcrição (provedor, chave, áudio sem fala, teto de gasto, configuração)
  MUST NOT descartar nem reentregar a mensagem: MUST registrar o motivo como código (nunca texto do
  provedor, do cliente ou chave) e seguir o caminho do anexo (encaminhamento à equipe, sem IA).
  Só áudio baixado MUST ser transcrito; reentrega MUST NOT transcrever de novo.
- **FR-031**: A configuração da transcrição MUST ser única por instalação, com provedor e modelo
  numa lista fechada, endereços fixos no código e chave só no cofre (a tela guarda só 4 caracteres).
  Ligar MUST exigir aceite explícito do envio de áudio ao provedor (por provedor) E chave+modelo
  verificados; mudar provedor, modelo ou chave MUST derrubar a verificação e desligar. Rejeição
  definitiva (chave, modelo) MUST desligar; indisponibilidade passageira MUST NOT.
- **FR-032**: O gasto MUST ter teto por hora (fail-closed); estourá-lo MUST seguir FR-030.
- **FR-033**: A tela de Comunicação MUST mostrar o texto transcrito com o aviso de transcrição
  automática e, na falha, "transcrição indisponível" com o motivo, em PT-BR e EN.

### Key Entities

- **Servidor Evolution**: endereço, versão detectada, estado de compatibilidade (pendente,
  compatível, incompatível) com motivo, referência da chave no cofre e 4 últimos caracteres.
- **Matriz de compatibilidade**: por versão, as capacidades provadas e se a versão é afetada pelo
  defeito de saída de sessão; editável e auditada.
- **Conta de canal (Evolution)**: nome, número cadastrado, estado de conexão, motivo da última falha,
  ativa ou não; liga-se a uma instância.
- **Instância**: nome remoto derivado do canal, referência da chave no cofre, referência do segredo
  do webhook, momento do aceite de risco.
- **Evento de webhook**: tipo, identificador do provedor, canal; reconhecido uma única vez.
- **Conversa**: identificada por conta de canal e contato externo; pode ter ou não vínculo com
  cliente.
- **Identidade do remetente**: telefone canônico, comprovado por evento ou histórico; ou ausente.
- **Transcrição de áudio (configuração)**: provedor, modelo, idioma, referência da chave no cofre e 4
  últimos caracteres, aceite do envio de dados, momento da verificação e se está ligada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa administradora conecta um número novo (servidor já configurado) e vê
  "conectado e verificado" em até **10 minutos**, sem abrir o painel da Evolution.
- **SC-002**: Em **100%** dos testes de falha induzida (webhook não aplicado, queda no meio, nome
  existente, servidor fora do ar, número divergente), o canal **não** é declarado conectado
  indevidamente e o administrador vê o motivo.
- **SC-003**: **0** mensagens duplicadas e **0** respostas duplicadas em 20 reenvios do mesmo evento.
- **SC-004**: **100%** dos eventos sem segredo válido são recusados antes de qualquer leitura de
  conteúdo, em teste automatizado.
- **SC-005**: **0** ocorrências de segredo, QR ou corpo de mensagem em respostas, logs, banco e
  auditoria, comprovado por varredura automatizada.
- **SC-006**: Com dois clientes de mesmo telefone, **0** deles acessa a conversa no portal, e a
  equipe acessa.
- **SC-007**: No smoke contra o servidor Evolution real, as cinco capacidades obrigatórias são
  provadas e registradas na matriz antes do primeiro uso, e o envio é provado pela mensagem de teste
  antes de ativar o canal.
- **SC-008**: Mensagem de texto real enviada ao número de teste conectado aparece na conversa certa
  em até **10 segundos** em 95% dos casos de teste.
- **SC-009**: **0** mensagens recebidas descartadas em silêncio: todo evento de mensagem individual
  vira mensagem na conversa (inclusive "contato não identificado" e "anexo não baixado"), medido por
  teste automatizado sobre todos os tipos de mensagem.

- **SC-010**: Em teste automatizado com provedor falso, **100%** dos áudios com transcrição ligada
  viram texto atendido pelo agente, e **100%** das falhas induzidas (provedor, chave, sem fala, teto,
  configuração) preservam o áudio, registram o motivo e enviam o encaminhamento; **0** ocorrências da
  chave do provedor em registro, resposta ou log. Com áudio real, o texto transcrito de uma voz de
  WhatsApp aparece na conversa (homologação).

## Assumptions

- O Akros é single-tenant (ADR-0009): existe **um** servidor Evolution por instalação, com vários
  números (canais).
- O servidor Evolution do Akros é **novo** e sua versão ainda é desconhecida; a versão-alvo é medida
  no primeiro passo (smoke de contrato) e define a matriz inicial. Versão não provada bloqueia.
- O contrato observado no TriviAtende (versão 2.3.3) serve de **hipótese**, não de fato, para o
  servidor do Akros.
- O servidor é acessível por HTTPS público e resolve para endereço público.
- Contas de canal Evolution já cadastradas pelo fluxo antigo (instância criada fora) **não** estão em
  produção (STATE: nada exercitado); o novo fluxo não precisa "anexar" instância existente.
- Análise de conteúdo de anexo, contato desconhecido virar lead e Meta/Instagram **ficam fora** desta
  story. Anexos são **guardados e mostrados**, não interpretados; só o **áudio** é transcrito, e só
  se a transcrição estiver ligada (US9, ADR-0022).
- A transcrição usa um provedor externo (Groq ou OpenRouter): o áudio do cliente sai do Akros. Nasce
  desligada; o contrato de dados do provedor é decisão do escritório antes de ligar.
- A saída continua como hoje (resposta enviada pelo próprio webhook); retry, saúde do canal e resposta
  humana são E13-S16.
- A sessão, o CSRF, o limite de uso e o Vault existentes são reaproveitados.

### Out of Scope (vinculante)

- Saída durável (outbox, retry, resultado incerto), saúde do canal e resposta humana (E13-S16).
- WhatsApp oficial (Meta) e Instagram.
- Análise do conteúdo de anexos por IA e transcrição de vídeo.
- Criar lead automaticamente para contato desconhecido.
- Vincular manualmente conversa a cliente pela equipe e mesclar conversa "contato não identificado"
  a outra (a conversa fica visível à equipe; vínculo e mescla manuais são outra story).
- Migração de contas já existentes.
