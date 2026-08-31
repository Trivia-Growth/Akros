---
name: TASKS
description: Decomposição AC→task→gate de E14-S01.
story: E14-S01
alwaysApply: false
---

# tasks.md — E14-S01 Rate limiting nas Edge Functions

> Tier arquitetural: `design.md` aprovado antes de qualquer código.

## Task 1 — Schema `seguranca.rate_limit` (AC-2, AC-4)
Migration `NNNN_E14-S01_schema_seguranca.sql`: schema novo, tabela com PK `(chave, janela_inicio)`,
RLS FORCE, `GRANT` só para `service_role`. Expurgo de janela vencida no mesmo `UPSERT`.

**Gate:** `pnpm run lint:migrations` verde (RLS FORCE e GRANT são checados) e o job `db-tests`
aplicando do zero.

## Task 2 — `_shared/rate-limit.ts` (AC-1, AC-2, AC-3, AC-4)
Helper com `checarLimite({ req, rota, teto, janelaSegundos, falharFechado })`. Hash da chave com
segredo do Vault. `UPSERT` atômico — nunca `SELECT` seguido de `UPDATE`, que é corrida.

**Gate:** teste contra Postgres real (job `db-tests`) provando o teto, a virada de janela e a
contagem correta sob concorrência.

## Task 3 — Aplicar nas 4 funções (AC-1, AC-3)
`sessao-login`, `sessao-refresh`, `sessao-logout` com `fail-closed`; `telemetria-erro` com
`fail-open` e log, conforme a exceção do `design.md`. Ordem do pipeline de `os-grade.md`:
CORS → rate limit → `requireAuth` → Zod → lógica.

**Gate:** teste por função provando `429` no excesso e passagem abaixo do teto.

## Task 4 — Log estruturado de excesso (AC-5)
Evento com rota, janela e teto — **sem IP em claro**, coerente com AC-4.

**Gate:** teste afirmando que o log sai e que não contém o IP.

## Task 5 — Gate de função sem teto declarado (AC-6)
`check-edge-functions.mjs` passa a exigir que toda função fora de uma allowlist explícita chame
`checarLimite`. Teste do próprio gate provando que ele falha (invariante 1 de E00-S06).

**Gate:** `pnpm run check:edge-functions` falha para uma função nova sem rate limit.
