---
name: DESIGN
description: Declaração documental (Invariante 4, E00-S06) do modo degradado do Fireflies — a story é pequeno e não tinha design.md; este arquivo existe para a declaração verificável por scripts/check-degraded-mode.mjs.
story: E04-S04
integracoes: [fireflies]
alwaysApply: false
---

# DESIGN — Transcrições Fireflies (E04-S04)

Story de tier pequeno — o spec.md segue sendo o contrato. Este design.md existe para declarar o
modo degradado da integração, exigência documental do Invariante 4 de
`specs/E00-S06-invariantes-padrao-os/`.

## Modo degradado

A fonte é **mock** (`TranscricaoRepository`, ADR-0002): não há captura real de áudio nem chamada à
Fireflies.ai — a transcrição chega como dado local ligado à reunião. O spec já define a superfície
de degradação no AC-4 (status de captura simulado), que é o comportamento contratual:

- **Fireflies inativo ou transcrição indisponível:** a reunião mostra status `indisponível` (não
  renderiza texto vazio nem finge evidência); a reunião em si e o restante da visão 360 continuam
  inteiros — a transcrição é evidência anexa, nunca pré-requisito da agenda.
- **Sem transcrição não perde decisão:** resumo/action items só existem quando a captura existe;
  nada é inferido ou inventado para preencher o vazio.

Quando existir adapter real, este modo passa a exigir teste que o exercite (Invariante 4, E00-S06:
exigência de teste suspensa até lá).
