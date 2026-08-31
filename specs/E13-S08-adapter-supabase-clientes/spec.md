---
name: SPEC
description: Contrato técnico da troca de adapter mock→Supabase pra clientes (escopo estreito).
story: E13-S08
tier: arquitetural
alwaysApply: false
---

# spec.md — E13-S08 Adapter Supabase real pra `clientes`

## Acceptance Criteria

### AC-1 — Modo demo continua 100% inalterado
**Given** `isDemoMode = true` (padrão)
**When** a plataforma é usada como sempre
**Then** `container.clientes` continua sendo `MockClienteRepository`; nenhuma chamada de rede ao
Supabase acontece; comportamento idêntico ao anterior a esta story.

### AC-2 — Cliente autenticado vê o próprio dado real no portal
**Given** `isDemoMode = false`, login como `carlos.mendes@example.com`
**When** `/portal` carrega
**Then** os dados vêm de `crm.clientes` via PostgREST (não do mock) — confirmável mudando um
campo direto no banco via `service_role` e vendo refletir após reload.

### AC-3 — Admin vê a lista e o detalhe reais
**Given** `isDemoMode = false`, login como admin
**When** `/admin/clientes` e o detalhe de um cliente carregam
**Then** mostram as linhas reais de `crm.clientes` (só as 2 seed — Carlos, Renata), não as 5
personas do mock.

### AC-4 — Editar no admin persiste no banco de verdade
**Given** o admin edita um campo do cliente real (ex.: pasta do Drive) em `Cliente360.tsx`
**When** salva
**Then** o `UPDATE` chega em `crm.clientes` (confirmável via `service_role`) — não no
`useMockDb`.

### AC-5 — Mapeamento de id não vaza pro resto do app
**Given** o adapter real devolve `id` = string mock (`"cliente-carlos"`), não o uuid
**When** a jornada/documentos/pagamentos (ainda mock) desse cliente são consultados na mesma tela
**Then** casam normalmente com `clienteId` — nenhuma tela quebra por id incompatível.

## Fora de escopo
Ver `design.md`. Reforço: as 6 telas não migradas continuam mock mesmo fora do modo demo — não é
regressão, é decisão de escopo registrada.

## Gate

```
pnpm run typecheck
pnpm test
pnpm run build
pnpm exec playwright test   # matriz de autorização continua verde
# manual em browser real: VITE_DEMO_MODE=false, login Carlos -> /portal, login admin -> /admin/clientes
```
