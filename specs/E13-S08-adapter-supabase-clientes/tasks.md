---
name: TASKS
description: Quebra em tasks executáveis pra troca de adapter mock→Supabase (clientes).
story: E13-S08
alwaysApply: false
---

# tasks.md — E13-S08

## T1 — Cliente Supabase no front (AC-2, AC-3)
- `pnpm add @supabase/supabase-js` em `apps/web`.
- Criar `apps/web/src/shared/supabase/client.ts`: `createClient` com `persistSession: false`,
  `autoRefreshToken: false`, `detectSessionInUrl: false`, `accessToken` callback lendo
  `useSessaoStore.getState().sessao?.accessToken`.
- Gate: `pnpm run typecheck`.

## T2 — `SupabaseClienteRepository` (AC-2, AC-3, AC-4, AC-5)
- Criar `apps/web/src/features/crm/infrastructure/SupabaseClienteRepository.ts` implementando
  `ClienteRepository` (mesma interface do `MockClienteRepository`).
- `MAPA_ID_REAL_PARA_MOCK` + inverso, comentário `// SPEC_DEVIATION:` documentando o porquê
  (ver design.md) e a condição de remoção (E13-S09).
- `listar()`: `supabase.schema("crm").from("clientes").select()`, mapeia uuid→mock-id.
- `buscarPorId(id)`: mapeia mock-id→uuid, filtra, mapeia resultado de volta.
- `atualizar(id, patch)`: mapeia mock-id→uuid, `update(patch).eq("id", uuidReal)`.
- Gate: `pnpm run typecheck`.

## T3 — Wiring no container (AC-1, AC-2, AC-3)
- `apps/web/src/app/di.ts`: `clientes: isDemoMode ? new MockClienteRepository() :
  new SupabaseClienteRepository()`.
- Gate: `pnpm run typecheck`; `pnpm test` (garante modo demo não quebrou nada).

## T4 — Portal: `useClienteAtivo()` real (AC-2)
- Estender branch `!isDemoMode` pra buscar via `container.clientes.buscarPorId(sessao.usuario.clienteId)`
  (fetch on mount, sem Realtime).
- Gate: `pnpm run typecheck`; teste manual browser (login Carlos, modo real).

## T5 — Admin: lista e detalhe reais (AC-3, AC-4)
- Novo hook `useClientesReais()` em `crm/application/hooks.ts`: fetch on mount + `refetch()`.
- `Clientes360Page.tsx` e `Cliente360.tsx`: branch `isDemoMode` — real usa `useClientesReais()`
  + `container.clientes.atualizar`, chama `refetch()` após salvar.
- Gate: `pnpm run typecheck`; `pnpm test`.

## T6 — Verificação end-to-end (todos AC)
- Browser real (`VITE_DEMO_MODE=false`): login Carlos → `/portal` mostra dado real; editar campo
  via `service_role` direto no banco → reload reflete (AC-2).
- Login admin → `/admin/clientes` mostra só 2 linhas reais (AC-3); editar em `Cliente360.tsx` →
  reread via `service_role` confirma persistência (AC-4).
- Confirmar jornada/documentos/pagamentos do cliente ainda casam na tela (AC-5).
- Gate completo: typecheck, test, build, arch:check, audit:esteira, eval:spec, lint:migrations,
  validate-mermaid, check-edge-functions, biome (escopo próprio se sessão concorrente interferir),
  `pnpm exec playwright test`.

## T7 — Docs e commit
- Atualizar `docs/epics/ROADMAP.md` (E13-S08 🟩) e `docs/STATE.md`.
- Commit único `feat(E13-S08): adapter Supabase real para clientes` — stage só arquivos próprios,
  `git status --short` antes/depois.
