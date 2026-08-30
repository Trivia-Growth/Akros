---
name: DESIGN
description: Schemas agenda e programas — quinta réplica do padrão; programas é o segundo caso "sem cliente_id".
story: E13-S04
alwaysApply: false
---

# design.md — E13-S04 Schema `agenda` + `programas`

Mecanismo já fechado em E13-S01/S02/S03. Só o novo:

## `agenda`
`reunioes` (cliente-scoped) + `transcricoes` (via `reuniao_id`) — mesma forma de
`documentos`/`solicitacoes_assinatura`. Sem JSONB (nenhum campo aninhado no domínio).

## `programas` — segundo caso "sem `cliente_id`"
ADR-0004/ADR-0009: catálogo de programas é **global** da Akros, não por cliente. Mesma forma de
`pagamentos.dados_recebimento` (E13-S03): todo autenticado lê, só admin escreve. `fasesTemplate`
(com `etapas` aninhadas) e `documentosExigidos` viram **JSONB** — ao contrário de
`jornada.fases`/`etapas` (instâncias, consultadas entre clientes pelo painel de gargalos), aqui é
**template versionado congelado como bloco** (ADR-0004: "a versão usada fica congelada na
jornada") — nunca consultado por subcampo através de programas diferentes.

## Fora de escopo
`comunicacao` — story própria (E13-S05, maior). `audit`/`lgpd` — E13-S06/S07.
