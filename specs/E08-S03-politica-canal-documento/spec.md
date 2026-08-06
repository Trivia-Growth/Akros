---
name: SPEC
description: Documento que chega pelo WhatsApp é registrado e redirecionado ao canal registrável, nunca perdido nem bloqueado.
story: E08-S03
tier: pequeno
alwaysApply: false
---

# SPEC — Política de canal para documentos (E08-S03)

## User Story
Como **Natalia**, quero **que documento enviado pelo WhatsApp seja capturado e redirecionado ao
canal com registro**, para que **eu pare de perder documento em conversa e pare de brigar com o
cliente sobre isso**.

## Contexto
A regra existe hoje e é humana: a Natalia pede para mandar por e-mail. O sistema pode assumir
isso. Duas coisas que **não** podem acontecer: bloquear o envio (cria fricção onde a Akros não
quer) e ignorar o anexo (perde documento).

## Acceptance Criteria

### AC-1: Anexo do WhatsApp é sempre registrado
```gherkin
Given  um cliente que envia um arquivo pelo WhatsApp
When   a mensagem chega
Then   o evento é registrado na timeline com o anexo
And    o anexo fica acessível à equipe, mesmo antes de qualquer redirecionamento
```

### AC-2: Redirecionamento com motivo, em uma frase
```gherkin
Given  um anexo recebido pelo WhatsApp
When   o sistema responde ao cliente
Then   ele recebe um atalho para enviar o mesmo documento pelo portal
And    recebe o motivo em uma frase, sem tom de reprimenda
And    o atalho já abre no item de checklist correspondente, quando dá para inferir
```

### AC-3: Equipe vê a pendência de canal
```gherkin
Given  um anexo recebido pelo WhatsApp e ainda não reenviado pelo portal
When   a equipe olha o caso
Then   vê um indicador de "documento fora do canal registrável"
And    consegue, ela mesma, promover o anexo a documento do checklist quando fizer sentido
```

### AC-4: Reenvio fecha a pendência
```gherkin
Given  uma pendência de canal aberta
When   o cliente reenvia pelo portal
Then   a pendência é encerrada
And    a timeline mostra os dois eventos ligados: o anexo original e o envio formal
```

### AC-5: Sem bloqueio, em nenhum caminho
```gherkin
Given  qualquer configuração da política
When   o cliente insiste em usar o WhatsApp
Then   ele nunca é impedido de enviar
And    nenhuma etapa da jornada trava por causa do canal usado
```

### AC-6: i18n + impeccable
```gherkin
Given  as mensagens da política
When   troco idioma / avalio design
Then   traduz; o tom permanece de ajuda, não de regra; impeccable passa
```

## Out of Scope
- Configurar a política por tipo de documento no admin — backlog.
- Assinatura de recebimento pelo cliente.

## Notas de implementação
- Depende de E08-S01 (timeline) e conversa com E07 (o documento promovido dispara análise).
- Redação das mensagens: pedir revisão da Natalia — é a voz da Akros falando com o cliente.
