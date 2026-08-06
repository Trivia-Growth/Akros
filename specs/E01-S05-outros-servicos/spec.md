---
name: SPEC
description: Página Outros Serviços (categorias).
story: E01-S05
tier: pequeno
---

# SPEC — Outros Serviços (E01-S05)

## User Story
Como **visitante**, quero **ver as categorias de atendimento além do EB-2 NIW**, para que **eu veja se
meu caso é atendido**.

## Conteúdo (real)
- **Profissionais Qualificados** — bacharéis com experiência → Green Card.
- **Atletas & Artistas** — vistos de trabalho ou Green Card.
- **Trabalhadores Religiosos** — convite para igrejas nos EUA (pastoral/técnico).
- **Legalização** — quem já está nos EUA buscando mudança de status/Green Card.

## Acceptance Criteria

### AC-1: 4 categorias com descrição real
```gherkin
Given  /servicos
When   acesso
Then   vejo as 4 categorias com descrições reais e CTA para lead
```

### AC-2: i18n + impeccable + responsivo
```gherkin
Given  a página
When   troco idioma / avalio
Then   traduz; responsivo; impeccable passa
```

## Out of Scope
- Detalhe jurídico por categoria.

## Notas
- Feature `site`. Cards reutilizando design system.
