---
name: TASKS
description: Decomposição AC→task→gate de E13-S10.
story: E13-S10
alwaysApply: false
---

# tasks.md — E13-S10 Onda 0: tabelas ausentes

## Task 1 — Artefatos canônicos (AC-1 a AC-6)
`product.md`, `spec.md`, `design.md` e este arquivo fixam fronteiras, RLS, dados proibidos e gates
antes de schema.

**Gate:** `pnpm run audit:esteira` e `pnpm run eval:spec` verdes.

## Task 2 — Migration de propostas e configurações (AC-1 a AC-4, AC-6)
`0014_E13-S10_schema_configuracoes_propostas.sql`: schema, seis tabelas, FKs, checks, RLS FORCE,
GRANT/policies e triggers de auditoria. Sem seed e sem coluna de segredo.

**Gate:** `pnpm run lint:migrations` verde; migration aplica em Postgres vazio.

## Task 3 — Teste SQL de constraints e RLS (AC-2, AC-3, AC-5, AC-6)
`supabase/tests/03-rls-configuracoes-propostas_test.sql`: prova XOR proposta, FKs de conta,
cliente vazio/não escreve, admin lê/escreve e trigger de auditoria.

**Gate:** job `db-tests` verde localmente contra Postgres 17 efêmero.

## Task 4 — Aplicar e verificar projeto real (AC-1, AC-5)
`supabase db push`; autenticar admin e cliente seed, consultar PostgREST com os dois tokens.

**Gate:** migration remota atualizada; admin vê linhas técnicas de teste; cliente recebe `[]`;
registros técnicos são removidos ou soft-deletados.

## Task 5 — Documentar onda e preparar E13-S11
Atualizar ROADMAP/STATE com a tabela pronta e manter `useMockDb` ligado: trocar adapter antes de
hooks/telas continua proibido.

**Gate:** `pnpm --filter @akros/web exec playwright test` verde; docs refletem evidência.
