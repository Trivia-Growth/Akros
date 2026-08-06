---
name: STATE
description: Estado volátil do trabalho. Atualizar ao pausar/retomar (use /handoff).
---

# STATE.md — Estado de Trabalho Akros

Sessão atual:
- **Data:** 2026-08-06
- **Owner:** Lucas (via Claude — planejamento/docs)
- **Epic em foco:** Documentação de contexto + geração de specs (pré-execução)
- **Stories em progresso:** nenhuma em código ainda — specs prontas para execução

## Resumo de progresso
Framework Padrão SO v3 + Triviaiox já scaffoldado (commits anteriores). **Contexto de negócio
preenchido e specs geradas** para o protótipo visual da Akros Immigration Solutions:
- `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/glossary.md` preenchidos.
- `docs/epics/ROADMAP.md` com épicos E00–E05 e stories.
- ADRs 0001 (i18n), 0002 (portas/adapters), 0003 (Zustand) registrados.
- `CLAUDE.md` seção de contexto atualizada.
- Specs em `specs/` (ver `specs/INDEX.md`) — E00 com tasks.md; demais com spec.md
  (tasks.md a gerar por `@sm` na execução).

**Decisões do cliente (respostas):** Homepage+Portal primeiro · 5ª fase = Pós-aprovação/Relocation ·
i18n PT-BR+EN · mocks de integração realistas · sem banco/login (protótipo visual em localhost) ·
modo de impersonação obrigatório.

## Próximos passos (execução — outro modelo)
1. **E00-S01** scaffold (desbloqueia tudo) → E00-S02 design system → E00-S03 i18n → E00-S04 mock/DI → E00-S05 shells/routing.
2. **E05-S01/S02** impersonação + cenários (necessário para demo cedo).
3. **E01-S01** homepage + **E01-S07** form de lead.
4. **E02-S01/S02** dashboard + jornada gamificada (core).
5. Restante de E01, E02, depois E03 (admin/kanban/360/gestão-jornada/proposta), E04 (WhatsApp e demais).

## Notas/contexto de troca
- **Fonte da jornada:** `manual-cliente-eb2-niw-utf8-links-corrigidos-v2.html` (conteúdo real das fases).
- **Identidade:** `Akros identidade/` (logos). Paleta navy `#0D2240` / gold `#C6A254` / cream `#F5F4F0`.
- **Conteúdo do site:** coletado de akrosimmigration.com — não inventar serviços/vistos/dados.
- **impeccable** obrigatório em toda story com UI (Definition-of-Done seção 7).
- **Migração futura:** mocks atrás de portas (ADR-0002) → trocar por Supabase sem reescrever UI.
- Specs sem tasks.md (E01–E05, exceto E00): `@sm` gera na execução usando a seção "Notas de implementação".
- **Todas as specs geradas** (E00–E05, incluindo E03-S05, E04-S02/S03/S04). Nenhuma spec pendente.

---
*Atualizar este arquivo ao pausar a sessão. Use `/handoff` para semiautomatizar.*
