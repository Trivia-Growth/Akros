---
name: SPEC
description: Matriz de autorização executável (Playwright) — quem acessa o quê, hoje e pós-E13.
story: E12-S03
tier: pequeno
alwaysApply: false
---

# spec.md — E12-S03 Playwright + matriz de autorização

## Contexto

Handoff de 28/08 (`docs/STATE.md`): a matriz de autorização deve ser escrita **antes** do schema
(E13) e vira a especificação executável do isolamento por papel/`cliente_id`. Não é decisão nova —
formaliza em teste o que ADR-0008 (sessão) e ADR-0009 (single-tenant, papel + `cliente_id`) já
decidiram. Tier **Pequeno**: sem `design.md` novo.

Duas dimensões de isolamento existem, mas só uma tem como ser testada agora:

1. **Por papel/rota** (E12-S02, já implementado) — `/admin/*` só com sessão `admin`, `/portal/*`
   só com sessão `cliente`. Testável **hoje**.
2. **Por `cliente_id` dentro do portal** (E13, RLS) — cliente A não pode ver dado de cliente B.
   **Não testável ainda de ponta a ponta**: só existe 1 usuário `cliente` seed
   (`carlos.mendes@example.com`) e o dado de negócio continua 100% mockado no browser (nenhuma
   policy de banco existe pra violar). Essas linhas entram na matriz **como `test.fixme()`**,
   documentando o que precisa ficar verde quando E13 chegar — não fica silenciosamente esquecido.

## Fora de escopo

- Qualquer teste de isolamento de dado por linha (aguarda E13 — RLS real).
- CI (não existe pipeline `.github/workflows/` neste repo ainda — rodar os e2e é comando manual,
  não faz parte de `pnpm run ci:local`/pre-push, pelo mesmo motivo que os testes de banco com
  Docker também ficam de fora: dependem de rede/infra externa ao commit).
- Segundo usuário `cliente` de teste — decisão de produto já fechada em E12-S02
  (`product.md`: só os 2 usuários seed, sem self-signup).

## Acceptance Criteria

### AC-1 — Sem sessão, toda rota protegida redireciona
**Given** `isDemoMode = false` e nenhuma sessão
**When** o teste acessa `/admin` e `/portal` direto pela URL
**Then** ambos redirecionam para `/login`, sem renderizar nenhum dado da rota protegida.

### AC-2 — Admin autenticado acessa `/admin`, não acessa `/portal`
**Given** login com `lm.azeved@gmail.com`
**When** o teste acessa `/admin` e `/portal`
**Then** `/admin` renderiza o dashboard; `/portal` redireciona (via `/login`, que já vê sessão
ativa e devolve pro `/admin` — comportamento do `RequireRole` + `LoginPage`).

### AC-3 — Cliente autenticado acessa `/portal` com a persona certa, não acessa `/admin`
**Given** login com `carlos.mendes@example.com`
**When** o teste acessa `/portal` e `/admin`
**Then** `/portal` mostra "Carlos Mendes"/"EB-2 NIW" (prova que `useClienteAtivo()` resolveu do
`clienteId` da sessão, não de impersonação); `/admin` redireciona de volta pro `/portal`.

### AC-4 — Credencial inválida nunca autentica
**Given** e-mail correto, senha errada
**When** o teste submete o formulário de login
**Then** nenhuma navegação para área protegida acontece; mensagem de erro genérica aparece.

### AC-5 — Logout revoga sessão de verdade (não só limpa estado local)
**Given** sessão ativa (qualquer papel)
**When** o teste clica "Sair" e depois recarrega a rota protegida
**Then** cai em `/login` — prova que o cookie foi invalidado no Supabase, não só que a store local
zerou (cobre a regressão que aconteceria se `sessao-logout` parasse de limpar o cookie).

### AC-6 (fixme — aguarda E13) — Isolamento por `cliente_id`
**Given** dois usuários `cliente` distintos, cada um só vendo seu próprio processo
**When** logado como cliente A
**Then** nenhum dado do cliente B aparece em nenhuma tela do portal.
Marcado `test.fixme()` com o motivo (sem RLS, sem segundo usuário seed) — vira o critério de
"pronto" do E13 citado no handoff.

## Gate

```
pnpm exec playwright test   # roda contra pnpm dev (VITE_DEMO_MODE=false), webServer autogerenciado
```
AC-1 a AC-5 devem passar. AC-6 aparece como "fixme" no relatório (não conta como falha, não conta
como passou de verdade) até E13.
