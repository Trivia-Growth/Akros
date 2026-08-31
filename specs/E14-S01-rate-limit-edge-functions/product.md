---
name: PRODUCT
description: Por que rate limiting nas Edge Functions é P0 e o que ele protege — E14-S01.
story: E14-S01
alwaysApply: false
---

# product.md — E14-S01 Rate limiting nas Edge Functions

## Problema
`grep -rn "rate\|limit" supabase/functions/` não devolve nada. `sessao-login` aceita tentativa
ilimitada de senha: força bruta e enumeração de usuário sem custo nenhum para quem ataca.

`seguranca/os-grade.md` pede rate limit `fail-closed` em função pública e a `Definition-of-Done.md`
§4 lista como obrigatório. É **SD-01**, `P0` em `docs/SECURITY_DEBT.md` — bloqueia produção.

A superfície cresceu desde que a dívida foi aberta: `telemetria-erro` (E16-S01) é **anônima por
construção** — erro de cliente acontece com o usuário deslogado, no site institucional, então
exigir JWT perderia justamente os crashes mais visíveis. Hoje a única barreira dela é um teto de
16 kB por payload.

## Quem sente
- **Cliente da Akros** — conta comprometida por força bruta. Dado de imigração é PII pesado
  (ADR-0005): passaporte, endereço, situação familiar.
- **Akros** — custo de Edge Function e de banco por requisição de abuso, e o incidente para
  explicar.
- **Equipe** — hoje não há como saber que está sendo tentado. Não existe contagem nem alerta.

## Resultado esperado
Toda função pública tem um teto por origem e por janela, e o teto **nega quando o próprio
limitador falha** (`fail-closed`), porque limitador que abre sob falha é o mesmo que não ter.

## Fora de escopo
- WAF, proteção de camada 3/4, mitigação de DDoS distribuído. Isso é do provedor de borda.
- CAPTCHA e bloqueio progressivo de conta. Decisão de produto, não de infraestrutura.
- Rate limit no PostgREST (dado de negócio). Este é o perímetro das Edge Functions.
