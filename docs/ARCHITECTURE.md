---
name: ARCHITECTURE
description: Arquitetura de sistema, bounded contexts, context-map, schemas. Puxe ao revisar design.
alwaysApply: false
---

# ARCHITECTURE.md — Akros

## Visão de Alto Nível

[A COMPLETAR — diagrama ou descrição textual da arquitetura geral]

## Bounded Contexts

[A COMPLETAR — DDD: listar cada bounded context (domínio/módulo), suas responsabilidades, e como se comunicam]

Exemplo structure:
```
Domínio 1: [A COMPLETAR]
  - Entidades principais: [A COMPLETAR]
  - Use cases: [A COMPLETAR]
  - Portas (interfaces): [A COMPLETAR]
  - Adaptadores: [A COMPLETAR]

Domínio 2: [A COMPLETAR]
  ...
```

## Context Map

[A COMPLETAR — relacionamento entre bounded contexts: shared kernel, customer-supplier, conformist, etc]

## Padrão de Dependência

Todos os domínios seguem a regra de dependência (DDD tático):

```
interfaces → application → domain ← infrastructure
```

Estrutura por feature:

```
apps/web/src/features/<dominio>/
├── domain/              # Entidades, value objects, lógica pura (sem I/O)
├── application/         # Use cases, orquestra domínio + portas
├── infrastructure/      # Adapters (Supabase, APIs externas)
├── interfaces/          # Controllers, componentes React
└── __tests__/           # Testes por camada
```

## Schemas & Data Model

[A COMPLETAR — diagrama ER principal ou referência a migrations]

### Tabelas Principais
[A COMPLETAR — listar tabelas core do banco, suas colunas/relações]

### RLS (Row Level Security)
[A COMPLETAR — políticas de RLS por contexto. Ver `db/rls.template.sql`]

## Fluxo de Dados

[A COMPLETAR — como dados fluem entre frontend → backend → DB e vice-versa]

## Integrações Externas

[A COMPLETAR — APIs de terceiros, webhooks, callbacks]

## Decision Records (ADRs)

Ver `docs/adr/` para decisões duráveis de arquitetura.

## Referências
- **CLAUDE.md** — convenções
- **docs/glossary.md** — termos de domínio
