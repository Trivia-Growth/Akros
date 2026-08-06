---
name: checklist-impeccable-E04-S01-whatsapp-evidence
description: Checklist impeccable preenchido para a story.
alwaysApply: false
---

# Checklist Impeccable — Integrações mockadas (E04-S01/S02/S03/S04)

Checklist consolidado — WhatsApp Inbox, Agente IA, Agenda integrada, Transcrições Fireflies.

## 1. Spacing & Alignment
- [x] Inbox: layout 2 colunas (lista 300px fixo + thread flexível) — padrão familiar de apps de chat
- [x] Config do agente: 2 colunas (formulário + área de teste) — separa edição de validação

## 2. Typography
- [x] Padrão title/subtitle mantido nas 2 novas páginas (Comunicação, Agenda admin)

## 3. Color & Contrast
- [x] Bolhas de mensagem: cliente=cream (recebido), agente_ia=gold-50 (diferenciado), humano=navy-50
  (enviado) — três tons distintos mas na mesma família, sem poluição visual
- [x] Badge "Atendido por IA" em navy com ícone Bot — identifica origem sem exagero

## 4. Interaction & Animation
- [x] Inbox: Enter envia mensagem (atalho de teclado padrão de chat)
- [x] Teste do agente: resposta aparece inline, badge de handoff quando aplicável
- [x] Sincronização de agenda: loading state + toast de sucesso (mock com delay de 800ms
  para parecer uma operação real)

## 5. Consistency & Details
- [x] Reusa Tabs/Card/Badge/Avatar/Modal do design system nas 4 stories
- [x] Ícones únicos (lucide): Bot, Send, CalendarClock, CheckCircle2, RefreshCw, FileAudio

## Fidelidade ao pedido original
- [x] WhatsApp: 2 canais mockados (oficial + Evolution) — canal exibido por conversa
- [x] Agente IA: janelas de atendimento, tópicos configuráveis, handoff — espelha o mock de
  `agente-ia.ts` (E00-S04), UI apenas expõe o que já existia no domínio
- [x] Agenda integrada: status Gmail/Outlook mockado, sincronização simulada
- [x] Fireflies: transcrição com resumo + action items, badge "Fireflies" como fonte,
  já anexada à visão 360 do cliente desde E03-S02 (aba Conversas/Reuniões)

## Extensão de nav
- Item "Agenda" adicionado ao AdminLayout (nav antes só tinha Dashboard/Leads/Clientes/
  Propostas/Comunicação) — necessário para acomodar E04-S03/S04 sem sobrecarregar a
  página de Comunicação com conteúdo não relacionado a mensageria.

## Peer Review
- [ ] Revisão visual em browser real — pendente (extensão Chrome indisponível nesta sessão)

## Gate executável
- 6 novos testes em `mocks/comunicacao-actions.test.ts`: envio de mensagem, conversa anexada
  ao cliente, config do agente (leitura/escrita), simulação com/sem handoff, transcrição
  anexada como evidência. Total 38 testes, todos verdes.

---

## 🎉 ROADMAP COMPLETO
Todas as stories de E00 a E04 foram implementadas: fundação, site institucional (7),
portal do cliente (7), painel admin (5), integrações mockadas (4), impersonação/demo (2).
Protótipo completo e navegável em localhost, pronto para demo ao cliente Akros.
