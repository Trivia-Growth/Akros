---
name: SPEC
description: Contrato (AC) do rate limiting nas Edge Functions — teto por origem, fail-closed e observabilidade. E14-S01.
story: E14-S01
tier: arquitetural
alwaysApply: false
---

# spec.md — E14-S01 Rate limiting nas Edge Functions

Fecha **SD-01** (`P0`) em `docs/SECURITY_DEBT.md`. Ver `product.md` e `design.md`.

## Fora de escopo
- WAF e mitigação de DDoS distribuído (é do provedor de borda).
- CAPTCHA e bloqueio progressivo de conta (decisão de produto).
- Rate limit no PostgREST.

## Acceptance Criteria

### AC-1 — Teto por origem e janela
**Given** o teto configurado para uma função
**When** a mesma origem excede o número de requisições dentro da janela
**Then** a resposta é `429` com `Retry-After`, e a requisição não chega à lógica da função.

### AC-2 — O contador é compartilhado entre invocações
**Given** requisições servidas por isolates diferentes
**When** o limitador conta
**Then** a contagem é a mesma para todas — provado por teste que exercita o `UPSERT` concorrente,
não por inspeção do código.

### AC-3 — Fail-closed no caminho sensível
**Given** o limitador indisponível (banco fora)
**When** uma requisição chega em `sessao-login`
**Then** ela é **negada**, não liberada. Em `telemetria-erro` a exceção documentada no `design.md`
vale: libera e registra em log.

### AC-4 — A chave não identifica pessoa
**Given** uma requisição de um IP qualquer
**When** a linha é gravada em `seguranca.rate_limit`
**Then** nenhuma coluna contém o IP em claro, e a chave é um hash com segredo vindo do Vault.

### AC-5 — Excesso é observável
**Given** uma origem que estourou o teto
**When** a equipe consulta o log da função
**Then** existe registro estruturado do evento com a rota e a janela — sem o IP em claro.

### AC-6 — Toda função pública nova é obrigada a declarar o teto
**Given** uma Edge Function nova sem configuração de rate limit
**When** `pnpm run check:edge-functions` roda
**Then** o gate falha. Regra sem gate é convenção, e convenção não sobrevive à décima função.
