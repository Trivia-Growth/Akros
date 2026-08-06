---
name: TASKS
description: Decomposição da camada mock + DI.
story: E00-S04
---

# TASKS — Mock + DI (E00-S04)

| Task | AC | Gate |
|------|-----|------|
| T-1 Entidades de domínio por feature (domain/) | AC-1 | tipos compilam; sem I/O |
| T-2 Interfaces de porta por feature | AC-1 | portas agnósticas definidas |
| T-3 Store useMockDb (Zustand) + seed() | AC-3,AC-5 | store semeado das fixtures |
| T-4 Fixtures src/mocks (personas, leads, conversas, docs, pagtos, reuniões, transcrições) | AC-3 | dados plausíveis, PT-BR |
| T-5 Mock*Repository implementando portas | AC-2 | leitura/escrita persistem na sessão |
| T-6 Container DI + hooks de acesso + use cases | AC-4 | UI acessa só via hooks |
| T-7 Latência simulada + resetarDemo | AC-5 | delay opcional + reset funciona |

## Ordem
T-1 → T-2 → T-3 → T-4 → T-5 → T-6 → T-7

## Notas
- Ver design.md para contratos. Regra do gate de jornada é central (usada por E02/E03).
