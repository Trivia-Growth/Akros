---
name: TASKS
description: Decomposição de spec em tasks. Cada task = 1 AC + gate executável. Escrito por @sm.
story: E01-S01
---

# TASKS — Bulk Approve Ordens (E01-S01)

Reference: spec.md AC1-AC5

---

## T-1: Checkbox Selection & Counter (AC-1)

**Task:** Render ordens list com checkboxes; atualizar contador ao selecionar.

**Owner:** @dev
**Estimate:** 3h
**AC ref:** AC-1

### Acceptance Criteria (verbatim dari spec.md AC-1)
```gherkin
Given   ordens listadas na tela
When    eu clico no checkbox de uma ordem
Then    a linha fica destacada
And     o contador muda pra "1 selecionada"
```

### Gate Executável
```bash
# Roda suite de testes pra AC-1
pnpm test --testNamePattern="AC-1" --testPathPattern="OrdensBulkApprove"
```

**Files to touch:**
- `apps/web/src/features/ordens/interfaces/OrdensList.tsx` — add checkbox + selection state
- `apps/web/src/features/ordens/interfaces/__tests__/OrdensList.test.tsx` — test checkbox click

**Notes:**
- Use React `useState` pra selection (array de IDs)
- Checkbox renderiza com `<input type="checkbox" checked={isSelected} onChange={...} />`
- Counter = `selected.length`

---

## T-2: Clear Selection (AC-2)

**Task:** Implementar botão "Limpar seleção" que desmarca todos + desabilita botão Aprovar.

**Owner:** @dev
**Estimate:** 2h
**AC ref:** AC-2

### Acceptance Criteria (verbatim)
```gherkin
Given   2+ ordens selecionadas
When    eu clico "Limpar seleção"
Then    todos checkboxes desmarcam
And     contador volta pra "0 selecionadas"
And     botão "Aprovar" fica desabilitado
```

### Gate Executável
```bash
pnpm test --testNamePattern="AC-2" --testPathPattern="OrdensBulkApprove"
```

**Files to touch:**
- `apps/web/src/features/ordens/interfaces/OrdensList.tsx` — add Clear button + handler
- `__tests__/` — test clear() sets selected=[]

---

## T-3: Bulk Approve API Call

**Task:** POST /approve-ordens (Edge Function) que aprova N ordens em backend.

**Owner:** @dev
**Estimate:** 4h
**AC ref:** AC-3

### Acceptance Criteria (verbatim)
```gherkin
Given   1+ ordens selecionadas
When    eu clico "Aprovar"
Then    modal de confirmação abre
And     eu clico "Confirmar"
Then    backend aprova cada ordem
And     status muda pra "Aprovada"
And     toast notifica "5 ordens aprovadas"
And     seleção limpa
```

### Gate Executável
```bash
# Testa Edge Function + frontend flow
pnpm test --testNamePattern="AC-3" --testPathPattern="OrdensBulkApprove"
```

**Files to touch:**
- `supabase/functions/approve-ordens/index.ts` — Edge Function logic
- `apps/web/src/features/ordens/infrastructure/SupabaseOrdensAdapter.ts` — approveOrdens() method
- `apps/web/src/features/ordens/application/ApproveOrdensHandler.ts` — use case
- `apps/web/src/features/ordens/interfaces/BulkApproveButton.tsx` — button + modal + call handler
- `__tests__/` — integration test (call API, verify response)

**Notes:**
- Edge Function deve revalidar RLS (`auth.uid()` vs política de acesso)
- Toast via Sonner: `toast.success("5 ordens aprovadas")`
- Clear selected state após sucesso

---

## T-4: Error Handling (AC-4)

**Task:** Tratar erro parcial (algumas ordens falham). Reportar contagem.

**Owner:** @dev
**Estimate:** 2h
**AC ref:** AC-4

### Acceptance Criteria (verbatim)
```gherkin
Given   5 ordens, 4 OK, 1 erro (deletada)
When    eu aprova
Then    backend aprova 4, loga erro na 1
And     toast mostra "Aprovadas 4/5 — 1 erro"
And     lista refresca
```

### Gate Executável
```bash
pnpm test --testNamePattern="AC-4.*erro|parcial" --testPathPattern="OrdensBulkApprove"
# Mock DB error on 1 ordem, assert response + toast
```

**Files to touch:**
- `supabase/functions/approve-ordens/index.ts` — try/catch per ordem, collect errors
- `apps/web/src/features/ordens/infrastructure/SupabaseOrdensAdapter.ts` — return { approved: [...], errors: [...] }
- `apps/web/src/features/ordens/interfaces/BulkApproveButton.tsx` — handle partial response, show "X/Y" toast

**Notes:**
- Edge Function não faz rollback no erro (parcial é OK per spec)
- Response format: `{ approved: 4, failed: 1, errors: [{ id, reason }] }`

---

## T-5: Idempotent Approval & Duplo-Clique Protection (AC-5)

**Task:** Garante que duplo-clique não aprova 2x. Status "Aprovada" é idempotente.

**Owner:** @dev
**Estimate:** 3h
**AC ref:** AC-5

### Acceptance Criteria (verbatim)
```gherkin
Given   aprovação em andamento
When    usuário clica "Aprovar" novamente
Then    botão desabilitado com spinner
And     segunda clique ignorado
And     aprovação roda 1 vez só
```

### Gate Executável
```bash
pnpm test --testNamePattern="AC-5.*duplo|idempotent" --testPathPattern="OrdensBulkApprove"
# Slow down API, double-click, assert only 1 API call
```

**Files to touch:**
- `apps/web/src/features/ordens/interfaces/BulkApproveButton.tsx` — add `isLoading` state, disable button
- `supabase/functions/approve-ordens/index.ts` — status is idempotent (`UPDATE ... WHERE id=X AND status != 'Aprovada'` or similar)
- `__tests__/` — mock slow API, assert 2 clicks = 1 request only

**Notes:**
- Frontend: `<button disabled={isLoading}>Aprovar {isLoading && <Spinner />}</button>`
- DB: Approve só muda status se tá diferente (natural idempotency)

---

## Summary: Task → AC Traceability

| Task | AC | Status | Gate |
|------|-----|--------|------|
| T-1  | AC-1 | ⬜ | `pnpm test AC-1` |
| T-2  | AC-2 | ⬜ | `pnpm test AC-2` |
| T-3  | AC-3 | ⬜ | `pnpm test AC-3` |
| T-4  | AC-4 | ⬜ | `pnpm test AC-4` |
| T-5  | AC-5 | ⬜ | `pnpm test AC-5` |

---

## Implementation Order

1. T-1 → T-2 (frontend UI ready)
2. T-3 (backend + integration)
3. T-4 (error case)
4. T-5 (robustness)

All gates green = Definition-of-Done ✅

---

## Referências
- **spec.md** — ACs fonte de verdade
- **design.md** — decisões de arquitetura
- **Definition-of-Done.md** — checklist completo
