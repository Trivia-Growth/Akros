---
name: DESIGN
description: Declaração documental (Invariante 4, E00-S06) do modo degradado do OpenRouter (BYOK) e do Whisper — a story é pequeno e não tinha design.md; este arquivo existe para a declaração verificável por scripts/check-degraded-mode.mjs.
story: E04-S15
integracoes: [openrouter, whisper]
alwaysApply: false
---

# DESIGN — BYOK por agente + Whisper (E04-S15)

Story de tier pequeno — o spec.md segue sendo o contrato. Este design.md existe para declarar o
modo degradado das duas integrações, exigência documental do Invariante 4 de
`specs/E00-S06-invariantes-padrao-os/`.

## Modo degradado

Ambas são **mock** (nenhuma chamada real acontece — protótipo visual, sem backend), mas a story já
definiu os caminhos degradados como contrato de UI:

- **OpenRouter fora / sem chave configurada:** o agente **não finge inteligência** — o card do
  modelo avisa explicitamente que aquele agente responde só pela simulação mockada, não por um
  modelo real (AC-3). A resposta mock continua disponível por ser simulação local; quando a chamada
  for real, a regra vira fail-closed: sem modelo, sem resposta em nome do agente.
- **Whisper inativo:** transcrever áudio no inbox **some como ação e vira caminho de configuração** —
  o botão "Transcrever áudio" vira link para ativar Whisper em Configurações (AC-4). A mensagem de
  áudio permanece na thread, reproduzível; nada é transcrito às cegas nem prometido sem provedor.

Quando existir adapter real, este modo passa a exigir teste que o exercite (Invariante 4, E00-S06:
exigência de teste suspensa até lá).
