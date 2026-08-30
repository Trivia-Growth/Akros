---
name: SPEC
description: Contrato técnico dos schemas agenda + programas.
story: E13-S04
alwaysApply: false
---

# spec.md — E13-S04 Schema `agenda` + `programas`

## Acceptance Criteria

### AC-1 — Tabelas com RLS FORCE
`agenda.reunioes`, `agenda.transcricoes`, `programas.programas`.

### AC-2 — Isolamento por cliente em `agenda`
Cliente só vê as próprias reuniões/transcrições; admin vê todas.

### AC-3 — `programas` é catálogo global
Qualquer autenticado lê todos os programas; `UPDATE` como cliente não muda linha (releitura via
`service_role` confirma — mesma checagem do E13-S03); `UPDATE` como admin funciona.

### AC-4 — Migration passa no lint
`pnpm run lint:migrations` verde.

## Gate

```
pnpm run lint:migrations
supabase db push
# verificação via curl (Accept-Profile: agenda / programas)
```
