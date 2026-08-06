---
name: SPEC
description: Contrato do scaffold do app.
story: E00-S01
tier: pequeno
alwaysApply: false
---

# SPEC — Scaffold do app (E00-S01)

## User Story
Como **desenvolvedor**, quero **o app React 19 + Vite + TS + Tailwind scaffoldado com a estrutura
DDD**, para que **todas as stories seguintes tenham base para plugar**.

## Acceptance Criteria

### AC-1: App sobe em localhost
```gherkin
Given  o repositório com dependências instaladas (pnpm install)
When   executo `pnpm dev`
Then   o Vite sobe o app sem erros
And    acessando localhost vejo uma página inicial placeholder
```

### AC-2: Tailwind ativo com tokens Akros
```gherkin
Given  o app rodando
When   uso classes utilitárias Tailwind e as cores da marca (navy, gold, cream)
Then   os estilos são aplicados
And    as cores da marca estão disponíveis como tokens no tailwind.config
```

### AC-3: Estrutura de pastas DDD
```gherkin
Given  o projeto scaffoldado
When   inspeciono apps/web/src
Then   existem: app/ (router, providers, di), shared/ (ui, i18n, layout, lib),
       features/ (site, jornada, documentos, pagamentos, agenda, crm, comunicacao, demo), mocks/
And    cada feature tem subpastas domain/ application/ infrastructure/ interfaces/ (podem estar vazias com .gitkeep)
```

### AC-4: Gates verdes
```gherkin
Given  o scaffold
When   rodo `pnpm typecheck` e `pnpm build`
Then   ambos passam sem erro
And    `pnpm lint` (biome) passa
```

### AC-5: Path aliases
```gherkin
Given  imports no código
When   importo de "@/shared/..." ou "@/features/..."
Then   o alias resolve (configurado em tsconfig + vite)
```

## Out of Scope
- Design system completo (E00-S02), i18n (E00-S03), mock/DI (E00-S04), rotas reais (E00-S05).
- Qualquer página de negócio.

## Notas de implementação
- App em `apps/web/` (monorepo pnpm já existe; ver `pnpm-workspace.yaml`, `turbo.json`).
- React 19 + Vite + TS. Tailwind v3+ com `tailwind.config.ts` contendo tokens:
  `navy #0D2240`, `gold #C6A254`, `cream #F5F4F0`, `borda #E0DDD5`.
- React Router instalado (uso real em E00-S05).
- Biome já configurado no repo (`biome.json`) — respeitar.
- Scripts em `package.json`: `dev`, `build`, `typecheck`, `lint` (podem já existir do template Sinergica — adaptar).
- Fonte: escolher fonte com personalidade (impeccable) — definir em E00-S02, aqui só deixar o hook.
