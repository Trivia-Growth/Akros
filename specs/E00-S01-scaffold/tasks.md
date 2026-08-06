---
name: TASKS
description: Decomposição do scaffold. 1 task por AC + gate.
story: E00-S01
alwaysApply: false
---

# TASKS — Scaffold (E00-S01)

| Task | AC | Gate |
|------|-----|------|
| T-1 Criar app Vite React19+TS em apps/web, subir dev | AC-1 | `pnpm dev` sobe; página placeholder carrega |
| T-2 Instalar+configurar Tailwind com tokens Akros | AC-2 | classe de cor da marca renderiza |
| T-3 Criar árvore de pastas DDD (app/ shared/ features/* mocks/) com .gitkeep | AC-3 | pastas existem conforme ARCHITECTURE.md |
| T-4 Configurar path aliases (@/) em tsconfig + vite | AC-5 | import por alias resolve |
| T-5 Garantir scripts + gates verdes | AC-4 | `pnpm typecheck && pnpm build && pnpm lint` verdes |

## Ordem
T-1 → T-2 → T-3 → T-4 → T-5

## Notas
- Reaproveitar configs do repo (biome, turbo, tsconfig base). Não duplicar.
- Sem lógica de negócio — só estrutura.
