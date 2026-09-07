---
name: DESIGN
description: Veredito da avaliação (dieta do chunk de entrada já atingida como efeito colateral de E13-S11/E15-S01) e desenho da regra anti-regressão — E15-S02.
story: E15-S02
alwaysApply: false
---

# design.md — E15-S02 Dieta do chunk de entrada

**Tier:** pequeno. Este documento existe porque a decisão do que a regra cobre (e do que ela
deliberadamente não cobre) é fácil de reverter errado daqui a seis meses sem o porquê escrito.

## O veredito da avaliação

A pergunta do ROADMAP era "o container assíncrono ainda vale depois de E13-S09+?". Resposta:
**não como trabalho — sim como gate.** Em 2026-08-31 (E15-S01) o `di.ts` ainda puxava `src/mocks/`
e `@supabase/supabase-js` para o chunk de entrada. Em 2026-09-06 o entry importa estaticamente
apenas `vendor-react` e `vendor-i18n`; a camada de dado inteira está em chunks lazy:

- as páginas já eram lazy desde E15-S01 (`rota()` + `import()`);
- E13-S09/E13-S11 adotaram o padrão `*RealPage` — a rota real importa
  `app/real-repositories.ts`, que é uma **composição preguiçosa**: o módulo só carrega quando a
  rota real executa (fora do demo, nunca no site institucional);
- o que sobrou no demo (`mocks/store`, `AdminDemoNotifications`, `DemoBar`) também é lazy —
  `AdminLayout`/`PortalLayout` carregam esses componentes com `lazy(() => import(...))`.

Ou seja: ninguém decidiu "fazer a dieta" — ela aconteceu quando o último consumidor estático do
container desapareceu. É exatamente o cenário em que anti-regressão em gate vale mais que
documento: sem regra, o próximo `import { container } from "@/app/di"` colado num layout devolve
~280 kB de supabase-js+mocks ao primeiro paint e nenhum teste existente reclama.

## Desenho do gate

Regra `entrada-nao-puxa-mocks-nem-supabase` em `.dependency-cruiser.cjs`, severity `error`:

- **`from`** — o esqueleto estático de entrada: `main.tsx`, `app/(App|router|rota|sessao-service)`,
  os três layouts (`shared/layout/(Public|Portal|Admin)Layout`), `shared/i18n/config` e o bootstrap
  de sessão (`features/sessao/application/hooks`, `features/sessao/interfaces/RequireRole`). É
  onde uma importação estática tem efeito de bundle: tudo nesse conjunto vai no chunk do entry.
- **`to`** — a camada de dado: `src/mocks/**`, `**/infrastructure/Supabase*` (arrasta
  `@supabase/supabase-js`), `app/di` e `app/real-repositories`.
- **Teste** em `scripts/arch-rules.test.mjs`: fixture com `main → App → di` estático afirma saída
  não-zero (invariante 1 de E00-S06 — gate provado falhar).

### Decisões deliberadas (não reverter sem reler isto)

- **`shared/layout/` inteiro NÃO está no `from`.** `AdminDemoNotifications.tsx` e
  `PortalDemoNotifications.tsx` moram nessa pasta e importam `@/mocks/store` — com razão: são
  chunks exclusivos da demo, carregados por `lazy()`. Pôr a pasta inteira no `from` faria a regra
  disparar no estado correto atual. O que a regra protege é o **arquivo do layout** — quem decide
  o que entra no chunk do entry.
- **`app/di` e `app/real-repositories` são `to`, nunca `from`.** O container importar tudo
  estaticamente é o desenho (ADR-0002: trocar adapter = trocar uma linha no container). O que o
  mantém fora do entry é só e somente a discipline de consumidores lazy — e é isso que o gate trava.
- **Arestas diretas, não transitividade.** A regra vê `entry → alvo proibido`. Uma cadeia
  `entry → módulo novo → di.ts` escaparia; é aceito porque o único caminho de módulos novos até o
  entry hoje passa por `router.tsx` (que só usa `import()`) ou pelos layouts (revisados por esta
  regra). Se um dia um módulo intermediário estático aparecer, o `from` ganha uma linha — com
  teste.

## Alternativa descartada: container assíncrono

Transformar toda porta em `Promise<Porta>` resolveria o problema na origem (nada na camada de
aplicação importaria adapter), mas é mudança de arquitetura que toca **toda** feature — e hoje o
problema que ela resolveria não existe mais: a medição de 2026-09-06 mostra o entry em dieta sem
ela. Decisão registrada em E15-S01 e mantida aqui: contenção de falha (E15-S01) e dieta de bundle
(E15-S02) foram desacopladas desde o início.
