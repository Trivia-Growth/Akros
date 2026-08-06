---
name: ROADMAP
description: Épicos, stories e status. Atualizar ao concluir stories. Owner de story marca aqui antes de codar.
---

# ROADMAP — Akros

Protótipo visual (dados mockados, sem login, localhost). **Sempre marque o owner da story antes de codar.**
Ordem de prioridade: **E00 → E01 → E02** (Homepage + Portal primeiro), depois E03 → E04 → E05.

Legenda status: ⬜ Não começado · 🟨 Em andamento · 🟩 Concluído · ⚠️ Bloqueado
Legenda spec: ✅ spec gerada · ⏳ spec pendente

---

## E00 — Fundação & Design System `[prioridade 1]`

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E00-S01 | Scaffold do app | Vite + React 19 + TS + Tailwind + React Router + estrutura de pastas DDD (`app/`, `shared/`, `features/`, `mocks/`) | — | ⬜ | ✅ |
| E00-S02 | Design System (impeccable) | Tokens Akros (navy/gold/cream), tipografia, componentes base (Button, Card, Badge, Input, Modal, Tabs, Progress) | — | ⬜ | ✅ |
| E00-S03 | i18n (PT-BR + EN) | react-i18next, namespaces por feature, toggle de idioma, sem texto hardcoded | — | ⬜ | ✅ |
| E00-S04 | Camada de mock + DI | Portas/adapters, fixtures centrais (`mocks/`), personas, latência simulada, container de injeção | — | ⬜ | ✅ |
| E00-S05 | Layout shells + routing | PublicLayout, PortalLayout, AdminLayout; nav pública; rotas das 3 frentes | — | ⬜ | ✅ |

## E01 — Site Institucional (Marketing) `[prioridade 2]`

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E01-S01 | Homepage | Hero "Elevando Talentos ao Topo Global", stats (+300 famílias), categorias de serviço, sobre CEO, depoimentos, CTA | — | ⬜ | ✅ |
| E01-S02 | Quem Somos | Natalia Luz, história, equipe, advogada parceira (Dra. Denise) | — | ⬜ | ✅ |
| E01-S03 | Vistos | Todos os tipos (EB-1/2/2NIW/3/4, F-1, L-1, E-2, P-1, R, H-1B, H-2B) com categorias imigrante/não-imigrante | — | ⬜ | ✅ |
| E01-S04 | Metodologia | 7 passos visuais (análise → relocation) | — | ⬜ | ✅ |
| E01-S05 | Outros Serviços | Categorias: Profissionais Qualificados, Atletas/Artistas, Religiosos, Legalização | — | ⬜ | ✅ |
| E01-S06 | Blog | Lista de posts + página de post (conteúdo mockado; tópicos reais EB-2 NIW) | — | ⬜ | ✅ |
| E01-S07 | Contatos + Form de Lead | Página contato + formulário que gera Lead no kanban (E03-S01) | — | ⬜ | ✅ |

## E02 — Portal do Cliente `[prioridade 3]`

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E02-S01 | Dashboard do cliente | Visão geral da jornada, progresso gamificado, próximas ações, avisos | — | ⬜ | ✅ |
| E02-S02 | Jornada gamificada | Introdução + 5 fases, unlock sequencial (gate do admin), etapas/tarefas por fase | — | ⬜ | ✅ |
| E02-S03 | Documentos & Checklists | Upload, consulta, status, checklists por fase | — | ⬜ | ✅ |
| E02-S04 | Assinatura digital | Assinar documentos (contrato, etc) — fluxo mockado | — | ⬜ | ✅ |
| E02-S05 | Pagamentos | Status (entrada, taxa federal USCIS), faturas, plano de pagamento | — | ⬜ | ✅ |
| E02-S06 | Agendamento de reuniões | Calendário, agendar/consultar reuniões (mock Calendly/Gmail/Outlook) | — | ⬜ | ✅ |
| E02-S07 | Perfil do cliente | Dados pessoais, contatos, preferências | — | ⬜ | ✅ |

## E03 — Painel Admin `[prioridade 4]`

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E03-S01 | Kanban de leads | 6 colunas (Lead, Qualificado, Reunião Agendada, Em Negociação, Fechado, Descartado), drag-drop, card de lead | — | ⬜ | ✅ |
| E03-S02 | Base de clientes + Visão 360 | Lista de clientes + tela 360 (dados, histórico, docs, conversas, reuniões, pagamentos, jornada) | — | ⬜ | ✅ |
| E03-S03 | Gestão de jornada | Admin libera fases dos clientes (gate da gamificação), acompanha progresso | — | ⬜ | ✅ |
| E03-S04 | Proposta comercial | Criar/enviar proposta (escopo + valores) a lead/cliente | — | ⬜ | ✅ |
| E03-S05 | Dashboard admin | Métricas (leads por estágio, clientes por fase, receita, reuniões) | — | ⬜ | ✅ |

## E04 — Integrações (mockadas, UI realista) `[prioridade 5]`

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E04-S01 | Inbox WhatsApp | Conversas (oficial + Evolution), threads, histórico anexado ao cliente | — | ⬜ | ✅ |
| E04-S02 | Agentes IA | Config de agente (primeiro atendimento, horários, tópicos), preview de conversa | — | ⬜ | ✅ |
| E04-S03 | Agenda (Gmail/Outlook) | Visão de agenda integrada, reuniões, sincronização mockada | — | ⬜ | ✅ |
| E04-S04 | Transcrições (Fireflies) | Lista de transcrições de reuniões como evidência, anexadas à visão 360 | — | ⬜ | ✅ |

## E05 — Demo & Impersonação `[cross-cutting, habilitar cedo]`

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E05-S01 | Seletor de persona / impersonar | Barra de demo: escolher cliente e entrar no portal como ele; alternar Cliente↔Admin | — | ⬜ | ✅ |
| E05-S02 | Cenários de demo | Presets que populam o app em estados específicos (jornada em Fase X, kanban cheio, etc) | — | ⬜ | ✅ |

---

## Sugestões estratégicas (pensando como dono da Akros)

Ideias para elevar a proposta (validar com a Akros antes de priorizar):
- **Score de elegibilidade EB-2 NIW** no site (quiz que gera lead qualificado automaticamente).
- **Estimador de prazo/custo** interativo por tipo de visto.
- **Notificações** (mock) quando admin libera uma fase — reforça a gamificação.
- **Badges/conquistas** por fase concluída (elemento de gamificação explícito).
- **Portal do recomendante** — link para signatários enviarem cartas assinadas (reduz fricção da Fase 2).
- **Central de documentos** com versionamento e status por documento.
- **Dashboard de "saúde do caso"** (semáforo: em dia / atenção / atrasado) na visão 360.

## Ordem de execução recomendada

1. **E00** completo (fundação — bloqueia tudo).
2. **E05-S01/S02** (impersonação + cenários — necessário para demo desde cedo).
3. **E01-S01** (Homepage — maior impacto visual) + **E01-S07** (form lead).
4. **E02-S01/S02** (Dashboard + Jornada gamificada — core do produto).
5. Restante de E01 (páginas do site).
6. Restante de E02 (docs, assinatura, pagamento, agenda).
7. **E03** (admin/kanban/360).
8. **E04** (integrações mockadas).

## Próximos passos
1. Executar E00-S01 (scaffold) — desbloqueia todo o resto.
2. Preencher `db/` só quando migrar para Supabase (fase futura).
3. Registrar ADR-0001 (i18n), ADR-0002 (portas/adapters), ADR-0003 (estado mock) antes de codar E00.
