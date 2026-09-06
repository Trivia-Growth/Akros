---
name: TASKS
description: Decomposição com gates para E13-S12.
story: E13-S12
alwaysApply: false
---

# tasks.md — E13-S12

## Task 1 — Cofre e persistência (AC-1, AC-2)

Criar referências Vault sem coluna de chave, recibo deduplicado, vínculo Evolution de conversa e
RPCs service-role-only. Provar RLS e ausência de segredo em tabela pública.

**Gate:** `pnpm run lint:migrations` e teste SQL.

**Andamento 05/09 — concluída localmente:** `0016` usa referências sem segredo, Vault só por RPC
de `service_role`, RLS FORCE e recibo único de Evolution. PostgreSQL 17 limpo aplicou todas as
migrations e passou teste de cofre/RLS/deduplicação.

## Task 2 — Edge Functions (AC-1 a AC-4)

Salvar configuração admin, instalar webhook autenticado, parsear evento, deduplicar, aplicar
handoff/defesa de prompt, chamar OpenRouter e Evolution.

**Gate:** type-check Deno e inspeção sem log/retorno de segredo.

**Andamento 05/09 — concluída localmente:** `integracoes-ia-salvar` valida admin/CSRF/schema,
guarda as duas chaves, cria token por header e registra `/webhook/set/{instância}`. `evolution-webhook`
valida capability, aplica handoff, prompt sem tools e chama OpenRouter/Evolution apenas com conta e
agente ativos. `deno check` passou nas duas funções.

## Task 3 — UI operacional (AC-1, AC-3)

Adicionar formulário real à Central, campos password efêmeros e ativação explícita desligada por
padrão. Recarregar apenas estado seguro depois de salvar.

**Gate:** teste unitário, build e smoke admin.

**Andamento 05/09 — concluída localmente:** Central mostra contas/agentes reais e formulário
password efêmero; checkbox de resposta começa desligado. Build e 155 testes passaram. Próximo
gate externo: DevOps aplica migration e deploya as duas functions; então administrador configura
as chaves somente pela UI.
