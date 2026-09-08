---
name: SPEC
description: Contrato de ondas adapter+tela para remover mock fora do modo demo — E13-S11.
story: E13-S11
tier: arquitetural
alwaysApply: false
---

# spec.md — E13-S11 Ondas de saída do mock

Ver `product.md` e `design.md`.

## Acceptance Criteria

### AC-1 — Entidades-folha usam portas reais sem criar dado fictício
**Given** modo não demo
**When** programa, configuração operacional ou transcrição é aberta
**Then** cada tela usa adapter Supabase; coleção remota vazia renderiza estado vazio explícito, nunca
seed/mock disfarçado.

### AC-2 — Entidades ancoradas em cliente usam UUID real de ponta a ponta
**Given** cliente autenticado ou admin e dados remotos existentes
**When** abre jornada, documentos, pagamentos, agenda, comunicação ou proposta
**Then** hooks e telas usam o mesmo UUID de `crm.clientes`; RLS define linhas visíveis e mutações
autorizadas.

### AC-3 — Telas transversais não cruzam dado real com mock
**Given** ondas folha e ancorada concluídas
**When** admin abre dashboard, agenda administrativa, operação, Cliente 360 ou proposta/documento
**Then** todas as dependências lidas pela tela vêm das portas reais da mesma onda.

### AC-4 — Caminho não demo não carrega store ou mapa temporário
**Given** `VITE_DEMO_MODE=false`
**When** app monta
**Then** `useMockDb` e `MAPA_ID_REAL_PARA_MOCK` não são carregados/usados; remover ambos não muda
resultado real.

### AC-5 — Modo demo continua isolado e funcional
**Given** `VITE_DEMO_MODE=true`
**When** app abre
**Then** fluxos demonstráveis continuam usando mock sem chamar Supabase.

### AC-6 — Isolamento é provado pelo caminho do usuário
**Given** dois clientes seed com dados distintos
**When** cliente A navega o portal real
**Then** browser não renderiza nem carrega dado de B; Playwright cobre jornada, documento e pagamento.

## Gate

```bash
pnpm test
pnpm --filter @akros/web exec playwright test
pnpm run arch:check
```
