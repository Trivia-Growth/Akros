---
name: TASKS
description: Decomposição AC→task→gate de E00-S06.
story: E00-S06
alwaysApply: false
---

# tasks.md — E00-S06 Invariantes do Padrão OS

> Ordem deliberada: os invariantes baratos e de alto retorno primeiro (1 e 3). O invariante 2 não
> tem task aqui — por decisão do `design.md`, ele vira critério de aceitação das stories de E13 em
> diante, não trabalho retroativo.

## Task 1 — Testes dos 8 scripts sem cobertura (AC-1)
`lint-migrations` e `check-story` primeiro (são os que decidem alguma coisa); depois os geradores.
Forma: `scripts/check-edge-functions.test.mjs`.

**Gate:** `node --test scripts/` verde, com ao menos um caso de saída não-zero por script.

**Fechada em 2026-09-06.** `check-gate-coverage.mjs` novo + testes pares criados para
`check-story`, `nova-story`, `prepare-hooks` e `remind-impeccable` (faltavam 4 pares). Bugs
reais encontrados ao escrever os testes e corrigidos no mesmo lote: `nova-story.mjs` procurava
heading `### E0N —` (o real é `## E0N —`) e um schema de tabela de 6 colunas que virou 8 — nunca
inseria a linha certa; ganhou modo `--epico/--story/...` não-interativo (stdin não-TTY travava o
`rl.question()`). `remind-impeccable.mjs` media "achei tasks.md" pelo exit code de `find` (sempre
0) — trocado por leitura direta de `specs/*/tasks.md`. `check-story.mjs` ganhou override de root
(`argv[2]`) só para teste isolado. Gate wireado no `pre-push` (`gate-coverage`).

## Task 2 — `check-gate-coverage.mjs` (AC-1)
Script que falha se um gate de `scripts/` não tem `.test.mjs` par. Tem teste próprio — senão ele
mesmo viola o invariante que verifica.

**Gate:** o próprio script, mais seu teste, verdes no `pre-push`.

## Task 3 — Guarda de "coleção vazia" nos gates que varrem (AC-2)
Aplicado em `eval-spec-fidelity` e `audit-esteira` em 2026-08-30. Falta auditar
`check-edge-functions`, `lint-migrations` e `validate-mermaid` pelo mesmo critério.

**Gate:** por script, um teste que monta coleção vazia e afirma saída não-zero.

**Fechada em 2026-09-06.** Guarda aplicada nos três: `check-edge-functions` (zero pastas de
função → exit 1; antes reportava "0 função(ões) declarada(s)" verde), `lint-migrations` (zero
`.sql` → exit 1; antes "Convenções OK em 0 migration(s)") e `validate-mermaid` (zero blocos
```mermaid varridos → exit 1; era o mais perigoso — qualquer diretório sem diagramas passava).
Casos de coleção vazia adicionados nos testes pares; `validate-mermaid` ganhou teste próprio
(3 casos: válido passa, bloco vazio falha, coleção vazia falha).

## Task 4 — Regra `frente-nao-importa-frente` (AC-3)
Em `.dependency-cruiser.cjs`, mais o teste que prova que a regra falha com importação cruzada
proposital. Compartilhada com `specs/E15-S01-resiliencia-modulo/` task 5.

**Gate:** `pnpm run arch:check` verde; teste do gate verde.

## Task 5 — Teste de não-propagação entre frentes (AC-4)
É a task 2 de `specs/E15-S01-resiliencia-modulo/`. Não duplicar — referenciar.

**Gate:** `pnpm test` verde com o caso de não-propagação.

## Task 6 — `check-degraded-mode.mjs`, metade declaração (AC-5)
Só a checagem documental: integração no catálogo tem seção de modo degradado no `design.md` da
story que a introduziu. A exigência de teste fica suspensa até haver adapter real (ver `design.md`).

**Gate:** o script falha para uma integração sem a seção; teste próprio prova isso.

**Fechada em 2026-09-06 (declaração; exigência de teste funcional continua suspensa até adapter
real).** `check-degraded-mode.mjs` novo: `design.md` da story de origem declara `integracoes:
[slug, ...]` no frontmatter e precisa de seção "Modo degradado" mencionando cada slug. Retrofit
mapeou 8 integrações + evolution para suas stories de origem: retrofit em `E04-S07` (google,
microsoft, calendly — dona das contas conectadas) e `E13-S12` (evolution, openrouter — adapter
real); design.md mínimos criados para as stories pequenas `E04-S01` (whatsapp), `E04-S04`
(fireflies), `E04-S06` (instagram) e `E04-S15` (openrouter, whisper). Slugs derivados do
domínio; `whatsapp` unifica as divergências `whatsapp-cloud`/`whatsapp_oficial`. Gate wireado no
`pre-push` (`degraded-mode`). Hoje: 10 integrações declaradas em 26 design.md varridos.
