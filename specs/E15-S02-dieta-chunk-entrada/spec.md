---
name: SPEC
description: Contrato (AC) da dieta do chunk de entrada — formalizar e travar em gate o que E13-S11/E15-S01 já entregaram como efeito colateral. E15-S02.
story: E15-S02
tier: pequeno
alwaysApply: false
---

# spec.md — E15-S02 Container assíncrono / dieta do chunk de entrada

Ver `design.md` para o veredito da avaliação e o desenho do gate. Tier pequeno: é formalização
com anti-regressão, não mudança de arquitetura.

## Contexto

A story nasce da `SPEC_DEVIATION` registrada em E15-S01 (AC-4): `app/di.ts` importa todos os
adapters estaticamente, o que na época arrastava `src/mocks/` e `@supabase/supabase-js` para o
chunk de entrada. A avaliação pedida pelo ROADMAP ("avaliar se ainda vale depois de E13-S09+")
concluiu que **o objetivo já foi atingido como efeito colateral de E13-S11/E15-S01**: todos os
consumidores do container são lazy (página em chunk próprio ou composição preguiçosa em
`real-repositories.ts`), então a camada de dado saiu do caminho estático do entry.

Medido em 2026-09-06 (`pnpm build`, método: regex de imports estáticos no `index-*.js` do dist):

```
estáticos do entry: index 312,26 kB + vendor-react 103,48 kB + vendor-i18n 56,45 kB
lazy:  SupabaseClienteRepository 222,54 kB (supabase-js) · store (mocks) 62,38 kB ·
       real-repositories 23,71 kB · 60+ chunks de página
```

## Fora de escopo
- Container assíncrono (portas resolvendo por Promise). Avaliado e rejeitado — ver `design.md`.
- Meta de tamanho absoluta do entry (número alvo). A regra é estrutural (o que não pode entrar),
  não numérica.
- Dieta dos chunks lazy (perfis de preload, divisão de `store`). Outra história.

## Acceptance Criteria

### AC-1 — Grafo estático do entry não inclui a camada de dado
**Given** o esqueleto de entrada (`main.tsx`, `app/App.tsx`, `app/router.tsx`, `app/rota.tsx`,
`app/sessao-service.ts`, os três layouts e o bootstrap de sessão/i18n)
**When** `pnpm run arch:check` roda
**Then** a regra `entrada-nao-puxa-mocks-nem-supabase` falha (exit 1) qualquer importação
estática de `src/mocks/**`, `**/infrastructure/Supabase*`, `app/di` ou `app/real-repositories` a
partir desse conjunto.

### AC-2 — Anti-regressão em gate, não em promessa
**Given** a regra do AC-1
**Then** existe teste que prova que ela **falha** quando um módulo de entrada importa o container
(`app/di`) estaticamente — invariante 1 de `specs/E00-S06-invariantes-padrao-os/`: gate que nunca
foi visto falhar não vale nada.

### AC-3 — Divergência de E15-S01 fechada com justificativa
**Given** `apps/web/src/app/di.ts`
**Then** a marcação `SPEC_DEVIATION` (E15-S01, AC-4) foi removida e substituída pela
justificativa do desenho atual (container estático por design, consumidores lazy, gate como
anti-regressão apontando para E15-S02); e as referências à divergência em E15-S01 (`tasks.md`,
`evidence/chunks.md`) constam como fechadas nesta story.
