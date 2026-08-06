---
name: SPEC
description: Blog (lista + post) com conteúdo mockado.
story: E01-S06
tier: pequeno
alwaysApply: false
---

# SPEC — Blog (E01-S06)

## User Story
Como **visitante**, quero **ler conteúdos sobre imigração**, para que **eu me informe e confie na Akros**.

## Conteúdo (tópicos reais do site)
Requisitos do EB-2 NIW · onde aplicar para o visto americano · guia de residência legal para
brasileiros · Green Card sem patrocínio de empregador. (Posts mockados, textos placeholder plausíveis.)

## Acceptance Criteria

### AC-1: Lista de posts
```gherkin
Given  /blog
When   acesso
Then   vejo cards de posts (título, resumo, data, categoria, imagem/placeholder)
```

### AC-2: Página de post
```gherkin
Given  a lista
When   clico em um post
Then   vejo /blog/:slug com título, conteúdo, data e CTA para lead
```

### AC-3: i18n + impeccable + responsivo
```gherkin
Given  blog e post
When   troco idioma / avalio
Then   traduz; responsivo; impeccable passa
```

## Out of Scope
- CMS real. Comentários. SEO avançado.

## Notas
- Posts em `mocks/`. Feature `site`. Conteúdo marcado como exemplo.
