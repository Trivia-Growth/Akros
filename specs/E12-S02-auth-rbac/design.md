---
name: DESIGN
description: Mecânica de autenticação real (Supabase Auth + sessão ADR-0008) por cima do dado ainda mockado.
story: E12-S02
alwaysApply: false
---

# design.md — E12-S02 Autenticação e RBAC

As decisões difíceis de reverter já estão fechadas em **ADR-0008** (sessão) e **ADR-0009**
(single-tenant). Este documento é a mecânica concreta — não reabre nenhuma das duas.

## Componentes

```
Browser                    Netlify (proxy)                 Supabase
────────                   ────────────────                ─────────
LoginPage
  │ POST /api/sessao/login ──────▶ rewrite ──────▶ sessao-login (Edge Function)
  │                                                    │ auth.signInWithPassword (anon key)
  │◀── access token (body) ────────────────────────────┘ Set-Cookie refresh (HttpOnly)
  │
useSessaoStore (zustand, memória — nunca localStorage)
  │
RequireRole (guarda de rota)
  │
useBootstrapSessao (no boot)
  │ POST /api/sessao/refresh (cookie vai sozinho) ──▶ rewrite ──▶ sessao-refresh
  │◀── access token novo ou 401 ────────────────────────────────────┘
```

### Novo bounded context: `features/sessao/`

Não existia contexto de identidade — os 8 bounded contexts do `ARCHITECTURE.md` são todos de
negócio (site, jornada, documentos, pagamentos, agenda, crm, comunicacao, demo). `sessao` é
infraestrutura transversal (como auth de qualquer app), mas segue a mesma convenção de pastas do
projeto por consistência:

- `domain/types.ts` — `Papel` (`"cliente" | "admin"`), `UsuarioSessao`, `Sessao`.
- `application/store.ts` — Zustand **sem persist** (ADR-0008: token só em memória de módulo).
- `application/hooks.ts` — `useSessaoAtual`, `useBootstrapSessao` (chamada uma vez, na raiz),
  `login`, `logout`.
- `infrastructure/EdgeFunctionSessaoService.ts` — único adapter (não há "Mock" aqui: autenticação
  é real desde o dia 1, diferente do dado de negócio).
- `interfaces/LoginPage.tsx`, `interfaces/RequireRole.tsx`.

Registrado no `container` de `app/di.ts` (`container.sessao`) mesmo sem variante Mock — não pela
razão do ADR-0002 (trocar mock↔Supabase), mas porque a regra de dependência
(`interfaces → application → domain ← infrastructure`) é a mesma pra qualquer contexto:
`application/hooks.ts` não pode importar `infrastructure/EdgeFunctionSessaoService.ts` direto
(pego pelo `dependency-cruiser`, `pnpm run arch:check`).

### Três Edge Functions (`supabase/functions/sessao-*`)

Implementam a mecânica do ADR-0008 ao pé da letra:

| Função | Faz | Precisa de `service_role`? |
|---|---|---|
| `sessao-login` | `auth.signInWithPassword` (anon key) → body só com access token; `Set-Cookie` do refresh | Não |
| `sessao-refresh` | Lê cookie → `auth.refreshSession` → rotaciona cookie → novo access token | Não |
| `sessao-logout` | Cliente manda o access token em memória no header `Authorization`; função chama `auth.signOut()` com ele (revoga no GoTrue); limpa cookie sempre, mesmo se a revogação falhar | Não |

Nenhuma precisa de `service_role` — `auth.signInWithPassword`/`refreshSession`/`signOut` funcionam
com a `anon key` mais o token da própria chamada. Variáveis `SUPABASE_URL`/`SUPABASE_ANON_KEY` já
vêm injetadas automaticamente em toda Edge Function pelo runtime Supabase.

**CSRF** (as três defesas do ADR-0008, juntas): cookie `SameSite=Strict` (não viaja cross-site);
header customizado `X-Akros-Csrf: 1` obrigatório em `refresh`/`logout` (formulário cross-site não
consegue setar header customizado); `corsHeaders` (`_shared/cors.ts`) já reflete só origem da
allowlist — fora dela o browser derruba a resposta por `Access-Control-Allow-Origin` divergente.

### Proxy Netlify

