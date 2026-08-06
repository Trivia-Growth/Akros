---
name: SPEC
description: i18n PT-BR + EN com react-i18next.
story: E00-S03
tier: pequeno
alwaysApply: false
---

# SPEC — i18n PT-BR + EN (E00-S03)

## User Story
Como **usuário**, quero **alternar entre português e inglês**, para que **eu use a plataforma no meu
idioma**. Como **desenvolvedor**, quero **toda string via i18n**, para que **nada fique hardcoded**.

## Contexto
Ver ADR-0001. react-i18next; locales `pt-BR` (default) e `en`; namespaces `common/site/portal/admin`.

## Acceptance Criteria

### AC-1: Setup i18n
```gherkin
Given  o app
When   inicializo
Then   react-i18next está configurado com pt-BR (default/fallback) e en
And    a detecção inicial segue localStorage → navegador → pt-BR
```

### AC-2: Toggle de idioma
```gherkin
Given  qualquer tela com o seletor de idioma
When   troco de PT para EN
Then   os textos visíveis mudam de idioma imediatamente (sem reload)
And    a escolha persiste em localStorage (sobrevive ao reload)
```

### AC-3: Namespaces por feature
```gherkin
Given  a estrutura de locales
When   inspeciono shared/i18n/locales/<lng>/
Then   existem arquivos common.json, site.json, portal.json, admin.json
And    componentes consomem via t('namespace:chave')
```

### AC-4: Sem texto hardcoded (regra)
```gherkin
Given  qualquer componente de UI entregue
When   reviso o código
Then   não há strings literais visíveis ao usuário fora do i18n
And    chaves faltantes caem no fallback pt-BR (sem quebrar)
```

## Out of Scope
- Tradução completa de todo o conteúdo institucional agora (EN pode ser resumido/placeholder marcado
  `[EN-TODO]` nos mocks). A infra e as chaves devem existir.

## Notas de implementação
- `shared/i18n/config.ts` + provider em `app/providers.tsx`.
- Seletor de idioma componente em `shared/ui` ou `shared/layout` (usado em todos os shells).
- Interpolação e plural do i18next disponíveis. Datas/números: usar `Intl` conforme locale.
