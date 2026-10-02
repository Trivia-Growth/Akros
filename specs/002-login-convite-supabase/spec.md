# Feature Specification: Login real só por convite

**Story**: E12-S04
**Feature Branch**: `feat/E12-S04-login-convite-supabase`
**Created**: 2026-10-01
**Status**: Draft
**Input**: "Começar a deixar o produto operacional: um caminho para um login real que nasça limpo e
permita usar o produto de forma real. Login com Supabase agora (e-mail e senha), Google e Microsoft
depois."

Ajustes de `docs/epics/AJUSTES.md` que esta feature absorve: A-08 (cadastro público aberto),
A-09 (cliente convertido sem como entrar) e A-11 (configuração do Auth de desenvolvimento).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin convida uma pessoa e ela entra (Priority: P1)

Um administrador informa o e-mail de uma pessoa e o papel dela (administrador ou cliente). Para um
cliente, o convite aponta para um cadastro de cliente que já existe (por exemplo, um lead
convertido). A pessoa recebe um e-mail, define a própria senha e entra já com o papel certo, vendo
só o que o papel permite.

**Why this priority**: sem isso ninguém além das duas contas criadas à mão consegue usar o produto;
é o que hoje impede um cliente real de entrar (A-09).

**Independent Test**: convidar um e-mail novo como cliente de um cadastro existente, abrir o e-mail,
definir a senha e confirmar que o portal abre com os dados desse cliente e nenhum outro.

**Acceptance Scenarios**:

1. **Given** um administrador autenticado e um cadastro de cliente sem acesso, **When** ele convida
   o e-mail do cliente, **Then** o convite é registrado, o e-mail é enviado e o cadastro passa a
   mostrar "convite enviado".
2. **Given** um convite válido, **When** a pessoa abre o link e define uma senha aceita pelas regras,
   **Then** ela entra no portal do cliente vinculado ao cadastro que foi indicado no convite.
3. **Given** um convite de administrador, **When** a pessoa aceita, **Then** ela entra no painel
   admin e não no portal do cliente.
4. **Given** um usuário que não é administrador, **When** ele tenta convidar alguém, **Then** a ação
   é recusada e nada é criado.

---

### User Story 2 - Ninguém se cadastra sozinho (Priority: P1)

Quem não foi convidado não consegue criar conta, nem entrar, nem ler dado algum, mesmo chamando o
serviço de autenticação diretamente, sem passar pela tela.

**Why this priority**: o cadastro público está aberto hoje (A-08); qualquer pessoa com um e-mail
consegue virar usuário autenticado.

**Independent Test**: tentar criar conta com um e-mail qualquer, pela tela e pela API, e confirmar
que é recusado.

**Acceptance Scenarios**:

1. **Given** um e-mail que nunca foi convidado, **When** alguém tenta criar conta, **Then** a criação
   é recusada.
2. **Given** um e-mail que nunca foi convidado, **When** alguém tenta entrar, **Then** a resposta é
   a mesma de senha errada, sem revelar se o e-mail existe.
3. **Given** uma conta existente de antes desta feature (administrador ou cliente), **When** a
   pessoa entra com a senha atual, **Then** continua entrando normalmente.

---

### User Story 3 - Primeiro administrador de um sistema novo (Priority: P2)

Num ambiente novo, sem nenhum usuário, o sistema permite ativar o primeiro administrador a partir de
um e-mail autorizado em configuração, uma única vez, sem depender de conta pré-existente. Depois
disso, todo acesso novo vem por convite de um administrador.

**Why this priority**: é o que faz o sistema "nascer limpo" sem que alguém precise criar usuário à
mão no banco; mas o ambiente atual já tem um administrador, então não bloqueia o uso hoje.

**Independent Test**: num ambiente sem usuários, ativar o administrador inicial e confirmar que o
mesmo caminho recusa uma segunda ativação.

**Acceptance Scenarios**:

1. **Given** um ambiente sem nenhum administrador e um e-mail na lista de administradores iniciais,
   **When** esse e-mail ativa a conta, **Then** ele passa a ser administrador.
2. **Given** um ambiente que já tem um administrador, **When** alguém tenta repetir a ativação
   inicial, **Then** é recusado.
3. **Given** um e-mail que não está na lista de administradores iniciais, **When** tenta a
   ativação inicial, **Then** é recusado.

---

### User Story 4 - Gerenciar convites e acessos (Priority: P2)

O administrador reenvia um convite que não chegou ou expirou, cancela um convite pendente e
revoga o acesso de quem já entrou.

**Why this priority**: sem isso um erro de digitação ou uma saída de cliente deixa acesso sobrando ou
convite perdido.

**Independent Test**: convidar, cancelar, tentar usar o link e confirmar que falha; revogar uma conta
ativa e confirmar que a sessão deixa de valer.

**Acceptance Scenarios**:

1. **Given** um convite pendente, **When** o administrador o reenvia, **Then** o link anterior deixa
   de valer e um novo é enviado.
2. **Given** um convite pendente, **When** o administrador o cancela, **Then** abrir o link falha com
   mensagem clara e nenhum acesso é criado.
3. **Given** um convite expirado, **When** a pessoa abre o link, **Then** vê a explicação e como
   pedir um novo.
4. **Given** um usuário ativo, **When** o administrador revoga o acesso, **Then** ele não consegue
   mais entrar nem renovar a sessão em andamento.
5. **Given** a lista de acessos, **When** o administrador a abre, **Then** vê, por pessoa, e-mail,
   papel, estado (convidado, ativo, revogado) e quando o convite expira.

---

### User Story 5 - Configuração de autenticação pronta para produção (Priority: P2)

Os links enviados por e-mail apontam para o endereço real do produto (não para localhost), a senha
exige um mínimo mais forte e rejeita senhas conhecidas por vazamento.

