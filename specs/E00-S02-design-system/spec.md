---
name: SPEC
description: Design System Akros (impeccable) — tokens + componentes base.
story: E00-S02
tier: pequeno
alwaysApply: false
---

# SPEC — Design System impeccable (E00-S02)

## User Story
Como **desenvolvedor**, quero **um design system com a identidade Akros e componentes base polidos
(impeccable)**, para que **todas as telas tenham aparência premium e consistente sem retrabalho**.

## Contexto
Identidade: navy `#0D2240`, gold `#C6A254`, cream `#F5F4F0`, borda `#E0DDD5`, texto `#1A1A1A`/`#555`.
Tom premium/sóbrio/aspiracional. Aplicar a skill **impeccable** (5 pilares) em cada componente.

## Acceptance Criteria

### AC-1: Tokens de design
```gherkin
Given  o design system
When   inspeciono os tokens (tailwind.config + CSS vars)
Then   existem cores da marca, escala tipográfica harmônica (12→48), escala de radius (4/8/12),
       escala de espaçamento e 1-2 níveis de shadow
And    há uma fonte com personalidade configurada (não a default do sistema)
```

### AC-2: Componentes base
```gherkin
Given  shared/ui/
When   listo os componentes
Then   existem no mínimo: Button (variантes primary/secondary/ghost + estados),
       Card, Badge, Input, Textarea, Select, Modal/Dialog, Tabs, Progress/Stepper,
       Avatar, Tooltip, Toast, Skeleton
And    cada um respeita os tokens e tem estados hover/focus/active/disabled distintos
```

### AC-3: Acessibilidade e responsividade
```gherkin
Given  qualquer componente
When   navego por teclado e verifico contraste
Then   foco é visível, contraste atinge WCAG AA
And    componentes são responsivos (mobile-first)
And    prefers-reduced-motion é respeitado nas animações
```

### AC-4: Showcase (storybook-like)
```gherkin
Given  uma rota interna /dev/ui (só em dev)
When   acesso
Then   vejo todos os componentes e variantes renderizados para revisão visual
```

### AC-5: impeccable
```gherkin
Given  os componentes
When   aplico o checklist impeccable (Definition-of-Done seção 7)
Then   spacing/typography/color/interaction/consistency passam
And    o resultado não parece "gerado por IA" (peer review humano aprova)
```

## Out of Scope
- Componentes específicos de feature (kanban card, journey stepper de negócio) — ficam nas features.
- Dark mode completo (opcional; deixar tokens preparados).

## Notas de implementação
- Preferir headless primitives acessíveis (ex: Radix) + estilização Tailwind, OU componentes próprios.
- Ícones: **um único set** (ex: lucide-react). Não misturar sets.
- Documentar tokens em `shared/ui/tokens`. Fonte via `@fontsource` ou similar (self-host).
- Consumir `.claude/skills/impeccable/SKILL.md` e preencher `checklist-antes-depois.md` no PR.
