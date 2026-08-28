---
name: SPEC
description: Inbox WhatsApp com imagem, áudio (gravar/ouvir/transcrever), anexo e emoji; aba E-mail com estrutura de e-mail em vez de chat.
story: E04-S14
tier: pequeno
alwaysApply: false
---

# SPEC — Inbox com mídia rica + e-mail com estrutura de e-mail (E04-S14)

## User Story
Como **atendente/admin**, quero **atender pelo inbox como atenderia pelo WhatsApp de verdade**
(foto, áudio, anexo, emoji) **e ler e-mail com cara de e-mail**, para que **o produto não pareça
uma versão capada do que já uso todo dia**.

## Contexto
Estende `E04-S01` (inbox WhatsApp) e `E04-S12` (aba E-mail). `Mensagem` ganha tipo — sem quebrar
o que já existe (`tipo` ausente = texto, comportamento idêntico).

## Acceptance Criteria

### AC-1: Ver imagem, áudio e anexo recebidos
```gherkin
Given uma conversa com mensagem tipo imagem/áudio/arquivo
When abro a conversa
Then vejo o balão correto pra cada tipo — miniatura pra imagem, player com forma de onda e
     duração pro áudio, ícone+nome pro arquivo
```

### AC-2: Transcrever áudio
```gherkin
Given uma mensagem de áudio sem transcrição ainda
When clico em "Transcrever áudio"
Then o texto transcrito aparece abaixo do player (determinístico, vindo da fixture)
```

### AC-3: Enviar áudio, anexo e emoji
```gherkin
Given a conversa aberta
When clico no microfone, gravo e paro
Then uma mensagem de áudio nova aparece na conversa, com a duração gravada
And o mesmo vale pra anexar um arquivo do computador (vira imagem/áudio/arquivo pelo tipo do
    arquivo) e pra inserir um emoji no texto antes de enviar
```

### AC-4: Aba E-mail tem estrutura de e-mail, não de chat
```gherkin
Given a aba E-mail em /admin/comunicacao
When abro uma thread
Then cada mensagem aparece como um cartão com remetente/endereço/data no cabeçalho — não como
     bolha colorida alinhada esquerda/direita
And o compositor de resposta mostra "Para"/"Assunto" antes do corpo, como um e-mail de verdade
```

## Out of Scope
- Gravação de áudio real (mic) e reprodução de áudio real — mockado (mesma disciplina de "sem
  persistir binário" do E02-S03).
- OAuth real do Gmail/Microsoft Graph pra e-mail — ver nota de viabilidade em
  `specs/E04-S12-email-unificado-arquivos/design.md`.
