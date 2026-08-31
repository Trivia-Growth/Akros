---
name: TASKS
description: Decomposição AC→task→gate de E13-S01.
story: E13-S01
alwaysApply: false
---

# tasks.md — E13-S01 Schema `crm.clientes` + RLS

## Task 1 — Migration (AC-1, AC-4, AC-5)
`supabase/migrations/0001_E13-S01_schema_clientes.sql` — schema `crm`, tabela `clientes`,
`ENABLE`/`FORCE ROW LEVEL SECURITY`, `GRANT USAGE`+`SELECT,UPDATE`, as 4 policies do `design.md`.

**Gate:** `pnpm run lint:migrations` verde.

## Task 2 — Aplicar no projeto real
`supabase db push` contra `mhxopadkizktsenohnbm` (já linkado).

**Gate:** `supabase migration list` mostra a migration aplicada; consulta a `pg_tables` confirma.

## Task 3 — Segundo usuário `cliente` seed (AC-6)
Criar `renata.alves@example.com` via Management API (mesmo padrão de E12-S02), `app_metadata:
{ role: "cliente", cliente_id: "cliente-renata" }` — mantém a convenção de `cliente_id` apontar
pro id da persona mockada até E13-S07.

**Gate:** usuário aparece em `auth.users`.

## Task 4 — Seed mínimo de `crm.clientes`
2 linhas via `service_role` (fora de RLS): uma pra Carlos (`auth_user_id` = seu user id),
uma pra Renata. Núcleo copiado de `mocks/personas.ts` (nome/email/tipoVisto/caseManager), sem
tentar espelhar as 5 personas inteiras.

**Gate:** `SELECT count(*) FROM crm.clientes` = 2, via `service_role`.

## Task 5 — Verificação de RLS via curl (AC-2, AC-3)
Rodar os dois curls do `design.md` (login real via `sessao-login`, pegar o `accessToken`, consultar
`crm.clientes` via PostgREST com `Accept-Profile: crm`).

**Gate:** Carlos vê 1 linha (a dele); Lucas vê 2.

## Task 6 — Un-fixme o AC-6 do E12-S03
`apps/web/e2e/auth-matrix.spec.ts`: o `test.fixme` de isolamento por `cliente_id` pode virar teste
real **no nível de API** (chamada direta ao PostgREST dentro do teste Playwright, não via UI —
UI ainda lê mock até E13-S07). Documentar isso no próprio teste.

**Gate:** `pnpm exec playwright test` — 6/6 verdes, zero fixme.

Ao terminar: `/validar`, atualizar `docs/STATE.md` e `docs/epics/ROADMAP.md` (E13-S01: 🟨 → 🟩).
