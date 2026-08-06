---
name: adr-0002-portas-adapters-mock
description: Camada de dados via portas/adapters; mock agora, Supabase depois, sem reescrever UI.
alwaysApply: false
---

# ADR-0002 — Portas & Adapters para a camada de dados (mock → Supabase)

**Status:** Aceito
**Data:** 2026-08-06
**Decisores:** Trívia Studio
**Relacionados:** docs/ARCHITECTURE.md, spec E00-S04

## Contexto
Fase atual é **protótipo visual com dados mockados**, sem backend. Mas o objetivo é evoluir para
Supabase sem reescrever a UI. Precisamos de uma fronteira clara entre UI e origem de dados.

## Decisão
Adotar **Portas & Adapters (Hexagonal)**:
- Cada bounded context define **portas** (interfaces TS) na camada `application/` ou `domain/`
  (ex: `LeadRepository`, `JornadaRepository`).
- Implementações concretas ficam em `infrastructure/`:
  - **Agora:** `Mock<Nome>Repository` (estado em memória a partir de `src/mocks/`).
  - **Futuro:** `Supabase<Nome>Repository`.
- Um **container de DI** (`app/di.ts`) escolhe o adapter. Nesta fase, sempre o Mock.
- **A UI nunca importa mock nem adapter direto** — consome use cases (`application/`), que recebem a
  porta por injeção.
- Mutações mock persistem **em memória durante a sessão** (ex: mover card no kanban), resetam no reload.
- Latência simulada opcional (`await delay()`) para realismo na demo.

## Alternativas consideradas
| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| Portas & Adapters (escolhida) | Troca mock→Supabase sem tocar UI; testável | Boilerplate inicial | Alinha ao DDD do Padrão SO |
| Chamar mocks direto na UI | Rápido de começar | Reescrita total ao migrar; acopla UI a dados | Dívida garantida |
| MSW (mock service worker) | Simula rede real | Precisa de contrato HTTP que ainda não existe | Prematuro sem API definida |

## Consequências
**Positivas:**
- Migração futura para Supabase = novos adapters + troca no container.
- Camada de domínio testável sem UI/rede.

**Negativas / trade-offs aceitos:**
- Boilerplate de interfaces + container agora, mesmo sem backend.
