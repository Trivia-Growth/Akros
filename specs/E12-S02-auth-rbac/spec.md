---
name: SPEC
description: Login real via Supabase Auth, sessão conforme ADR-0008, guarda de rota por papel.
story: E12-S02
alwaysApply: false
---

# spec.md — E12-S02 Autenticação e RBAC

Contrato técnico. Contexto/decisões em `product.md`/`design.md`/ADR-0008/ADR-0009 — não repetido
aqui.

## Acceptance Criteria

### AC-1 — Login real cria sessão em memória, nunca em storage persistente
**Given** as credenciais seed (`lm.azeved@gmail.com` / admin, `carlos.mendes@example.com` /
cliente) e `isDemoMode = false`
**When** o usuário submete e-mail/senha corretos em `/login`
**Then** `sessao-login` autentica no Supabase, devolve o access token no corpo e grava o refresh
token em cookie `HttpOnly; Secure; SameSite=Strict`; o front guarda o access token só em
`application/store.ts` (Zustand, memória) — checável no DevTools: `localStorage` e
`sessionStorage` não têm nenhuma chave nova antes/depois do login.

### AC-2 — Credencial errada não autentica e não vaza detalhe
**Given** e-mail ou senha incorretos
**When** submetidos em `/login`
**Then** `sessao-login` devolve 401 sem indicar se foi o e-mail ou a senha que errou; a UI mostra
mensagem genérica ("e-mail ou senha inválidos"); nenhuma sessão é criada.

### AC-3 — Guarda de rota por papel
**Given** `isDemoMode = false`
**When** uma sessão não existe (ou existe com papel diferente do exigido pela rota) e a pessoa
acessa `/admin/*` ou `/portal/*` direto pela URL
**Then** é redirecionada para `/login` sem ver nenhum dado da rota protegida — nem por um instante
(loading state não deve renderizar o conteúdo protegido antes de resolver a sessão).

### AC-4 — F5 rehidrata a sessão sem novo login
**Given** uma sessão ativa (login feito) com `isDemoMode = false`
**When** a página é recarregada (F5)
**Then** `useBootstrapSessao` chama `sessao-refresh` no boot; se o cookie de refresh ainda for
válido, a sessão volta (novo access token, mesmo papel/clienteId) sem pedir login de novo; se o
cookie não existir ou estiver expirado, cai em `/login`.

### AC-5 — Logout revoga e limpa
**Given** uma sessão ativa
**When** o usuário faz logout
**Then** `sessao-logout` é chamado com o access token em memória no header `Authorization`, o
Supabase revoga a sessão, o cookie de refresh é limpo (`Max-Age=0`), e um F5 subsequente cai em
`/login` (AC-4 não rehidrata mais nada).

### AC-6 — Cliente vê a persona certa depois do login
**Given** login com `carlos.mendes@example.com` (papel `cliente`, `clienteId = "cliente-carlos"`)
**When** a pessoa acessa `/portal`
**Then** `useClienteAtivo()` resolve pra persona `cliente-carlos` do `useMockDb`, exatamente como a
impersonação faria manualmente — sem tela de seleção de persona (é o próprio login que decide).

### AC-7 — Modo demo continua funcionando sem nenhuma dependência de backend
**Given** `isDemoMode = true` (padrão, inalterado)
**When** a plataforma é usada como hoje (barra de demo, impersonação livre)
**Then** nenhuma chamada de rede para `/api/sessao/*` acontece, `RequireRole` não entra no caminho
(rotas seguem sem guarda), e o comportamento observável é idêntico ao que existia antes desta
story — zero regressão na demo ao vivo da Akros.

## Casos de borda

- **Access token expira (>15min) com a aba aberta:** próxima chamada que dependeria dele (nenhuma
  chamada de dado passa por token nesta story — dado é mock) não é afetada; só o logout explícito
  usa o token, e mesmo expirado a função tenta revogar best-effort e limpa o cookie de qualquer
  jeito (AC-5 não pode travar por token vencido).
- **Cookie de refresh corrompido/adulterado:** `sessao-refresh` recebe erro do Supabase, devolve
  401, front trata igual "sem sessão" (AC-3/AC-4).
- **Chamada a `/api/sessao/refresh` ou `/api/sessao/logout` sem o header `X-Akros-Csrf`:** rejeitada
  com 401 antes de tocar em qualquer lógica de sessão (defesa CSRF do ADR-0008).

## Fora de escopo

Ver `product.md`. Reforço: RLS/isolamento de dado (E13), self-signup, reset de senha, MFA.

## Gate

```
pnpm run typecheck
pnpm test
pnpm run build
# manual (sem Playwright ainda — isso é E12-S03):
# 1. VITE_DEMO_MODE=false pnpm dev
# 2. /admin direto sem login -> redireciona /login
# 3. login lm.azeved@gmail.com -> /admin, ve dado do admin
# 4. logout -> F5 em /admin -> volta pro /login
# 5. login carlos.mendes@example.com -> /portal mostra jornada do Carlos Mendes
# 6. DevTools > Application > Storage: local/sessionStorage vazios de token em qualquer momento
# 7. VITE_DEMO_MODE=true (ou unset) pnpm dev -> comportamento antigo intacto, sem chamada a /api/sessao/*
```