`netlify.toml` ganha um redirect **antes** do catch-all de SPA (ordem importa — primeira regra que
bate vence):

```toml
[[redirects]]
  from   = "/api/sessao/*"
  to     = "https://mhxopadkizktsenohnbm.supabase.co/functions/v1/sessao-:splat"
  status = 200
```

Só as três rotas de sessão passam por aqui — dado de negócio nunca (continua tudo mockado no
browser, ver seção abaixo).

### RBAC — de onde vem o papel

`app_metadata.role` e `app_metadata.cliente_id` (setados na criação do usuário via Management API,
ver `product.md`) já chegam embutidos no JWT nativamente — não precisa de hook de banco nem de
tabela extra nesta fase. `sessao-login`/`sessao-refresh` devolvem esses dois campos já lidos de
`data.user.app_metadata` no corpo da resposta, prontos para o `RequireRole` comparar.

### A ponte temporária para o dado mockado (SPEC_DEVIATION, documentada)

Dado de negócio **continua 100% em `useMockDb`** — esta story não migra nada pra Supabase, isso é
E13+. A única pergunta que falta responder depois do login real é: *qual persona mockada este
usuário vê?*

`app_metadata.cliente_id` foi setado, na criação dos usuários seed, com o **mesmo id da persona
mockada** (`"cliente-carlos"`, que já é `PERSONA_PADRAO` em
`features/demo/application/useDemoSession.ts` — coincidência que confirma ser a escolha certa).
Então a ponte é direta: quando autenticado como `cliente`, `useClienteAtivo()` usa
`sessao.usuario.clienteId` no lugar do `personaId` do `useDemoSession`. Sem tabela `usuarios`, sem
mapa auxiliar. Vira `SPEC_DEVIATION` marcada no código — em E13, `cliente_id` passa a apontar pra
uma linha real da tabela `clientes`, não pro array de personas em `mocks/personas.ts`.

### Modo demo continua existindo — e é a flag que já existia

`shared/lib/env.ts` já tem `isDemoMode` (`VITE_DEMO_MODE !== "false"`), criada em E05-S01
justamente com este propósito: *"Defina VITE_DEMO_MODE=false [...] quando a plataforma migrar para
dados reais."* Essa story não inventa uma flag nova — usa a que já estava esperando por ela.

- `isDemoMode === true` (padrão, inalterado — é o que a Akros usa pra demo ao vivo): comportamento
  de hoje, sem guarda de rota, `DemoBar` visível, impersonação livre. **Zero dependência de
  backend.**
- `isDemoMode === false` (Lucas ativa em `.env.local` durante o desenvolvimento desta epic):
  `RequireRole` guarda `/portal` e `/admin`, `DemoBar` seria escondida (já se esconde sozinha — a
  linha `if (!isDemoMode) return null;` já existe), sessão real decide `papel`/`clienteId`.

## Fluxo completo (login → sessão ativa → F5 → logout)

1. `/login` → `sessao-login` → access token em memória (`useSessaoStore`), cookie de refresh gravado.
2. `RequireRole` deixa passar pra `/admin` ou `/portal` conforme `papel`.
3. F5 (refresh de página) → memória zera → `useBootstrapSessao` roda no boot → `sessao-refresh` lê
   o cookie → sessão rehidratada sem novo login. Sem cookie válido → fica deslogado, `RequireRole`
   manda pro `/login`.
4. Logout → `sessao-logout` revoga no Supabase e limpa o cookie → `useSessaoStore` zera.
5. Fechar a aba sem logout → memória some (comportamento esperado do ADR-0008); cookie continua
   válido até expirar/ser usado — próximo F5 rehidrata.

## Fora de escopo (reforça o `product.md`)

- RLS / isolamento por linha (E13) — nada aqui impede um cliente autenticado de ver dado de outra
  persona no `useMockDb`, porque é tudo mock em memória do browser; o gate desta story é de **rota**
  (UI), não de **dado**. Documentado como resíduo aceito no `product.md`.
- `@supabase/supabase-js` no front **não é instalado nesta story** — o front só fala com as três
  rotas de sessão via `fetch`. O SDK completo só entra quando E13 trocar leitura direta de
  `useMockDb` por PostgREST.
