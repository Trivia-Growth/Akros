---
name: SPEC
description: Dashboard admin (métricas do negócio).
story: E03-S05
tier: pequeno
alwaysApply: false
---

# SPEC — Dashboard Admin (E03-S05)

## User Story
Como **admin/gestor**, quero **um painel com as métricas do negócio ao entrar em /admin**, para que
**eu tenha visão rápida do funil, dos casos e da operação**.

## Contexto
Home do `/admin`. Agrega dados (mock) de `crm` (leads/clientes), `jornada` (fases), `pagamentos`,
`agenda`. Só leitura + atalhos. impeccable + dataviz (usar a skill `dataviz` para os gráficos).

## Seções / Widgets
1. **Funil de leads** — contagem por estágio do kanban (6 colunas) + taxa de conversão Lead→Fechado.
2. **Clientes por fase** — distribuição dos clientes ativos nas 6 fases da jornada.
3. **Saúde dos casos** — semáforo (em dia / atenção / atrasado) agregando os clientes.
4. **Receita** — pago vs pendente vs atrasado (soma dos pagamentos); ticket médio.
5. **Agenda** — próximas reuniões (contagem + lista curta das próximas).
6. **Atividade recente** — timeline curta (novos leads, fases liberadas, propostas enviadas).

## Acceptance Criteria

### AC-1: Widgets com dados agregados
```gherkin
Given  /admin
When   acesso
Then   vejo os widgets (funil de leads, clientes por fase, saúde dos casos, receita, agenda, atividade)
And    os números correspondem à agregação dos dados mockados do cenário atual
```

### AC-2: Gráficos legíveis (dataviz)
```gherkin
Given  os widgets com gráfico (funil, distribuição por fase, receita)
When   avalio
Then   os gráficos seguem a skill dataviz (cores acessíveis, legendas, eixos claros)
And    funcionam em light/dark e são responsivos (scroll interno se necessário)
```

### AC-3: Atalhos navegáveis
```gherkin
Given  um widget (ex: funil de leads)
When   clico num estágio/cartão
Then   sou levado à tela correspondente (ex: /admin/leads filtrado por estágio)
```

### AC-4: Reatividade ao cenário/mutação
```gherkin
Given  uma mudança no mock db (novo lead, fase liberada, pagamento) ou troca de cenário (E05-S02)
When   volto ao dashboard
Then   as métricas refletem o novo estado
```

### AC-5: i18n + impeccable
```gherkin
Given  o dashboard
When   troco idioma / avalio design
Then   textos e números formatam por locale (Intl); impeccable + dataviz passam
```

## Out of Scope
- Filtros de período avançados / export. Métricas históricas (sem série temporal real nos mocks).
- Configuração de widgets pelo usuário.

## Notas de implementação
- Feature `crm` agregando via portas (não acessar mocks direto — usar use cases). Ver ADR-0002.
- Usar a skill **dataviz** antes de escrever qualquer gráfico. Formatação monetária/percentual com `Intl`.
- "Saúde do caso" reutiliza o critério definido na visão 360 (E03-S02) — manter consistente.
