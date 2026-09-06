---
name: DESIGN
description: Declaração documental (Invariante 4, E00-S06) do modo degradado do Instagram/Meta — a story é pequeno e não tinha design.md; este arquivo existe para a declaração verificável por scripts/check-degraded-mode.mjs.
story: E04-S06
integracoes: [instagram]
alwaysApply: false
---

# DESIGN — Canal Instagram / Meta (E04-S06)

Story de tier pequeno — o spec.md segue sendo o contrato. Este design.md existe para declarar o
modo degradado da integração, exigência documental do Invariante 4 de
`specs/E00-S06-invariantes-padrao-os/`.

## Modo degradado

A integração é **mock** (ADR-0002): sem LLM real, sem OAuth real, sem webhook real — as
credenciais Meta (App ID, App Secret, Access Token, Webhook Verify Token, Instagram Business
Account ID) são superfície de configuração com segredo mascarado, não chamada de rede. O modo
degradado é o estado de configuração:

- **Instagram inativo ou sem credencial** (`/admin/configuracoes`): o card fica inativo, o canal
  não aparece no seletor de canais do agente, e nenhuma conversa nova do Instagram é atendida — a
  operação continua pelos canais WhatsApp restantes, sem erro em tela.
- **Sem Instagram, o agente não finge atender:** a regra de canais do agente (`RegraAtendimentoIA.canais`)
  só oferece o que está ativo — atendimento "pela metade" (cliente escreve e ninguém responde) é o
  comportamento proibido; o canal desligado some do seletor antes disso.

Quando a Meta Graph API virar adapter real, este modo passa a exigir teste que o exercite
(Invariante 4, E00-S06: exigência de teste suspensa até lá).
