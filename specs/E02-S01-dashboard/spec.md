---
name: SPEC
description: Dashboard do cliente (visão geral da jornada gamificada).
story: E02-S01
tier: pequeno
---

# SPEC — Dashboard do Cliente (E02-S01)

## User Story
Como **cliente**, quero **uma visão geral do meu processo ao entrar no portal**, para que **eu saiba
onde estou, o que já fiz e o que vem a seguir**.

## Contexto
Home do `/portal`. Consome `JornadaRepository`/`ProgressoRepository` (mock) do cliente ativo
(definido por impersonação — E05). Elemento de gamificação visível.

## Seções
1. **Saudação** — "Olá, {nome}" + tipo de visto (EB-2 NIW) + case manager.
2. **Progresso da jornada** — barra/stepper das 6 fases (Introdução + 5), fase atual destacada,
   fases bloqueadas com cadeado, % de conclusão.
3. **Próximas ações** — tarefas pendentes da fase atual (com CTA para agir).
4. **Cards de atalho** — Documentos (pendências), Pagamentos (status), Próxima reunião.
5. **Avisos** — mensagens/novidades (ex: "Fase 2 liberada pelo seu case manager").

## Acceptance Criteria

### AC-1: Visão geral com progresso
```gherkin
Given  um cliente ativo (impersonado) com jornada em andamento
When   acesso /portal
Then   vejo saudação, o stepper das 6 fases com a fase atual destacada e as futuras bloqueadas
And    vejo o percentual de conclusão da jornada
```

### AC-2: Próximas ações da fase atual
```gherkin
Given  a fase atual tem tarefas pendentes
When   olho o dashboard
Then   vejo a lista de próximas ações com CTA que leva à jornada/documento correspondente
```

### AC-3: Cards de atalho refletem estado real (mock)
```gherkin
Given  documentos/pagamentos/reuniões do cliente
When   vejo os cards de atalho
Then   mostram contagens/status coerentes com os dados mockados do cliente
```

### AC-4: Estados por cenário
```gherkin
Given  diferentes personas (recém-contratado, meio da Fase 2, aguardando USCIS, aprovado)
When   impersono cada uma
Then   o dashboard reflete o estado correto de cada jornada
```

### AC-5: i18n + impeccable + responsivo
```gherkin
Given  o dashboard
When   troco idioma / avalio
Then   traduz; responsivo; impeccable (gamificação clara e elegante) passa
```

## Out of Scope
- Detalhe de cada fase (E02-S02). Ações de documento/pagamento/agenda (E02-S03/05/06).

## Notas
- Gamificação: badges/conquistas por fase concluída são bem-vindos (ver sugestões no ROADMAP).
- Feature `jornada`. Cliente ativo vem de `useDemoSession` (E05).
