---
name: SPEC
description: Página de Vistos (todos os tipos).
story: E01-S03
tier: pequeno
alwaysApply: false
---

# SPEC — Vistos (E01-S03)

## User Story
Como **visitante**, quero **ver os tipos de visto e para quem servem**, para que **eu identifique o meu**.

## Conteúdo (real — ver glossary.md)
- **Imigrantes:** EB-1, EB-2, **EB-2 NIW** (destaque), EB-3, EB-4.
- **Não-imigrantes:** F-1, L-1, E-2, P-1, R, H-1B, H-2B.
- Para cada: nome, para quem, requisito principal, benefício. EB-2 NIW em destaque.

## Acceptance Criteria

### AC-1: Lista completa com categorias
```gherkin
Given  /vistos
When   acesso
Then   vejo os vistos agrupados em Imigrantes e Não-imigrantes
And    cada visto mostra descrição/elegibilidade reais
And    EB-2 NIW tem destaque visual
```

### AC-2: Filtro/navegação por categoria
```gherkin
Given  a página de vistos
When   filtro por "Imigrantes" ou "Não-imigrantes"
Then   a lista atualiza conforme a categoria
```

### AC-3: CTA para lead
```gherkin
Given  um card de visto
When   clico em "Falar com especialista"
Then   sou levado ao formulário de lead (E01-S07) com o tipo de visto pré-selecionado
```

### AC-4: i18n + impeccable
```gherkin
Given  a página
When   troco idioma / avalio design
Then   traduz; responsivo; impeccable passa
```

## Out of Scope
- Conteúdo jurídico aprofundado por visto. Preços.

## Notas
- Dados dos vistos em `mocks/` (conteúdo institucional) ou `locales`. Feature `site`.
