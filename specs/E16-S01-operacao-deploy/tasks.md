---
name: TASKS
description: Decomposição AC→task→gate de E16-S01.
story: E16-S01
alwaysApply: false
---

# tasks.md — E16-S01 Operação: preview, headers e telemetria

## Task 1 — Deploy preview por PR (AC-1)
`[context.deploy-preview]` em `netlify.toml` e a integração do Netlify com o repositório.

**Gate:** abrir um PR de teste e confirmar a URL de preview servindo o commit do PR (registrar o
link em `evidence/`).

## Task 2 — CSP `Report-Only` + HSTS (AC-2)
Headers em `netlify.toml`, ao lado dos quatro que já existem. `Report-Only` primeiro, de propósito:
CSP estrita direto em bloqueio quebra fonte inline, `style-src` do Tailwind e a chamada às Edge
Functions sem aviso.

**Gate:** `curl -sI <url-de-preview>` mostra os dois headers; navegar as 3 frentes e listar as
violações relatadas antes de decidir promover para bloqueante.

## Task 3 — Sink de erro ligado ao boundary (AC-3) — depende de E15-S01
`shared/lib/log.ts` ganha um transporte; `ErrorBoundary` reporta no `componentDidCatch`.

**Gate:** teste que provoca o boundary com o transporte mockado e afirma que (a) o evento foi
enviado e (b) o fallback continua renderizando quando o transporte rejeita.

## Task 4 — Serializador que remove PII (AC-4)
Lista de permissão de campos, não lista de bloqueio — bloqueio esquece o campo novo.

**Gate:** teste com evento contendo e-mail, telefone, CPF e token, afirmando que nenhum sai no
payload.

## Task 5 — Runbook de rollback executável (AC-5)
`docs/runbook-rollback.md`: reverter deploy, reverter migration, e o caso de migration aplicada
sem deploy correspondente.

**Gate:** cada comando executado uma vez em ambiente de teste, com a saída colada no runbook.
