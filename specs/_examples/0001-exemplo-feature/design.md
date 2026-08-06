---
name: DESIGN
description: Design de sistema (como). Escrito por @architect (tier arquitetural).
story: E01-S01
alwaysApply: false
---

# DESIGN — Bulk Approve (E01-S01)

[Referência: spec.md. Nota: Este é um exemplo PEQUENO, Design não é sempre necessário.]

## Escopo da Decisão

Feature é pequena (5 tasks), não introduz novo domínio nem muda schema. Design.md aqui é só pra referência/aprendizado — em tier trivial/pequeno, pode pular.

## Fluxo de Dados

```
Frontend (React) ← → Backend (Edge Function) ← → DB (Supabase)

1. UI: Render lista com checkboxes (read from table via RLS)
2. User seleciona N ordens
3. User clica "Aprovar"
4. Frontend POST /approve-ordens { ids: [...], } (JWT no header)
5. Edge Function valida JWT, lê RLS do user, aprova cada ordem atômica
6. DB retorna # de aprovadas + erros
7. Frontend refresca lista (ou refetch via subscription)
8. UI atualiza status e toast
```

## Decisões de Design

### D1: RLS vs Backend Validation
> **Decisão:** RLS garante segurança, backend faz refetch pra confirmar permissão.
> **Razão:** OS-grade exige RLS FORCE. Dupla validação (RLS + backend) protege contra race condition.
> **Alternativa rejeitada:** Confiar só em JWT claims (menos seguro).

### D2: Atômico vs Bulk
> **Decisão:** Cada aprovação em transação separada (parcialmente atômico).
> **Razão:** Permite error reporting granular (AC-4 parcial). Bulk trans seria all-or-nothing, menos útil.
> **Trade-off:** Se DB falha no meio, algumas ordens aprovam. Spec é OK com isso.

### D3: Frontend Refetch
> **Decisão:** POST retorna lista de IDs aprovadas; frontend refresca row-by-row via subscription.
> **Razão:** Evita refetch completo (economiza query). Supabase realtime propaga mudança.
> **Alternativa:** Full page refetch (simples, mas less elegant).

## Camadas & Artefatos

```
domain/ordens/          # Ordem entity, ApproveOrdenCommand (use case)
application/            # ApproveOrdensHandler (orquestra N Ordem approvals)
infrastructure/         # SupabaseOrdensAdapter (DB I/O, RLS)
interfaces/             # BulkApproveButton (React), /approve-ordens (Edge Function)
```

No `domain/`, nenhuma importação de Supabase. `application/` já sabe de interface, mas não de detalhe SQL.

## Segurança

- RLS FORCE na tabela `ordens`
- Política: supervisor vê `ordens WHERE team_id IN (team do supervisor)`
- Aprovação valida `auth.uid()` vs `updated_by` (quem pode aprovar)
- Edge Function valida JWT, re-valida RLS no lado do servidor

## Testes (Gates)

Cada task vai ter gate executável:
- T-1: Checkbox renders, counters update (unit + e2e)
- T-2: Clear button clears all (e2e click)
- T-3: Bulk API call (integration test)
- T-4: Error handling (mock DB error, assert toast)
- T-5: Idempotent approval (post twice, verify only 1 approval in DB)

---

## Referências
- **ANTI-PADROES.md** — quando NOT criar Design (tier trivial)
- **docs/ARCHITECTURE.md** — DDD tático, layer structure
- **spec.md** — ACs que este design satisfaz
