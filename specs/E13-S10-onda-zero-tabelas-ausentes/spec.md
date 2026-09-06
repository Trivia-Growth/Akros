---
name: SPEC
description: Contrato do schema das cinco coleções que bloqueiam ondas de saída do mock — E13-S10.
story: E13-S10
tier: arquitetural
alwaysApply: false
---

# spec.md — E13-S10 Onda 0: tabelas ausentes

Ver `product.md` e `design.md`.

## Acceptance Criteria

### AC-1 — Cinco coleções existem sob schema canônico
**Given** a migration E13-S10 aplicada
**When** o banco é consultado
**Then** existem `crm.propostas`, `configuracoes.integracoes`, `configuracoes.equipe`,
`configuracoes.contas_agenda` e `configuracoes.contas_canal`.

### AC-2 — Proposta pertence a exatamente um lead ou cliente
**Given** uma proposta criada no CRM
**When** ela persiste
**Then** tem exatamente um de `lead_id` ou `cliente_id`, ambos são FKs, e tentativa com zero ou
dois vínculos falha.

### AC-3 — Conta de agenda preserva dono e compartilhamento relacional
**Given** uma conta de agenda
**When** ela persiste
**Then** seu dono referencia `configuracoes.equipe`, escopos são valores permitidos, e cada
compartilhamento referencia uma pessoa e uma conta válidas sem duplicidade.

### AC-4 — Credencial nunca entra nestas tabelas
**Given** uma integração ou conta conectada
**When** metadados são gravados
**Then** só identificadores públicos e flags `*_configurado` persistem; token, segredo, refresh
token, client secret e webhook verify token não têm coluna nem campo JSONB definido nesta story.

### AC-5 — Apenas admin lê ou altera
**Given** token de cliente e token de admin
**When** consultam ou tentam escrever todas as tabelas da story via PostgREST
**Then** cliente recebe coleção vazia e não escreve; admin lê e insere/atualiza; RLS está ENABLE e
FORCE em cada tabela.

### AC-6 — Auditoria e convenções continuam verificáveis
**Given** uma alteração em qualquer tabela da story
**When** a transação fecha e os gates rodam
**Then** há trigger para `audit.registrar_mudanca`, migrations aplicam do zero, testes SQL cobrem
RLS/constraints e `lint:migrations` passa.

## Fora de escopo

Ver `product.md`.

## Gate

```bash
pnpm run lint:migrations
# Postgres limpo: shim + migrations + supabase/tests/03-rls-configuracoes-propostas_test.sql
pnpm --filter @akros/web exec playwright test
```
