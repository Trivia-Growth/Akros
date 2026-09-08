---
name: DESIGN
description: Declaração documental (Invariante 4, E00-S06) do modo degradado do canal WhatsApp — a story é pequeno e não tinha design.md; este arquivo existe para a declaração verificável por scripts/check-degraded-mode.mjs.
story: E04-S01
integracoes: [whatsapp]
alwaysApply: false
---

# DESIGN — Inbox WhatsApp (E04-S01)

Story de tier pequeno — o spec.md segue sendo o contrato. Este design.md existe para declarar o
modo degradado do canal, exigência documental do Invariante 4 de `specs/E00-S06-invariantes-padrao-os/`.

## Modo degradado

Hoje o canal é **100% mock** (ADR-0002): não existe envio real pela Meta Cloud API nem pela
Evolution — mensagens do humano persistem em sessão e aparecem na thread, e o agente IA responde
pela simulação (tópico conhecido) ou faz handoff (pergunta fora do escopo, E04-S02). Por isso o
"WhatsApp fora do ar" ainda não tem caminho real:

- **Sem credencial configurada / integração inativa** (`/admin/configuracoes`): o canal pode ser
  desligado por filtro no inbox, mas nenhuma mensagem mock deixa de existir — não há dependência de
  serviço externo para a demo continuar.
- **O que não pode acontecer:** mensagem sumir da thread ou a conversa desanexar do cliente na
  visão 360 por causa de estado de integração — o histórico é dado local, não depende de WhatsApp.

Quando existir adapter real, este modo passa a exigir teste que o exercite (Invariante 4, E00-S06:
exigência de teste suspensa até lá — testar degradação contra mock prova que o mock sabe falhar).
