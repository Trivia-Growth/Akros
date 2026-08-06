---
name: SPECS-INDEX
description: Índice das specs geradas para o protótipo Akros. Mapeia story → diretório de spec.
alwaysApply: false
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
- `E03-S01-kanban/`, `E03-S02-clientes-360/`, `E03-S03-gestao-jornada/`, `E03-S04-proposta/`,
  `E03-S05-dashboard-admin/`

## E04 — Integrações (mock)
- `E04-S01-whatsapp/`, `E04-S02-agentes-ia/`, `E04-S03-agenda-integrada/`, `E04-S04-fireflies/`

## E05 — Demo & Impersonação
- `E05-S01-impersonacao/`, `E05-S02-cenarios/`

---

# Rodada 2 — especificada e implementada em 06/08/2026

Origem: mensagem do Bruno Luz de 06/08/2026. Decisões em ADR-0004, ADR-0005 e ADR-0006.
Ordem de execução e perguntas em aberto: `docs/epics/ROADMAP.md`.

## E06 — Programas de visto (multi-fluxo) · ADR-0004
- `E06-S01-modelo-programa/` — Programa como dado versionado (**design+spec**, arquitetural)
- `E06-S02-programa-religioso/` — Segundo programa R/EB-4
- `E06-S03-abertura-caso-programa/` — Escolha de programa na conversão
- `E06-S04-catalogo-programas/` — Catálogo somente-leitura no admin

## E07 — IA de análise de documentos · ADR-0005
- `E07-S01-porta-analise-ia/` — Porta e contrato do parecer (**design+spec**, arquitetural)
- `E07-S02-feedback-cliente/` — Parecer no upload, correção antes da fila
- `E07-S03-fila-revisao-humana/` — Decisão humana registrada
- `E07-S04-carta-experiencia-recomendacao/` — Regras do caso concreto + cenário de demo

## E08 — Comunicação unificada · ADR-0006
- `E08-S01-timeline-unificada/` — `EventoComunicacao` append-only (arquitetural)
- `E08-S02-chat-portal/` — Canal registrável no portal
- `E08-S03-politica-canal-documento/` — Anexo do WhatsApp registrado e redirecionado

## E09 — Ritmo, previsão e responsabilidade
- `E09-S01-dono-da-etapa/` · `E09-S02-previsao-ritmo/` · `E09-S03-painel-gargalos/` · `E09-S04-alertas-inatividade/`

## E10 — Pagamentos na plataforma
- `E10-S01-pagamento-transferencia/` — sem gateway; dados de recebimento fictícios + comprovante + conciliação manual
- E10-S02..S04 (cartão/recorrência, QuickBooks/Wise, faturas) — sem specs, fora do escopo desta rodada

## E11 — Pré-venda: qualificação e follow-up
- `E11-S01-qualificacao-whatsapp/` · `E11-S02-perfil-lead/` · `E11-S03-cadencia-followup/` ·
  `E11-S04-gate-aprovacao-agendamento/` · `E11-S05-base-reativacao/`

## Convenções destas specs
- **Dados mockados** — nenhuma spec assume backend. Ver ADR-0002/0003.
- **AC verificáveis** por interação de UI (a "execução do gate" nesta fase é E2E/interação, não API).
- **i18n** — toda string de UI via `t()`. AC de i18n herdada de E00-S03.
- **impeccable** — toda story com UI passa pelo checklist (Definition-of-Done seção 7).
