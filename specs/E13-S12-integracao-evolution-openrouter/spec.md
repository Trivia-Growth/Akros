---
name: SPEC
description: Contrato de integração real Evolution/OpenRouter — E13-S12.
story: E13-S12
tier: arquitetural
alwaysApply: false
---

# spec.md — E13-S12

Ver `product.md`, `domain.md` e `design.md`.

## Acceptance Criteria

### AC-1 — Configuração sem painel Supabase
**Given** administrador autenticado
**When** salva Evolution e OpenRouter pela UI
**Then** a API valida, registra webhook e persiste chaves somente no Vault; a UI recebe apenas IDs,
flags e estado seguro.

### AC-2 — Menor privilégio de segredos
**Given** usuário cliente, admin ou navegador comprometido
**When** consulta tabelas/RPCs públicas
**Then** não lê referência executável nem valor de segredo; somente Edge Function com `service_role`
acessa o Vault.

### AC-3 — Resposta externa opt-in e deduplicada
**Given** conta e agente ativos, webhook autenticado e mensagem textual nova
**When** Evolution envia `MESSAGES_UPSERT`
**Then** sistema registra entrada, chama OpenRouter e envia no máximo uma resposta pela mesma
instância; agente ou conta inativa não gera saída.

### AC-4 — Handoff e isolamento do LLM
**Given** pedido humano/sensível ou conteúdo com instrução hostil
**When** webhook processa mensagem
**Then** conteúdo não altera regra do sistema; caso sensível recebe mensagem de handoff, sem tool,
segredo, dado interno ou aconselhamento jurídico.

## Gate

```bash
pnpm test
pnpm run lint:migrations
pnpm --filter @akros/web run build
pnpm run arch:check
```
