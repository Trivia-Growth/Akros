---
name: SPEC
description: Camada de mock (portas/adapters), fixtures, personas, DI container.
story: E00-S04
tier: arquitetural
---

# SPEC — Camada de mock + DI (E00-S04)

## User Story
Como **desenvolvedor**, quero **a camada de dados mockada atrás de portas com fixtures e um container
de injeção**, para que **a UI consuma dados realistas agora e troque para Supabase depois sem reescrever**.

## Contexto
Ver ADR-0002 (portas/adapters) e ADR-0003 (Zustand). Fixtures em `src/mocks/`. Este é o tier
**arquitetural** — o `design.md` desta story detalha as interfaces das portas.

## Acceptance Criteria

### AC-1: Portas definidas
```gherkin
Given  os bounded contexts
When   inspeciono application/ (ou domain/) de cada feature
Then   existem interfaces de porta: LeadRepository, ClienteRepository, JornadaRepository,
       ProgressoRepository, DocumentoRepository, PagamentoRepository, AgendaRepository,
       ConversaRepository, PropostaRepository, TranscricaoRepository
And    nenhuma porta expõe detalhe de Supabase/HTTP (agnóstica)
```

### AC-2: Adapters mock
```gherkin
Given  as portas
When   inspeciono infrastructure/ de cada feature
Then   há um Mock<Nome>Repository que implementa a porta lendo/escrevendo no store em memória
And    mutações persistem durante a sessão (ex: mover lead, marcar tarefa)
```

### AC-3: Fixtures e personas
```gherkin
Given  src/mocks/
When   inspeciono
Then   há personas (clientes fictícios) com jornadas em estados diferentes
       (recém-contratado, meio da Fase 2, aguardando USCIS, aprovado)
And    há leads em vários estágios do kanban, conversas WhatsApp, documentos, pagamentos, reuniões, transcrições
And    os dados são plausíveis e em PT-BR (com contrapartes EN quando aplicável)
```

### AC-4: Container de DI
```gherkin
Given  app/di.ts
When   a aplicação resolve um repositório
Then   recebe a implementação Mock (nesta fase, sempre)
And    trocar para Supabase no futuro é mudar só o container (documentado no código)
And    a UI nunca importa Mock*/adapter diretamente — só via use cases/hook de acesso
```

### AC-5: Latência simulada e reset
```gherkin
Given  os adapters mock
When   habilito o modo "latência simulada"
Then   as leituras têm um pequeno delay (realismo na demo)
And    existe uma ação "resetar demo" que re-semeia o store a partir das fixtures
```

## Out of Scope
- Qualquer chamada real de rede/Supabase.
- Telas que consomem os dados (ficam nas features das E01–E05).

## Notas de implementação
- Store: `useMockDb` (Zustand) semeado das fixtures; `Mock*Repository` operam sobre ele.
- Use cases em `application/` recebem a porta; expor hooks tipo `useLeads()`, `useJornada()` que
  internamente chamam use cases via container.
- Tipos de domínio (entidades) definidos em `domain/` de cada feature — base do futuro schema Supabase.
- Ver `design.md` desta story para os contratos de porta.
