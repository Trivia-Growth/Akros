---
name: TASKS
description: Decomposição AC → task → gate — E03-S06.
story: E03-S06
alwaysApply: false
---

# TASKS — Documento de proposta (E03-S06)

## Task 1 — Domínio + mocks
**AC:** AC-1, AC-3
- `crm/domain/types.ts`: `Proposta.validoAte: string`, `Proposta.itensEscopo: string[]`.
- `mocks/propostas.ts`: adiciona os 2 campos ao seed existente.
- `store.ts` (`criarProposta`): aceita `validoAte` e `itensEscopo` no input.
- **Gate:** `pnpm typecheck` verde.

## Task 2 — Formulário: validade + itens de escopo
**AC:** AC-1
- `crm/interfaces/PropostasPage.tsx` (`NovaPropostaModal`): campo de data "Válida até"; lista
  dinâmica de itens de escopo (adicionar/remover); `handleCriar` exige ≥1 item.
- **Gate:** `pnpm typecheck` + `pnpm lint` verdes.

## Task 3 — Rota e página do documento
**AC:** AC-2, AC-3, AC-6
- `app/router.tsx`: rota `propostas/:id` dentro de `/admin` → `PropostaDocumentoPage`.
- `crm/interfaces/PropostaDocumentoPage.tsx` (novo): busca a proposta pelo id (`useParams` +
  `useMockDb`), renderiza documento estilo papel com logo, dados institucionais, lead, escopo,
  itens, valor, condições, rodapé; trata proposta não encontrada.
- **Gate:** `pnpm typecheck` + `pnpm lint` verdes; teste manual: abrir `/admin/propostas/:id` com
  id válido e com id inválido.

## Task 4 — Botões voltar/imprimir + link no card
**AC:** AC-4, AC-5
- `PropostaDocumentoPage.tsx`: botão "Voltar" (`Link` pra `/admin/propostas`), botão "Imprimir /
  Salvar PDF" (`window.print()`), ambos `print:hidden`.
- `PropostasPage.tsx`: botão "Ver documento" em cada card, linkando pra `/admin/propostas/:id`.
- **Gate:** `pnpm typecheck` + `pnpm lint` verdes.

## Task 5 — Print limpo no AdminLayout
**AC:** AC-4
- `shared/layout/AdminLayout.tsx`: `print:hidden` no `<aside>` (sidebar desktop) e `<header>`
  (topbar).
- **Gate:** teste manual: `window.print()` preview em `/admin/propostas/:id` não mostra sidebar
  nem topbar.

## Task 6 — Gates finais
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm arch:check`, `pnpm audit:esteira` — todos
  verdes.
- Atualizar `docs/epics/ROADMAP.md` (E03-S06) e `docs/STATE.md`.
