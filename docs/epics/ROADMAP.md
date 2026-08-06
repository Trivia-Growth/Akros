---
name: ROADMAP
description: Épicos, stories e status. Atualizar ao concluir stories. Owner de story marca aqui antes de codar.
alwaysApply: false
---

# ROADMAP — Akros

Protótipo visual (dados mockados, sem login, localhost). **Sempre marque o owner da story antes de codar.**

Legenda status: ⬜ Não começado · 🟨 Em andamento · 🟩 Concluído · ⚠️ Bloqueado
Legenda spec: ✅ spec gerada · ⏳ spec pendente

**Status geral: 🟩 TODAS AS 25 STORIES (E00–E05) CONCLUÍDAS.** Protótipo navegável em
localhost, pronto para demo ao cliente Akros. Ver `docs/STATE.md` para detalhes da sessão.

---

## E00 — Fundação & Design System

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E00-S01 | Scaffold do app | Vite + React 19 + TS + Tailwind + React Router + estrutura de pastas DDD | @claude-code | 🟩 | ✅ |
| E00-S02 | Design System (impeccable) | Tokens Akros, tipografia, 14 componentes base | @claude-code | 🟩 | ✅ |
| E00-S03 | i18n (PT-BR + EN) | react-i18next, namespaces por feature, toggle de idioma | @claude-code | 🟩 | ✅ |
| E00-S04 | Camada de mock + DI | Portas/adapters, fixtures, 4 personas, container de injeção | @claude-code | 🟩 | ✅ |
| E00-S05 | Layout shells + routing | PublicLayout, PortalLayout, AdminLayout; rotas das 3 frentes | @claude-code | 🟩 | ✅ |

## E01 — Site Institucional (Marketing)

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E01-S01 | Homepage | Hero, stats, categorias, CEO, depoimentos, CTA | @claude-code | 🟩 | ✅ |
| E01-S02 | Quem Somos | Natalia Luz, Dra. Denise Sarchiapone, valores | @claude-code | 🟩 | ✅ |
| E01-S03 | Vistos | 12 tipos reais, filtro imigrante/não-imigrante | @claude-code | 🟩 | ✅ |
| E01-S04 | Metodologia | 7 passos visuais (análise → relocation) | @claude-code | 🟩 | ✅ |
| E01-S05 | Outros Serviços | 4 categorias de atendimento | @claude-code | 🟩 | ✅ |
| E01-S06 | Blog | Lista + post, 4 artigos reais | @claude-code | 🟩 | ✅ |
| E01-S07 | Contatos + Form de Lead | Formulário que gera Lead no kanban | @claude-code | 🟩 | ✅ |

## E02 — Portal do Cliente

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E02-S01 | Dashboard do cliente | Visão geral, progresso, próximas ações, atalhos | @claude-code | 🟩 | ✅ |
| E02-S02 | Jornada gamificada | Intro + 5 fases, unlock sequencial (core do produto) | @claude-code | 🟩 | ✅ |
| E02-S03 | Documentos & Checklists | Upload, regras de envio, status por fase | @claude-code | 🟩 | ✅ |
| E02-S04 | Assinatura digital | Assinar documentos via modal (nome + aceite) | @claude-code | 🟩 | ✅ |
| E02-S05 | Pagamentos | Status, resumo, formatação Intl por moeda | @claude-code | 🟩 | ✅ |
| E02-S06 | Agendamento de reuniões | Slots mock, próximas/passadas, transcrição | @claude-code | 🟩 | ✅ |
| E02-S07 | Perfil do cliente | Editar dados, idioma preferido | @claude-code | 🟩 | ✅ |

## E03 — Painel Admin

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E03-S01 | Kanban de leads | 6 colunas, drag-drop + fallback acessível, conversão | @claude-code | 🟩 | ✅ |
| E03-S02 | Base de clientes + Visão 360 | Lista + 7 abas (dados/jornada/docs/pagtos/reuniões/conversas/histórico) | @claude-code | 🟩 | ✅ |
| E03-S03 | Gestão de jornada | Liberar próxima fase (gate central da gamificação) | @claude-code | 🟩 | ✅ |
| E03-S04 | Proposta comercial | Criar/enviar/aceitar, formatação de moeda | @claude-code | 🟩 | ✅ |
| E03-S05 | Dashboard admin | Funil, clientes por fase, saúde, receita (dataviz) | @claude-code | 🟩 | ✅ |

## E04 — Integrações (mockadas, UI realista)

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E04-S01 | Inbox WhatsApp | 2 canais, threads, anexado à visão 360 | @claude-code | 🟩 | ✅ |
| E04-S02 | Agentes IA | Config + simulação de resposta com handoff | @claude-code | 🟩 | ✅ |
| E04-S03 | Agenda (Gmail/Outlook) | Status conexão mock, sincronização, todas reuniões | @claude-code | 🟩 | ✅ |
| E04-S04 | Transcrições (Fireflies) | Resumo + action items, evidência na visão 360 | @claude-code | 🟩 | ✅ |

## E05 — Demo & Impersonação

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E05-S01 | Seletor de persona / impersonar | Barra de demo, alternar Cliente↔Admin | @claude-code | 🟩 | ✅ |
| E05-S02 | Cenários de demo | 6 cenários (padrão, funil cheio, 4 personas) | @claude-code | 🟩 | ✅ |

---

## Sugestões estratégicas (pensando como dono da Akros)

Ideias para elevar a proposta (validar com a Akros antes de priorizar — **não implementadas
nesta fase**, ficam como backlog para próxima rodada):
- **Score de elegibilidade EB-2 NIW** no site (quiz que gera lead qualificado automaticamente).
- **Estimador de prazo/custo** interativo por tipo de visto.
- **Notificações** (mock) quando admin libera uma fase — reforça a gamificação.
- **Badges/conquistas** por fase concluída (elemento de gamificação explícito).
- **Portal do recomendante** — link para signatários enviarem cartas assinadas (reduz fricção da Fase 2).
- **Central de documentos** com versionamento e status por documento.
- Code-splitting (bundle atual ~600kB — considerar lazy loading das 3 frentes antes de produção).

## Verificação final (2026-08-06)

```
Typecheck: ✅ zero erros
Build:     ✅ sucesso (aviso de bundle size, não-bloqueante)
Lint:      ✅ zero erros (biome)
Testes:    ✅ 38/38 passando (vitest)
```

**Pendência conhecida:** peer review visual em browser real não foi possível nesta sessão
(extensão Chrome indisponível no ambiente de execução). Recomendado antes da demo ao cliente:
rodar `pnpm dev`, navegar pelas 3 frentes com a barra de demo, e revisar visualmente contra
os checklists impeccable em `specs/*/evidence/checklist-impeccable.md`.

## Próximos passos (pós-protótipo)
1. Peer review visual em browser (ver pendência acima).
2. Validar conteúdo/copy com a Akros (textos, valores, prazos são estimativas razoáveis, não dados oficiais confirmados).
3. Priorizar sugestões estratégicas do backlog acima.
4. Quando aprovado para produção: seguir ADR-0002 (portas/adapters) para trocar mocks por Supabase.
