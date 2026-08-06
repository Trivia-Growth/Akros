---
name: SPEC
description: Página Quem Somos.
story: E01-S02
tier: pequeno
---

# SPEC — Quem Somos (E01-S02)

## User Story
Como **visitante**, quero **conhecer a história e o time da Akros**, para que **eu confie na empresa**.

## Conteúdo (real)
- Narrativa da empresa (consultoria especializada, suporte personalizado a profissionais qualificados).
- **Natalia Luz** (CEO): advogada PUC/SP (2010), 14+ anos em direito civil e propriedade intelectual,
  Green Card 2020 por habilidade excepcional.
- **Dra. Denise Sarchiapone** (advogada parceira — confirma estratégia).
- Valores: transparência, profissionalismo, acompanhamento próximo. +300 famílias atendidas.

## Acceptance Criteria

### AC-1: Página renderiza conteúdo real
```gherkin
Given  /quem-somos
When   acesso
Then   vejo a história da empresa, o perfil da CEO Natalia Luz e a advogada parceira
And    o conteúdo corresponde ao negócio real (sem inventar)
```

### AC-2: i18n + responsivo + impeccable
```gherkin
Given  a página
When   troco idioma e avalio em mobile/desktop
Then   textos traduzem; layout responsivo; checklist impeccable passa
```

## Out of Scope
- Fotos reais do time (usar placeholders/avatares se não houver ativos).

## Notas
- Feature `site`. Textos em `locales/*/site.json`.
