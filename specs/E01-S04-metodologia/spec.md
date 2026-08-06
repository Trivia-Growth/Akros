---
name: SPEC
description: Página Metodologia (7 passos).
story: E01-S04
tier: pequeno
---

# SPEC — Metodologia (E01-S04)

## User Story
Como **visitante**, quero **entender como a Akros trabalha passo a passo**, para que **eu saiba o que esperar**.

## Conteúdo (real — 7 passos)
1. Análise de perfil e objetivos
2. Consulta com especialista em imigração (+ orçamento)
3. Consulta com advogada parceira (Dra. Denise Sarchiapone) — confirma estratégia
4. Contrato + pagamento inicial (opções de financiamento)
5. Organização de documentos e formulários (case managers)
6. Aprovação do cliente + envio à USCIS
7. Preparação para relocation

## Acceptance Criteria

### AC-1: 7 passos visuais
```gherkin
Given  /metodologia
When   acesso
Then   vejo os 7 passos em sequência visual (timeline/stepper) com títulos e descrições reais
```

### AC-2: Conexão com a jornada
```gherkin
Given  a metodologia
When   leio
Then   fica claro que os passos 4-7 correspondem à jornada do portal do cliente (intro + 5 fases)
```

### AC-3: i18n + impeccable + responsivo
```gherkin
Given  a página
When   troco idioma / avalio
Then   traduz; responsivo; impeccable passa
```

## Out of Scope
- Detalhamento de prazos por passo (fica na jornada do portal).

## Notas
- Reutilizar componente de stepper/timeline do design system. Feature `site`.
