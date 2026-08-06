---
name: ARCHITECTURE
description: Arquitetura de sistema, bounded contexts, context-map, estratégia de mock, i18n. Puxe ao revisar design.
alwaysApply: false
---

# ARCHITECTURE.md — Akros

## Visão de Alto Nível

Aplicação **SPA (React 19 + Vite + TS + Tailwind)** com três frentes servidas por rotas:

```
Público (site)          Portal do Cliente        Painel Admin
/                        /portal/*                /admin/*
/quem-somos             (mock auth/impersonate)  (mock auth/impersonate)
/vistos                  jornada, docs, pagto,     kanban, clientes 360,
/metodologia             assinatura, agenda        jornada-gestão, proposta,
/servicos                                          integrações
/blog
/contatos (form lead)
```

**Nesta fase: sem backend.** Toda persistência é **mock em memória** (fixtures + estado local),
isolada atrás de **portas (interfaces TypeScript)** para troca futura por Supabase sem tocar na UI.

## Princípio-chave: Portas & Adapters (para trocar mock→Supabase depois)

```
UI (React) → application (use cases) → PORTA (interface) → adapter
                                                            ├─ MockAdapter (agora)
                                                            └─ SupabaseAdapter (futuro)
```

Regra: **a UI nunca importa mock diretamente.** Ela consome use cases; use cases dependem de portas;
o container de injeção escolhe o adapter (mock nesta fase). Trocar de mock para Supabase = trocar
o adapter no container, sem mudar componentes.

## Bounded Contexts

Cada contexto vive em `apps/web/src/features/<dominio>/` com camadas DDD.

### 1. `site` — Site Institucional (marketing)
- **Responsabilidade:** páginas públicas, conteúdo institucional, captação de lead.
- **Entidades:** Servico, Visto, PostBlog, Depoimento, Lead (criação).
- **Portas:** `LeadRepository` (criar lead a partir do form), `ConteudoRepository` (vistos, posts).
- **Saída:** criar `Lead` → aparece no kanban do contexto `crm`.

### 2. `jornada` — Portal do Cliente (jornada gamificada)
- **Responsabilidade:** acompanhamento da jornada de visto (intro + 5 fases), unlock sequencial.
- **Entidades:** Jornada, Fase, Etapa/Tarefa, ProgressoCliente, Checklist.
- **Regras:** fase N+1 só desbloqueia quando admin marca fase N como liberada (gate).
- **Portas:** `JornadaRepository`, `ProgressoRepository`.

### 3. `documentos` — Documentos & Assinatura
- **Responsabilidade:** upload, consulta, status de documentos; assinatura digital (mock).
- **Entidades:** Documento, Checklist, SolicitacaoAssinatura, Assinatura.
- **Portas:** `DocumentoRepository`, `AssinaturaService`.

### 4. `pagamentos` — Pagamentos
- **Responsabilidade:** status de pagamentos (entrada, taxa federal USCIS, parcelas).
- **Entidades:** Pagamento, Fatura, PlanoPagamento.
- **Portas:** `PagamentoRepository`.

### 5. `agenda` — Reuniões & Agendamento
- **Responsabilidade:** agendar/consultar reuniões (mock Gmail/Outlook/Calendly).
- **Entidades:** Reuniao, Disponibilidade, Transcricao (Fireflies).
- **Portas:** `AgendaRepository`, `TranscricaoRepository`.

### 6. `crm` — Leads, Clientes 360, Proposta (Admin)
- **Responsabilidade:** kanban de leads, base de clientes, visão 360, proposta comercial, gestão de jornada.
- **Entidades:** Lead, Cliente, EstagioLead, Proposta, HistoricoContato, Interacao.
- **Regras:** kanban 6 estágios; admin libera fases da jornada dos clientes.
- **Portas:** `LeadRepository`, `ClienteRepository`, `PropostaRepository`.

### 7. `comunicacao` — WhatsApp, E-mail, Agentes IA (mock)
- **Responsabilidade:** inbox de conversas (WhatsApp oficial + Evolution), agentes IA, histórico.
- **Entidades:** Conversa, Mensagem, Canal, AgenteIA, RegraAtendimento.
- **Portas:** `ConversaRepository`, `AgenteService`.

### 8. `demo` — Impersonação & Cenários (cross-cutting)
- **Responsabilidade:** seletor de persona, impersonar cliente, alternar cenários de jornada.
- **Entidades:** Persona, Cenario.
- **Nota:** habilita o time da Akros a navegar como qualquer cliente/estado.

## Context Map

```
site (form lead) ──cria Lead──▶ crm (kanban)
crm (converte lead→cliente) ──▶ jornada (cria jornada do cliente)
crm (admin libera fase) ──gate──▶ jornada (desbloqueia próxima fase) ──▶ portal cliente
jornada ◀──consome── documentos, pagamentos, agenda
comunicacao ──anexa a──▶ cliente (visão 360 em crm)
agenda (Fireflies) ──transcrição vira evidência──▶ crm (visão 360)
demo ──impersona──▶ jornada + crm (navega qualquer persona/cenário)
```

