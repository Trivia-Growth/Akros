---
name: SPEC
description: Custo de IA nas conversas — exibe custo acumulado (USD) das conversas atendidas por agente_ia no inbox admin.
story: E04-S05
tier: pequeno
alwaysApply: false
---

# SPEC — Custo de IA nas conversas (E04-S05)

## User Story
Como **admin**, quero **ver quanto custou (em dólar) o atendimento por IA de cada conversa**, para
que **eu tenha visibilidade do custo operacional do agente de IA no inbox**.

## Contexto
Consome dado mockado — sem LLM real, sem billing real (ver `E04-S02-agentes-ia`, out of scope: "LLM
real / integração"). `Conversa` (inbox WhatsApp, E04-S01) ganha um campo de custo acumulado, exibido
no admin `/admin/comunicacao` (aba Inbox), perto do badge "Atendido por IA" já existente. Total por
conversa, não por mensagem — granularidade por mensagem fica fora de escopo.

## Acceptance Criteria

### AC-1: Badge de custo na lista de conversas
```gherkin
Given uma conversa no inbox com atendidoPorIA = true e custoIA definido
When  vejo a lista de conversas em /admin/comunicacao (aba Inbox)
Then  vejo, junto ao badge "Atendido por IA", um badge com o custo formatado em dólar
      (ex: "US$ 0,03")
```

### AC-2: Custo no cabeçalho da conversa aberta
```gherkin
Given a mesma conversa acima está selecionada/aberta
When  vejo a conversa no painel da direita
Then  vejo o custo total de IA da conversa exibido no cabeçalho da conversa
```

### AC-3: Conversa sem atendimento por IA não mostra custo
```gherkin
Given uma conversa com atendidoPorIA = false (sem custoIA)
When  vejo essa conversa na lista ou aberta
Then  nenhum badge/label de custo é exibido — nem "US$ 0,00"
```

### AC-4: Formatação de moeda
```gherkin
Given um valor de custoIA (número, dólares)
When  é exibido em qualquer lugar da UI
Then  usa Intl.NumberFormat com style "currency" e currency "USD", mesmo padrão de
      apps/web/src/features/pagamentos/interfaces/PagamentosPage.tsx (função formatarValor)
```

### AC-5: i18n + impeccable
```gherkin
Given a tela de comunicação (inbox)
When  troco idioma / avalio o layout
Then  o label de custo traduz (pt-BR/en); impeccable passa
```

## Out of Scope
- Custo por mensagem individual (só total por conversa).
- Tokens consumidos, breakdown de modelo/provider.
- Cálculo real de custo (LLM real, billing de provider) — permanece dado mockado fixo por conversa,
  como todo o protótipo (ver `docs/STATE.md`).
- Agregação de custo por período/dashboard (ex: custo total do mês) — fica para épico futuro se
  necessário.

## Notas de implementação
- `Conversa.custoIA?: number` em `apps/web/src/features/comunicacao/domain/types.ts` (opcional;
  presente só quando `atendidoPorIA`).
- Popular fixture mockada em `apps/web/src/mocks/conversas.ts` para a conversa já atendida por IA
  (`conversa-lead-juliana`).
- UI em `apps/web/src/features/comunicacao/interfaces/ComunicacaoPage.tsx` — badge reaproveitando
  `Badge` de `@/shared/ui`, ao lado do badge existente `handledByAI`.
- i18n: nova chave `comunicacao.aiCost` em `admin.json` (pt-BR e en).
