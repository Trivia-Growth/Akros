---
name: SPEC
description: Contrato (AC) dos invariantes do Padrão OS — o que precisa estar verde para a esteira virar template. E00-S06.
story: E00-S06
tier: arquitetural
alwaysApply: false
---

# spec.md — E00-S06 Invariantes do Padrão OS

Ver `design.md` para a análise de cada invariante, o gate e o custo de retrofit.

## Fora de escopo
- Extrair a esteira para um repositório de template. Aqui só se define o que ela precisa garantir.
- Invariante 2 (contrato porta × adapter) aplicado retroativamente às portas mockadas — decisão
  registrada no `design.md`: vale de E13 em diante.
- Teste de modo degradado para integração mockada — mesma razão, ver `design.md`, invariante 4.

## Acceptance Criteria

### AC-1 — Nenhum gate sem teste do próprio gate
**Given** o diretório `scripts/`
**When** `node scripts/check-gate-coverage.mjs` roda
**Then** ele falha se algum `<nome>.mjs` que age como gate não tiver `<nome>.test.mjs`, e cada teste
existente contém ao menos um caso que afirma saída não-zero.

### AC-2 — Gate que avalia zero itens é falha
**Given** qualquer gate que varre uma coleção (specs, migrations, Edge Functions)
**When** a coleção resulta vazia
**Then** o gate sai com código diferente de zero e diz que o filtro pode estar quebrado — nunca
reporta sucesso.

### AC-3 — Frente não importa frente
**Given** `apps/web/src/features/`
**When** `pnpm run arch:check` roda
**Then** importação entre site, portal e admin falha o gate, e existe teste que prova que a regra
**falha** quando uma importação cruzada é introduzida de propósito.

### AC-4 — Falha de uma frente não propaga
**Given** um componente de uma frente que lança no render
**When** a árvore de rotas é montada
**Then** as demais frentes continuam renderizando (mesmo teste de `E15-S01` AC-1).

### AC-5 — Toda integração externa declara seu modo degradado
**Given** uma integração externa citada no catálogo de `/admin/configuracoes`
**When** `node scripts/check-degraded-mode.mjs` roda
**Then** ele falha se a integração não tiver, no `design.md` da story que a introduziu, o que a
plataforma faz quando ela está fora.
