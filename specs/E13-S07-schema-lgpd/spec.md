---
name: SPEC
description: Contrato técnico do schema lgpd (consentimentos, solicitações).
story: E13-S07
tier: arquitetural
alwaysApply: false
---

# spec.md — E13-S07 Schema `lgpd`

## Acceptance Criteria

### AC-1 — Tabelas com RLS FORCE, cobertas por `audit.*`
`lgpd.consentimentos`, `lgpd.solicitacoes`; trigger de auditoria (E13-S06) anexado nas duas.

### AC-2 — Cliente cria e lê as próprias linhas
Cliente consegue `INSERT`/`SELECT` em `consentimentos`/`solicitacoes` só com o próprio
`cliente_id`; não vê linhas de outro cliente.

### AC-3 — Só admin processa solicitação
`UPDATE` de `status`/`concluido_em`/`motivo_negacao` em `lgpd.solicitacoes` como cliente não muda
a linha (releitura via `service_role` confirma); como admin funciona.

### AC-4 — Migration passa no lint
`pnpm run lint:migrations` verde.

## Gate

```
pnpm run lint:migrations
supabase db push
# verificação via curl (Accept-Profile: lgpd)
```
