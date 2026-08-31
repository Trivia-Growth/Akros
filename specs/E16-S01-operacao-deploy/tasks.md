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


---

## Resultado (2026-08-31)

| Task | Gate | Resultado |
|---|---|---|
| 1 — Deploy preview por PR | URL no PR | ✅ **já funcionava** — o PR #3 trouxe `netlify/deploy-preview` verde sem mudar nada. Faltava existir um PR, não configuração. |
| 2 — CSP `Report-Only` + HSTS | `curl -sI` no preview | ✅ escritos em `netlify.toml`. ⚠️ **Verificação pendente**: navegar as 3 frentes no preview e listar as violações relatadas antes de promover para bloqueante. |
| 3 — Sink ligado ao boundary | `pnpm test` | ✅ `telemetria-erro` (Edge Function) + `shared/telemetria`; teste prova que o fallback sobrevive ao transporte falhando. ⚠️ **A function ainda não foi deployada.** |
| 4 — Serializador sem PII | `pnpm test` | ✅ 5 casos em `sanitizar.test.ts` — lista de permissão, varredura de texto livre, rota sem query. |
| 5 — Runbook de rollback | comandos executados | ⚠️ **Não fechada.** `docs/runbook-rollback.md` existe, mas os comandos seguem marcados `[NÃO EXECUTADO]` — exigem rodar `netlify` e `supabase db push` de verdade num ambiente de teste. |

**Story fica 🟨, não 🟩.** Três verificações dependem de ação fora do repositório: promover a CSP,
fazer o deploy da function e executar o rollback uma vez. Marcar como concluída sem elas seria
exatamente o "gate verde que não verificou nada" que E00-S06 existe para impedir.

### O que precisa de mão humana

```bash
# 1. Deploy da function de telemetria (sem isso o sink cai no catch e o erro só vai pro console)
supabase functions deploy telemetria-erro

# 2. CSP: navegar as 3 frentes no deploy preview com o DevTools aberto e anotar as violações
#    relatadas. Zero violação → trocar `Content-Security-Policy-Report-Only` por
#    `Content-Security-Policy` em netlify.toml.

# 3. Rollback: executar cada comando do runbook uma vez e colar a saída, tirando os [NÃO EXECUTADO]
```
