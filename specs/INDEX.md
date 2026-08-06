---
name: SPECS-INDEX
description: Índice das specs geradas para o protótipo Akros. Mapeia story → diretório de spec.
---

# Índice de Specs — Akros (protótipo visual, dados mockados)

Cada story tem seu diretório `specs/E0N-S0N-<slug>/` com pelo menos `spec.md` (contrato + AC).
Stories de fundação (E00) incluem `tasks.md`. As demais: `@sm` gera `tasks.md` na execução
(ver `AGENTS.md`), usando a seção "Notas de implementação" de cada `spec.md`.

> **Contexto obrigatório antes de executar:** `docs/PROJECT.md`, `docs/ARCHITECTURE.md`,
> `docs/glossary.md`, `docs/epics/ROADMAP.md`, ADRs 0001–0003, e a skill `impeccable`.

## E00 — Fundação
- `E00-S01-scaffold/` — Scaffold Vite+React+TS+Tailwind+Router (product+spec+tasks)
- `E00-S02-design-system/` — Design System impeccable (product+spec+tasks)
- `E00-S03-i18n/` — i18n PT-BR+EN (spec+tasks)
- `E00-S04-mock-di/` — Portas/adapters + fixtures + DI (spec+tasks)
- `E00-S05-layout-routing/` — Shells + routing (spec+tasks)

## E01 — Site Institucional
- `E01-S01-homepage/`, `E01-S02-quem-somos/`, `E01-S03-vistos/`, `E01-S04-metodologia/`,
  `E01-S05-outros-servicos/`, `E01-S06-blog/`, `E01-S07-contatos-lead/`

## E02 — Portal do Cliente
- `E02-S01-dashboard/`, `E02-S02-jornada/`, `E02-S03-documentos/`, `E02-S04-assinatura/`,
  `E02-S05-pagamentos/`, `E02-S06-agenda/`, `E02-S07-perfil/`

## E03 — Painel Admin
- `E03-S01-kanban/`, `E03-S02-clientes-360/`, `E03-S03-gestao-jornada/`, `E03-S04-proposta/`

## E04 — Integrações (mock)
- `E04-S01-whatsapp/`

## E05 — Demo & Impersonação
- `E05-S01-impersonacao/`, `E05-S02-cenarios/`

## Convenções destas specs
- **Dados mockados** — nenhuma spec assume backend. Ver ADR-0002/0003.
- **AC verificáveis** por interação de UI (a "execução do gate" nesta fase é E2E/interação, não API).
- **i18n** — toda string de UI via `t()`. AC de i18n herdada de E00-S03.
- **impeccable** — toda story com UI passa pelo checklist (Definition-of-Done seção 7).
