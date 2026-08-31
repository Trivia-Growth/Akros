---
name: DESIGN
description: Desenho das 3 camadas de isolamento de falha (lazy por frente, Error Boundary por rota, retry de chunk) — E15-S01.
story: E15-S01
alwaysApply: false
---

# design.md — E15-S01 Resiliência de módulo

**Tier:** arquitetural. Introduz uma fronteira de falha que passa a valer para toda tela futura,
e muda a forma do bundle — decisão cara de reverter depois que outras stories dependerem dela.

## Estado atual (medido em 2026-08-30)

```
dist/assets/index--QuD_SbF.js   850.74 kB │ gzip: 236.92 kB   ← chunk único
dist/assets/index-D9r2dt7f.css   63.69 kB │ gzip:  11.01 kB
```

Um único chunk contém site + portal + admin. `grep -rn "ErrorBoundary\|React.lazy\|Suspense"` em
`apps/web/src` devolve zero ocorrências.

## Camada 1 — `React.lazy` por frente

O roteamento já separa as três frentes em shells distintos (`PublicLayout`, `PortalLayout`,
`AdminLayout`), então a fronteira de código já existe — falta só materializá-la no bundle.

- Cada frente vira um `React.lazy(() => import(...))` no ponto onde a rota é montada.
- Dentro do admin, split adicional **por rota**: é a frente mais pesada (`features/crm/interfaces`
  sozinha tem 2.602 linhas) e a menos usada por visitante.
- `Suspense` com fallback de esqueleto reaproveitando `shared/ui/Skeleton.tsx` — não inventar
  componente de loading novo.

**Por que isso é resiliência e não só performance:** chunk separado significa que o parse e a
execução do código do admin **não acontecem** numa sessão de visitante. Um erro de módulo no admin
deixa de ser alcançável a partir do site.

## Camada 2 — `ErrorBoundary` por rota

Um boundary só na raiz não resolve nada: ele captura e some com a árvore inteira, que é o
comportamento atual. O boundary tem que estar **abaixo** do shell de navegação, para que a barra
lateral e o menu sobrevivam à queda do conteúdo.

```
<PortalLayout>            ← navegação viva
  <ErrorBoundary>         ← fronteira de falha
    <Suspense>
      <Rota />            ← só isto morre
```

O fallback mostra: o que quebrou (nome da rota), um botão **Tentar de novo** que remonta a
subárvore por troca de `key`, e um link para uma rota conhecida como boa. Sem stack trace na tela
para o usuário final — a stack vai para o sink de erro (E16).

`componentDidCatch` não captura erro em handler assíncrono nem em `Promise` rejeitada. Isso é
limite conhecido do React e fica registrado aqui para não virar surpresa: erro de I/O continua
sendo responsabilidade de quem chama a porta, e a checagem disso é a Frente 2 da
`/revisao-adversarial`.

## Camada 3 — Retry no `import()` dinâmico

Causa mais comum de tela branca em SPA com code-splitting: o usuário está com a aba aberta, um
deploy novo sobe, os arquivos com hash antigo somem do CDN e o próximo `import()` falha com
`Failed to fetch dynamically imported module`. Sem tratamento, isso é indistinguível de um bug.

Envelope: `carregarComRetry(() => import("..."))` — 2 tentativas com espera curta; se ainda
falhar, o boundary da Camada 2 assume e o fallback oferece **recarregar a página** (que busca o
`index.html` novo e resolve o caso do deploy). Distinguir os dois casos importa: recarregar
resolve chunk obsoleto e não resolve bug de render.

## Regra de arquitetura que nasce aqui

A intenção era "frente não importa frente". A implementação mostrou que a formulação estava
errada: portal e admin **compartilham bounded context de propósito** (`crm` tem a `PerfilPage`, do
portal, e a `Clientes360Page`, do admin). A regra virou o que é verdade e é verificável:
**`features/site` não importa outro domínio, e nenhum domínio importa `features/site`** — duas
regras em `.dependency-cruiser.cjs`, com teste em `scripts/arch-rules.test.mjs` provando que elas
falham quando a importação cruzada é introduzida de propósito. Ver AC-6 da `spec.md`.

Entre portal e admin o isolamento é de **chunk** e de **fronteira de falha**, não de importação —
que é o que as camadas 1 e 2 entregam.

**Achado de brinde ao escrever o teste do gate:** `tsPreCompilationDeps` estava no default
(`false`), então o dependency-cruiser **não enxergava `import type`** — a violação mais fácil de
cometer sem perceber (`domain/` importando um tipo de `infrastructure/`) passava verde. Ligado; o
código real continuou limpo, e o número de dependências analisadas subiu de 542 para 593. Um teste
específico impede que a opção seja desligada de novo sem ninguém notar.

## Alternativas descartadas
- **Boundary só na raiz:** simples e inútil — é o comportamento de hoje com mensagem mais bonita.
- **Três apps Vite separados:** isolamento perfeito, mas quebra a navegação entre frentes e
  triplica o custo de build e deploy. Desproporcional para um produto com um domínio só.
- **Só code-splitting, sem boundary:** reduz o alcance do erro mas não impede a tela branca dentro
  da frente afetada.
