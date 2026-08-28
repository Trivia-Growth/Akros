---
name: SPEC
description: Cliente 360 abre a thread inteira (WhatsApp/e-mail) em modal; portal do cliente deixa de reexibir mensageria externa na timeline.
story: E04-S16
tier: pequeno
alwaysApply: false
---

# SPEC — Conversas: abrir thread completa + portal sem mensageria externa (E04-S16)

## User Story
Como **admin**, quero **clicar numa conversa do Cliente 360 e ver a thread inteira**, e como
**cliente**, **não preciso reler no portal o que eu mesmo escrevi no WhatsApp/e-mail** — só
quero ver o histórico de sistema (fase liberada, documento analisado) e o chat do portal.

## Contexto
Corrige duas coisas da E04-S13 (que juntou WhatsApp+e-mail num feed só): (1) o feed flat
dificultava ver "a conversa" como unidade, e (2) o portal do cliente (`MensagensPage`, E08-S02)
usava o mesmo `useTimeline` e acabava reexibindo WhatsApp/e-mail pro próprio cliente.

## Acceptance Criteria

### AC-1: Lista de conversas, não feed misturado
```gherkin
Given o Cliente 360, aba "Conversas"
When abro a aba
Then vejo uma linha por conversa — a conversa de WhatsApp (se houver) e uma linha por thread
     de e-mail — cada uma com prévia da última mensagem e contagem
```

### AC-2: Abrir mostra a thread inteira
```gherkin
Given a lista de conversas
When clico numa linha
Then abre um modal com todas as mensagens daquela conversa/thread, na renderização certa pro
     canal (bolhas de mídia rica pro WhatsApp, cartões De/Assunto pro e-mail)
And consigo responder ali mesmo, sem sair do Cliente 360
```

### AC-3: Portal do cliente não reexibe mensageria externa
```gherkin
Given /portal/mensagens
When abro a página
Then vejo só o chat do portal e eventos de sistema (fase liberada, documento analisado, pagamento
     confirmado…)
And nenhuma mensagem de WhatsApp ou e-mail aparece ali — o cliente já sabe o que escreveu por lá
```

## Out of Scope
- Composer rico (emoji/anexo/áudio) dentro do modal do Cliente 360 — fica só no inbox dedicado
  (`/admin/comunicacao`); aqui é leitura + resposta de texto simples.

## Notas de implementação
- `MensagemBubble` e `EmailThreadPane` (`ComunicacaoPage.tsx`) viraram exports — reaproveitados
  no modal do Cliente 360 em vez de duplicar a renderização de bolha/e-mail.
- `MensagensPage.tsx` (portal) filtra o resultado de `useTimeline` por `canal !== "whatsapp" &&
  canal !== "email"` antes de renderizar.
