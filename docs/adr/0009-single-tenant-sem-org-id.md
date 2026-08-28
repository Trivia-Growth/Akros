---
name: adr-0009-single-tenant-sem-org-id
description: A plataforma é single-tenant da Akros. Nenhuma tabela recebe org_id e o isolamento se dá por papel e por cliente, não por organização.
alwaysApply: false
---

# ADR-0009 — Single-tenant: sem `org_id`, sem white-label

**Status:** Aceito
**Data:** 2026-08-28
**Decisores:** Lucas Azevedo (Akros/Trívia Studio)
**Relacionados:** ADR-0004 (deixou a questão em aberto), ADR-0008, `docs/epics/ROADMAP.md` (pergunta aberta nº 7), épico E13

## Contexto

O ADR-0004 registrou a hipótese de outras consultorias de imigração usarem a plataforma e deixou a
decisão explicitamente fora de escopo: *"Multi-tenant / white-label: exige isolamento por
organização, RLS por tenant e modelo de billing. É um ADR próprio quando houver decisão
comercial."* A mesma dúvida virou a pergunta aberta nº 7 do ROADMAP.

A questão precisa ser fechada **antes da primeira migration**, não depois. A escolha muda o
formato de toda tabela e a expressão de toda policy de RLS. Introduzir `org_id` num banco vazio
custa uma coluna; introduzir num banco com processo de imigração real em andamento custa uma
migração com backfill sobre PII, com janela de indisponibilidade e risco de vazar linha entre
organizações durante a transição.

## Decisão

**A plataforma é single-tenant da Akros. Nenhuma tabela recebe `org_id`.**

O isolamento de dados tem duas dimensões, e só duas:

- **Por papel** — `cliente` alcança o schema `portal`; o time da Akros alcança o schema `admin`.
  Separação por `GRANT`/`REVOKE` de schema, não por policy (épico E13).
- **Por cliente** — dentro do `portal`, cada linha pertence a um `cliente_id`, resolvido a partir
  do claim do JWT, nunca de parâmetro vindo do browser.

O catálogo de `programas` (ADR-0004) permanece **global**: é o catálogo da Akros, não de uma
organização entre várias. A entidade `Programa` continua sendo dado versionado — essa parte do
ADR-0004 segue valendo integralmente; o que se fecha aqui é apenas a porta do multi-tenant.

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| **A — Single-tenant (escolhida)** | Schema e policies mais simples; predicado de RLS curto e auditável; menos superfície para errar | Fechar a porta comercial do white-label sem reabrir com migração | Decisão de negócio: a plataforma é da Akros |
| **B — `org_id` "por precaução"** | Migração futura barata | Coluna, índice e predicado a mais em toda tabela e toda policy, pagos desde já por um cenário que foi descartado; policy mais longa é policy mais fácil de errar | Rejeitada: custo permanente por opção que não será exercida |
| **C — Adiar de novo** | Nenhum | Empurra a decisão para depois de existir dado real, que é exatamente o momento caro | Rejeitada: é o cenário que este ADR existe para evitar |

## Consequências

**Positivas**
- Policy de RLS enxuta: papel e `cliente_id`. Predicado curto é predicado que dá para ler e testar
  com pgTAP linha a linha.
- Sem coluna nem índice de tenant em nenhuma tabela; menos escrita, menos armazenamento, menos
  chance de esquecer o `org_id` numa policy — que é a falha clássica de multi-tenant.
- A matriz de autorização em Playwright (épico E12·3) fica com um eixo a menos.

**Negativas / trade-offs aceitos**
- Se a Akros decidir vender a plataforma para outra consultoria, o custo é **um ADR novo que
  substitui este, mais uma migração com backfill sobre dado real**. Aceito conscientemente.
- Nenhum código deve ser escrito "preparando" multi-tenant. Abstração especulativa por um cenário
  descartado é anti-padrão (ver `ANTI-PADROES.md`); se o cenário voltar, volta como ADR.