**Why this priority**: sem isso o convite chega com link quebrado e as contas nascem com senha fraca
(A-11).

**Independent Test**: enviar um convite e abrir o link a partir do e-mail real; tentar definir uma
senha vazada e uma curta.

**Acceptance Scenarios**:

1. **Given** um convite enviado, **When** o e-mail é aberto, **Then** o link leva ao domínio do
   produto e conclui o cadastro da senha.
2. **Given** a tela de definir senha, **When** a pessoa informa senha curta ou presente em listas de
   vazamento, **Then** é recusada com a razão.

---

### User Story 6 - Esqueci minha senha (Priority: P3)

[NEEDS CLARIFICATION: "Esqueci minha senha" entra nesta story ou fica para depois? Com e-mail e
senha mantidos, a pessoa que perde a senha hoje fica sem caminho, a não ser que o administrador
reenvie um convite.]

**Acceptance Scenarios**:

1. **Given** uma conta ativa, **When** a pessoa pede recuperação, **Then** recebe um link de uso único
   para definir nova senha, e a resposta não revela se o e-mail existe.

### Edge Cases

- E-mail convidado já tem conta ativa: o convite é recusado com instrução de entrar normalmente.
- E-mail digitado com maiúsculas ou espaços: tratado como o mesmo e-mail.
- Link de convite aberto duas vezes, ou depois de a senha já definida: recusado, sem criar segunda conta.
- Convite de cliente para um cadastro inexistente ou já vinculado a outra conta: recusado.
- Administrador que revoga a si mesmo, ou o último administrador ativo: bloqueado.
- Muitos convites em sequência para o mesmo e-mail ou pelo mesmo administrador: limitado.
- Papel de um usuário nunca vem de dado que o próprio usuário consiga alterar.
- Falha no envio do e-mail: o convite fica registrado como "não entregue" e pode ser reenviado, sem duplicar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST recusar criação de conta por quem não foi convidado, inclusive por
  chamada direta ao serviço de autenticação.
- **FR-002**: Um administrador MUST poder convidar um e-mail com papel de administrador ou de
  cliente; convite de cliente MUST apontar para um cadastro de cliente existente e ainda sem acesso.
- **FR-003**: Quem aceita o convite MUST definir a própria senha e entrar com o papel e o vínculo
  definidos no convite; o papel MUST NOT ser alterável pelo próprio usuário.
- **FR-004**: Convites MUST expirar, MUST ser de uso único e MUST poder ser reenviados (invalidando o
  anterior) ou cancelados pelo administrador.
- **FR-005**: O administrador MUST poder revogar o acesso de uma conta ativa; a revogação MUST
  impedir novo login e renovação de sessão.
- **FR-006**: O sistema MUST impedir revogar o último administrador ativo e MUST impedir o
  administrador de remover o próprio acesso.
- **FR-007**: O sistema MUST permitir ativar o primeiro administrador de um ambiente vazio a partir
  de uma lista de e-mails autorizados em configuração, uma única vez.
- **FR-008**: Contas existentes antes desta feature MUST continuar entrando com a senha atual.
- **FR-009**: A resposta de login e de recuperação MUST NOT revelar se um e-mail está cadastrado.
- **FR-010**: Os links dos e-mails MUST apontar para o endereço real do produto e a senha MUST
  respeitar mínimo reforçado e recusar senhas vazadas.
- **FR-011**: O envio e o reenvio de convites MUST ter limite de uso e MUST ficar registrados para
  auditoria (quem convidou, para quem, papel, quando, estado).
- **FR-012**: A lista de acessos MUST ser visível só para administradores.
- **FR-013**: [NEEDS CLARIFICATION: recuperação de senha nesta story? — ver User Story 6]

### Key Entities

- **Convite**: e-mail, papel, cadastro de cliente (quando o papel é cliente), quem convidou, estado
  (pendente, aceito, cancelado, expirado, não entregue), validade.
- **Acesso**: a conta de uma pessoa, com papel, vínculo ao cadastro de cliente e estado (ativo,
  revogado).
- **Administrador inicial**: lista de e-mails autorizados a ativar o primeiro administrador.

### Assumptions

- A autenticação segue sendo o Supabase Auth com e-mail e senha; Google e Microsoft entram numa
  story seguinte como provedores adicionais, sem refazer convite nem papéis.
- Validade padrão do convite: 7 dias.
- Existem só dois papéis, administrador e cliente (ADR-0009).
- O produto é de um único cliente final, a Akros; não há multi-organização (ADR-0009).
- O envio de e-mail usa o serviço de e-mail do Supabase; limites desse serviço podem exigir um
  provedor próprio em volume maior (decisão de plano, não de spec).
- A flag de modo demo continua como hoje; esta feature atua só no caminho real.

### Out of Scope (vinculante)

- Login com Google e Microsoft (story seguinte).
- Isolar o mock em build separado e apagar os dados de teste do Supabase.
- Corrigir as policies de UPDATE do cliente e de leitura aberta de `dados_recebimento`/`programas`
  (A-02, parte de A-08): story própria.
- Trocar as variáveis do site no Netlify (A-01): ação de @devops.
- Renovação automática do token de acesso (A-06/A-07): story própria.
- Autenticação em dois fatores.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um administrador convida um cliente e o cliente entra no portal, do convite à primeira
  tela, em menos de 3 minutos sem ajuda.
- **SC-002**: 0 contas criadas sem convite, verificado por tentativa de criação pela tela e pela API.
- **SC-003**: 100% das contas anteriores continuam entrando.
- **SC-004**: 100% dos links de convite enviados abrem no domínio do produto.
- **SC-005**: Um cliente convidado vê só o cadastro vinculado, em 100% das tentativas de leitura
  cruzada testadas.
