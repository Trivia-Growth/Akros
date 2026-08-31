---
name: TASKS
description: Decomposição AC→task→gate de E12-S02.
story: E12-S02
alwaysApply: false
---

# tasks.md — E12-S02 Autenticação e RBAC

## Task 1 — Edge Functions de sessão (AC-1, AC-2, AC-5)
`supabase/functions/sessao-login`, `sessao-refresh`, `sessao-logout` (Deno), seguindo
`_template/index.ts` (CORS → Zod → lógica → problem+json). Cookie via
`std@0.224.0/http/cookie.ts`. Header CSRF (`_shared/csrf.ts`, novo) exigido em refresh/logout.

**Gate:** `supabase functions deploy sessao-login sessao-refresh sessao-logout` (ou revisão de
código, se CLI não disponível no ambiente) sem erro de sintaxe Deno; smoke manual com `curl` contra
o projeto (`mhxopadkizktsenohnbm`) usando as credenciais seed.

## Task 2 — Proxy Netlify (AC-1, AC-4, AC-5)
`netlify.toml`: redirect `/api/sessao/*` → Edge Functions, **antes** do catch-all SPA.

**Gate:** revisão — ordem das regras no arquivo; `netlify dev` local se disponível, senão validar
após primeiro deploy.

## Task 3 — Contexto `features/sessao/` (AC-1, AC-3, AC-4, AC-5)
`domain/types.ts`, `application/store.ts` (Zustand sem persist), `application/hooks.ts`
(`useSessaoAtual`, `useBootstrapSessao`, `login`, `logout`), `infrastructure/EdgeFunctionSessaoService.ts`,
`interfaces/LoginPage.tsx`, `interfaces/RequireRole.tsx`.

**Gate:** `pnpm run typecheck`.

## Task 4 — Router + guarda de rota (AC-3, AC-7)
`app/router.tsx`: rota `/login`; `/portal` e `/admin` envolvidos por `RequireRole` só quando
`!isDemoMode` (reaproveita `shared/lib/env.ts::isDemoMode`, E05-S01). `app/App.tsx` chama
`useBootstrapSessao()` sempre (a própria hook não faz nada em modo demo).

**Gate:** `pnpm run typecheck && pnpm test` verdes (AC-7: suíte de smoke render continua passando
sem tocar rede — prova que modo demo não regrediu).

## Task 5 — Ponte pra persona mockada (AC-6)
`features/demo/application/hooks.ts::useClienteAtivo()`: quando `!isDemoMode` e há sessão de papel
`cliente`, resolve por `sessao.usuario.clienteId`; em modo demo, comportamento inalterado
(`useDemoSession().personaId`). Comentário `SPEC_DEVIATION` no ponto exato (ver `design.md`).

**Gate:** `pnpm run typecheck && pnpm test`.

## Task 6 — Verificação final
```
pnpm run typecheck
pnpm test
pnpm run build
```
Gate manual do `spec.md` (7 passos): **concluído** (28/08, Chrome real). Todos os AC (1–7)
confirmados na UI, incluindo o caso de borda cross-role (cliente tentando `/admin`).

Ao terminar: `/validar`, atualizar `docs/STATE.md` e `docs/epics/ROADMAP.md` (E12-S02: ⬜ → 🟩). ✅