## Estrutura de Pastas (DDD tático por feature)

```
apps/web/src/
├── app/                      # Bootstrap, providers, router, DI container
│   ├── router.tsx
│   ├── providers.tsx         # i18n, theme, mock container
│   └── di.ts                 # injeção: escolhe MockAdapter (agora)
├── shared/                   # Compartilhado entre features (design system, i18n, utils)
│   ├── ui/                   # Design system (Button, Card, Badge, etc) — impeccable
│   ├── i18n/                 # config + locales pt-BR / en
│   ├── layout/               # Shells: PublicLayout, PortalLayout, AdminLayout
│   └── lib/                  # helpers (log, http/problem, format)
├── features/
│   ├── site/
│   │   ├── domain/           # entidades sem I/O
│   │   ├── application/      # use cases (ex: EnviarFormularioLead)
│   │   ├── infrastructure/   # MockLeadRepository, MockConteudoRepository
│   │   └── interfaces/       # páginas + componentes React
│   ├── jornada/
│   ├── documentos/
│   ├── pagamentos/
│   ├── agenda/
│   ├── crm/
│   ├── comunicacao/
│   └── demo/
└── mocks/                    # Fixtures centrais (personas, cenários, seed data)
    ├── personas.ts           # clientes fictícios (vários estados de jornada)
    ├── leads.ts
    ├── conversas.ts
    ├── documentos.ts
    └── scenarios.ts          # cenários de demo
```

Regra de dependência: `interfaces → application → domain ← infrastructure`. `domain/` nunca importa
React/Supabase/mock. Features de domínios diferentes **não se importam** — compartilham via `shared/`.

## Estratégia de Mock

- **Fixtures centrais** em `src/mocks/` — personas com jornadas em estados diferentes (recém-contratado,
  meio da Fase 2, aguardando USCIS, aprovado, etc).
- **Repositories mock** implementam as portas, lendo/escrevendo em memória (estado React/Zustand ou
  Context). Mutações persistem durante a sessão (ex: mover lead no kanban) mas resetam no reload.
- **Latência simulada** opcional (setTimeout) para parecer real na demo.
- **Cenários** (`scenarios.ts`) — presets que populam o app num estado específico para a demo.

## i18n

- **react-i18next** (ver ADR-0001). Locales `pt-BR` (default) e `en`.
- Namespaces por feature (`site`, `portal`, `admin`, `common`).
- Toggle de idioma no header (público) e nos shells (portal/admin).
- **Nenhum texto hardcoded** em componentes — tudo via `t('chave')`.
- Conteúdo institucional (vistos, metodologia) também traduzido.

## Impersonação / Demo Mode

- Barra/menu de demo (visível só em dev/demo) permite:
  - Escolher persona (cliente) e entrar no portal como ela.
  - Alternar cenário de jornada (muda estado das fases).
  - Alternar entre visão Cliente ↔ Admin.
- Implementado no contexto `demo`; injeta a persona ativa no container de DI.

## Design System (impeccable — OBRIGATÓRIO)

Todo componente de UI segue a skill **impeccable** (`.claude/skills/impeccable/`). Tokens:
- **Cores:** navy `#0D2240`, gold `#C6A254`, cream `#F5F4F0`, borda `#E0DDD5`, texto `#1A1A1A`/`#555`.
- **Tipografia:** fonte com personalidade (não default), escala harmônica (12→14→16→18→20→24→32→40→48).
- **Radius:** escala 4/8/12px. **Shadows:** 1-2 níveis. **Ícones:** set único.
- **Dark mode:** intencional (não auto-invert) — opcional nesta fase.
- Configurados em `tailwind.config` + `shared/ui/`.

## Schemas & Data Model (futuro — Supabase)

Nesta fase **não há schema SQL**. Quando migrar para Supabase:
- Tabelas por bounded context, RLS FORCE (ver `db/README.md`, `seguranca/os-grade.md`).
- Migrations em `db/migrations/` (formato `NNNN_E0N-S0N_*.sql`).
- As **entidades de domínio** definidas agora viram base do schema.

## Decisões (ADRs)

- **ADR-0001** — Stack de i18n (react-i18next) e estrutura de locales.
- **ADR-0002** — Portas & Adapters para camada de dados mock (trocável por Supabase).
- **ADR-0003** — Gerenciamento de estado mock (Context vs Zustand).
Ver `docs/adr/`.

## Referências
- **CLAUDE.md** — convenções
- **docs/glossary.md** — termos de domínio
- **docs/PROJECT.md** — contexto de negócio
- **.claude/skills/impeccable/** — padrão de UI
