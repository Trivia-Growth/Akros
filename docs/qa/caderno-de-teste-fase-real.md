---
name: caderno-de-teste-fase-real
description: Caderno de teste da parte sem mock (auth, RLS, Edge Functions, telas reais, deploy) com o resultado da avaliação de 2026-10-01 e os achados priorizados.
alwaysApply: false
---

# Caderno de teste — fase real (avaliação de 2026-10-01)

Este documento tem duas partes: o que a avaliação encontrou (seções 1 a 3) e o caderno para repetir
e estender os testes (seção 4). Cada caso tem ID, passo, resultado esperado e o resultado observado
na avaliação.

Legenda: ✅ passou · ❌ falhou · ⚠️ funciona mas exige decisão · ⏳ não executado (motivo na linha)
· 🚫 bloqueado por deploy pendente.

## 0. Base avaliada e limites

- **Código:** `origin/main` @ `a87fbc0` (PR #6, 2026-09-08), clonado limpo. O checkout local
  `~/GitHub/Akros` está sem nenhum commit e com 1.638 arquivos staged mas ausentes do disco
  (`apps/web`, `docs`, `supabase`, `specs`, `.triviaiox-core`); não foi alterado. Qualquer trabalho
  posterior a 08/09 que não tenha ido para o remote **não foi avaliado**.
- **Banco e functions:** projeto Supabase `mhxopadkizktsenohnbm` (sa-east-1, Postgres 17.6),
  consultado pela Management API. Testes de escrita rodaram só em transação com rollback; o estado
  foi conferido depois (`audit.eventos` seguiu em 20, status de pagamento/etapa/documento intactos).
- **Hospedagem:** `https://imigrationakros.netlify.app` e o deploy preview do PR #6.
- **Não executado:** e2e autenticado (11 testes) e telas do portal/admin logadas — as senhas dos
  usuários seed estão em `apps/web/.env.test.local`, que não existe neste ambiente. Envio válido do
  formulário de lead (o IP da avaliação ficou limitado por 1 h em `lead-capturar` pelos próprios
  testes de rate limit, até ~00:58 UTC de 02/10). Tudo o que depende de `integracoes-ia-salvar`,
  `evolution-webhook` e migration `0016` (nada disso está no ar). Variáveis do Netlify (sem acesso).

## 1. Veredito

O backend real é sólido onde foi testado (RLS forçada em 26/26 tabelas, isolamento cliente×cliente,
audit append-only, rate limit funcionando, CI verde). Mas **a parte sem mock ainda não está
alcançável em produção** e tem furos que precisam fechar antes de qualquer cliente real:

1. O site hospedado roda em modo demo — nada do que é real chega ao usuário.
2. Um cliente logado consegue, pela API, marcar o próprio pagamento como pago, concluir a própria
   etapa e aprovar o próprio documento.
3. A migration `0016` (agente WhatsApp/Vault) não aplica no Supabase real e tem um bug de telefone;
   as duas Edge Functions dela não estão deployadas.
4. A sessão não renova o token de 1 h.

## 2. Mapa real × mock (em modo `VITE_DEMO_MODE=false`)

| Frente | Rota | Leitura | Escrita |
|---|---|---|---|
| Site | `/`, `/quem-somos`, `/servicos`, `/metodologia`, `/vistos`, `/blog`, `/contatos` | conteúdo estático (mock de conteúdo, por desenho) | formulário de lead → Edge Function `lead-capturar` → `crm.leads` (real) |
| Auth | `/login` | — | login/refresh/logout reais (3 Edge Functions) |
| Portal | dashboard, jornada, documentos, pagamentos, mensagens, agenda, perfil | **real** (PostgREST + RLS) | **nenhuma** — as telas avisam "não grava … diretamente no navegador" |
| Admin | dashboard, clientes 360, documentos (fila), propostas, operação, comunicação, agenda | **real** | **nenhuma** |
| Admin | programas | real | **real** (UPDATE/INSERT admin em `programas.programas`) |
| Admin | configurações | real | só via `integracoes-ia-salvar` (**não deployada**) |
| Admin | leads (kanban), aprovações, pagamentos (conciliação), reativação | — | **somem do menu e redirecionam** (`demoOnly`) |

Consequências que o mapa expõe: um lead capturado entra no banco mas não aparece em nenhuma tela
(só como contagem no funil do dashboard); a conversão lead→cliente existe como RPC e não tem tela;
não há upload, assinatura, comprovante nem agendamento reais.

## 3. Achados priorizados

### P0 — impedem produção real

**A-01. O site hospedado está em modo demo.** `isDemoMode` é `true` salvo se `VITE_DEMO_MODE=false`
(`apps/web/src/shared/lib/env.ts`). Em `imigrationakros.netlify.app/admin` e no deploy preview, o
Dashboard abre sem login, a barra de demo aparece e nenhuma chamada `/api` é feita. Logo, o
formulário de contato em produção grava no Zustand e nenhum lead chega ao banco.
*Correção:* no Netlify (Production e Deploy Previews) definir `VITE_DEMO_MODE=false`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, e refazer o build. Manter um site separado para a
demo, se a demo ao vivo continuar necessária.

**A-02. Cliente se auto-aprova pela API.** As policies de UPDATE do próprio cliente não limitam
coluna nem transição. Reproduzido com JWT de Carlos (rollback): `pagamentos.status='pago'` e
`valor_recebido` (1 linha), `jornada.etapas.status='concluida'` (1), `documentos.status='aprovado'`
(1), e em `crm.clientes` troca de `case_manager`, `programa_id`, `programa_versao` e `deleted_at`.
Nenhuma tela real faz isso hoje, mas qualquer cliente com DevTools faz. Quebra E09-S05 (só a Akros
conclui etapa), ADR-0005 (humano decide documento) e a conciliação manual. Já constava como
"bloqueio 4" do STATE.
*Correção:* remover o UPDATE de cliente em `pagamentos`, `etapas` e `documentos` (a transição passa
por RPC `SECURITY DEFINER` ou Edge Function com validação e auditoria) e restringir `crm.clientes`
a `GRANT UPDATE (nome, telefone, perfil_imigratorio)`.

**A-03. Migration `0016` não aplica no Supabase real.** A guarda faz
`to_regprocedure('vault.create_secret(text,text,text)')`; o Vault real (0.3.1) expõe
`create_secret(text,text,text,uuid)` e `update_secret(uuid,text,text,text,uuid)`, então a guarda
devolve `NULL` e a migration aborta com "Supabase Vault indisponível" mesmo com a extensão
instalada. A CI passa porque o shim define a assinatura de 3 argumentos.
*Correção:* guardar pelas assinaturas reais e alinhar `supabase/tests/00-shim-supabase.sql`. Como a
`0016` nunca foi aplicada, pode ser corrigida no lugar.

**A-04. `0016`: normalização de telefone nunca normaliza.** `regexp_replace(..., '\\D', '', 'g')`
dentro do corpo da função vira o regex literal `\\D`. Provado no banco real:
`'+55 (11) 99999-0000'` volta inalterado. O webhook passa só dígitos, os clientes têm
`+55 11 98888-1001`, então nenhuma conversa de WhatsApp vincula ao cliente nem gera evento na
timeline. *Correção:* `'\D'`.

**A-05. Edge Functions `integracoes-ia-salvar` e `evolution-webhook` não estão deployadas** (ambas
respondem 404). A tela de Configurações chama a primeira e falha. Além disso, `integracoes-ia-salvar`
é chamada direto do browser e o secret `CORS_ALLOWED_ORIGINS` só devolve `http://localhost:5173`,
então o preflight de qualquer origem Netlify seria recusado.

### P1 — corrigir antes de cliente real

**A-06. O token de acesso (1 h) nunca renova.** `expiresAt` não é lido em lugar nenhum,
`autoRefreshToken: false` e o callback `accessToken` devolve sempre o token da memória
(`shared/supabase/client.ts`). Passada 1 h com a aba aberta, toda leitura falha com JWT expirado,
sem redirecionar ao login. *(Confirmado por leitura de código; não reproduzido por exigir
credencial e 1 h.)*

**A-07. Falha transitória do refresh desloga a UI.** `refresh()` devolve `null` para qualquer
`!res.ok` (inclusive 429 e 5xx). Toda carga de página, até a anônima, chama `/api/sessao/refresh`
(401 no console; consome o teto de 30/min por IP). Reproduzido: carga de páginas públicas em
sequência já devolve 429 nessa chamada. Atrás de NAT compartilhado, um F5 de usuário logado pode
cair em 429 e ser tratado como deslogado.

**A-08. Cadastro aberto + dados `USING (true)`.** O Auth tem `disable_signup=false` (o endpoint de
signup valida e responde 422 para senha fraca). `pagamentos.dados_recebimento` e
`programas.programas` têm SELECT `true` para qualquer `authenticated`. Simulado com um JWT sem
papel: lê 2 linhas de dados bancários e 1 programa. Os dados bancários hoje são fictícios; deixam
de ser quando a Akros trocar pelos reais. *Correção:* `disable_signup=true` (clientes são criados
pela equipe) e policies com checagem de papel.

**A-09. Cliente convertido não tem como logar.** A RPC cria `crm.clientes` com
`auth_user_id = NULL` e não existe, no código nem nas specs, fluxo de convite/criação de usuário
Auth. Os dois usuários seed foram criados à mão.

**A-10. Consentimento LGPD do lead é descartado.** O formulário exige o aceite, mas o payload de
`lead-capturar` (`.strict()`) não o inclui e `crm.leads` não tem coluna para ele.

**A-11. Auth em configuração de desenvolvimento.** `site_url=http://localhost:3000`, lista de
redirect vazia, senha mínima 6, proteção contra senha vazada desligada.

### P2 — qualidade e dívida

- **A-12.** Rota inexistente mostra a tela padrão do React Router ("Unexpected Application Error! …
  Hey developer"). Falta página 404.
- **A-13.** `/contatos` e a home, em modo real e anônimas, carregam `src/mocks/store.ts` e
  `src/app/di.ts` (store fictícia no browser do visitante). A garantia do e2e AC-7 vale só para
  sessão logada.
- **A-14.** Advisors do Supabase (0 ERROR, 6 WARN): `audit.registrar_mudanca()` e
  `public.rls_auto_enable()` executáveis por `anon`/`authenticated` (são função de trigger — risco
  baixo, mas é `REVOKE EXECUTE` de uma linha); `crm.meu_cliente_id` sem `search_path`; senha
  vazada. Performance: 51 `auth_rls_initplan`, 114 `multiple_permissive_policies`, 14 FKs sem
  índice — irrelevante com 2 clientes, relevante em escala.
- **A-15.** Login mostra "E-mail ou senha inválidos." para qualquer falha, inclusive 429 e rede.
- **A-16.** `programas.programas` tem 1 linha (`eb2-niw`); o programa R/EB-4 só existe no mock, e
  `crm.clientes.programa_id` não tem FK (aceita qualquer texto).
- **A-17.** Valores fixos: `case_manager = 'Natalia Luz'` na RPC de conversão; `origem = "Formulário
  homepage"` no envio, inclusive a partir de `/contatos`.
- **A-18.** `sessao-logout` usa `signOut()` com escopo global (encerra todos os dispositivos do
  usuário) — confirmar se é o desejado. `telemetria-erro` mede o limite de 16 KiB em caracteres,
  não bytes.
- **A-19.** Payloads para a Evolution API (`textMessage` no envio, corpo "plano" no `webhook/set`)
  não foram verificados contra a versão instalada. Não sei se batem; confirmar antes do deploy.

## 4. Caderno de teste

Pré-requisitos para executar:

- **Local real:** `apps/web/.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`;
  `VITE_DEMO_MODE=false pnpm --filter @akros/web dev`.
- **Credenciais:** `apps/web/.env.test.local` com `E2E_ADMIN_*`, `E2E_CLIENTE_*` (Carlos),
  `E2E_CLIENTE_B_*` (Renata), `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`.
- **Regra:** teste de escrita em ambiente com dado real só em transação com rollback (anexo A).

### 4.1 Infra e deploy (I)

| ID | Passo | Esperado | Resultado 01/10 |
|---|---|---|---|
| I-01 | Abrir `https://imigrationakros.netlify.app/admin` em aba anônima | Redireciona para `/login` | ❌ abre o Dashboard, barra de demo visível (A-01) |
| I-02 | Netlify → Environment variables (Production e Deploy Previews) | `VITE_DEMO_MODE=false`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | ⏳ sem acesso ao Netlify |
| I-03 | Supabase → Auth → URL Configuration | Site URL = domínio de produção; redirects incluem previews | ❌ `localhost:3000`, lista vazia (A-11) |
| I-04 | Preflight `OPTIONS` em `sessao-login` com `Origin: https://imigrationakros.netlify.app` | `access-control-allow-origin` igual à origem | ❌ devolve `http://localhost:5173` (A-05) |
| I-05 | Comparar `supabase_migrations.schema_migrations` com `supabase/migrations/` | 16 aplicadas | ❌ 15 (`0016` ausente) (A-03) |
| I-06 | Comparar functions deployadas com `supabase/functions/` | 7 deployadas | ❌ 5 (faltam as 2 da `0016`) (A-05) |
| I-07 | Bundles deployados contêm `checarLimite`/`consumir_cota` | Nas 5 functions | ✅ |
| I-08 | Secrets: `RATE_LIMIT_SECRET`, `CORS_ALLOWED_ORIGINS` existem | Presentes | ✅ (valor de CORS não é legível) |
| I-09 | Headers de `/` no Netlify | HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, CSP-Report-Only | ✅ |
| I-10 | `GET /api/leads` e `POST /api/sessao/refresh` (sem CSRF) no Netlify | 405 e 401 (proxy first-party ativo) | ✅ |
| I-11 | `POST /auth/v1/signup` com senha fraca | Recusado por cadastro desabilitado | ❌ valida a senha (cadastro aberto) (A-08) |
| I-12 | CI da `main` e do PR #6 | 12 checks verdes + deploy preview | ✅ |

### 4.2 Banco (B)

Consultas via `POST https://api.supabase.com/v1/projects/<ref>/database/query` (somente `SELECT`) ou
SQL Editor. Os casos B-05 a B-16 usam o script do anexo A.

| ID | Passo | Esperado | Resultado 01/10 |
|---|---|---|---|
| B-01 | `pg_class`: `relrowsecurity` e `relforcerowsecurity` nas tabelas dos schemas de negócio | 26/26 verdadeiros | ✅ |
| B-02 | Grants de `anon` em tabelas de negócio; `anon` executando `seguranca.consumir_cota` | Nenhum; negado | ✅ |
| B-03 | `has_table_privilege('authenticated', t, 'DELETE')` | `false` em todas | ✅ |
| B-04 | `has_table_privilege('service_role', 'audit.eventos', 'UPDATE'/'DELETE')` | `false` (append-only) | ✅ |
| B-05 | Como Carlos: `count(*)` em `crm.clientes`; UPDATE em pagamento da Renata | 1 linha; 0 linhas | ✅ |
| B-06 | Como Carlos: `crm.leads`, `audit.eventos`, `regras_atendimento_ia`, `integracoes` | 0 linhas cada | ✅ |
| B-07 | Como Carlos: INSERT em `lgpd.solicitacoes` com `cliente_id` da Renata | Negado por RLS | ✅ |
| B-08 | Como Carlos: `crm.criar_cliente_a_partir_de_lead` | "apenas admin pode converter" | ✅ |
| B-09 | Como admin: criar lead, converter, converter de novo | Cliente criado, lead `fechado`, 2ª conversão viola índice único | ✅ |
| B-10 | Como admin: INSERT direto em `crm.clientes` | Negado (só via RPC) | ✅ |
| B-11 | Como Carlos: UPDATE `pagamentos.status='pago'` no próprio pagamento | Negado / 0 linhas | ❌ 1 linha alterada (A-02) |
| B-12 | Como Carlos: UPDATE `jornada.etapas.status='concluida'` | Negado / 0 linhas | ❌ 1 linha (A-02) |
| B-13 | Como Carlos: UPDATE `documentos.status='aprovado'` | Negado / 0 linhas | ❌ 1 linha (A-02) |
| B-14 | Como Carlos: UPDATE `case_manager`, `programa_id`, `programa_versao`, `deleted_at` em `crm.clientes` | Negado | ❌ 1 linha (A-02) |
| B-15 | Como Carlos: reatribuir `auth_user_id` para a Renata | Negado | ✅ |
| B-16 | Como usuário autenticado sem papel: `dados_recebimento`, `programas`, `clientes` | 0 linhas em todas | ❌ 2, 1 e 0 (A-08) |
| B-17 | Como Carlos: cancelar a própria reunião | Decisão de produto | ⚠️ permitido hoje |
| B-18 | Mudanças feitas na transação aparecem em `audit.eventos` | Eventos registrados | ✅ (20 → 23 dentro da transação) |
| B-19 | Advisors de segurança | 0 ERROR | ✅ 0 ERROR, 6 WARN (A-14) |
| B-20 | Dados de teste residuais (3 leads `descartado`, conversa, regra de IA, solicitação LGPD) | Decidir limpeza antes do go-live | ⚠️ |

### 4.3 Edge Functions (F)

URL base: `https://<ref>.supabase.co/functions/v1`. Use um IP novo ou espere a janela de rate limit
(`lead-capturar`: 5/h; `sessao-login`: 10/15 min; `sessao-refresh`/`logout`: 30/min).

| ID | Passo | Esperado | Resultado 01/10 |
|---|---|---|---|
| F-01 | `OPTIONS lead-capturar` com origem permitida e com `https://evil.example` | Eco da permitida; a estranha recebe a primeira da allowlist | ✅ |
| F-02 | `GET lead-capturar` | 405 | ✅ |
| F-03 | `POST lead-capturar` com `{"x":1}` | 400 `Dados inválidos.` | ✅ |
| F-04 | 6 `POST` seguidos do mesmo IP | 429 + `Retry-After` | ✅ 5×400, depois 429 (`Retry-After: 3022`) |
| F-05 | Mesmo teste trocando `X-Forwarded-For` a cada pedido | Teto continua valendo | ✅ (cabeçalho forjado não zera a cota) |
| F-06 | Corpo > 8 KiB | 413 | ⏳ IP limitado; só por código |
| F-07 | Payload válido com campo extra `estagio` | 400 (`.strict()`) | ⏳ IP limitado; só por código |
| F-08 | Payload válido completo | 201 `{id}`; linha em `crm.leads` com `estagio='lead'`; apagar o lead de teste depois | ⏳ IP limitado |
| F-09 | `sessao-login` com `{}` | 422 | ✅ |
| F-10 | `sessao-login` com credencial errada | 401 `Credenciais inválidas` | ✅ |
| F-11 | `sessao-login` com credencial certa | 200, `accessToken`, `Set-Cookie` HttpOnly Secure SameSite=Strict | ⏳ sem senha |
| F-12 | 11ª tentativa de login em 15 min | 429 | ⏳ |
| F-13 | `sessao-refresh` sem `X-Akros-Csrf` / sem cookie / cookie inválido | 401 / 401 / 401 | ✅ |
| F-14 | `sessao-refresh` com cookie válido | 200 e cookie rotacionado | ⏳ sem senha |
| F-15 | `sessao-logout` sem CSRF / com CSRF | 401 / 200 + cookie expirado | ✅ |
| F-16 | `telemetria-erro` válido; `GET`; payload inválido | 204; 405; 204 (por desenho) | ✅ (inválido só por código) |
| F-17 | `integracoes-ia-salvar` | Existir | 🚫 404 (A-05) |
| F-18 | `evolution-webhook` | Existir | 🚫 404 (A-05) |
| F-19 | Pós-deploy: `integracoes-ia-salvar` sem token / como cliente / como admin | 401 / 403 / 200; chave nunca volta ao browser; webhook registrado na Evolution | 🚫 |
| F-20 | Pós-deploy: `evolution-webhook` sem `x-akros-webhook` | 401 | 🚫 |
| F-21 | Pós-deploy: mensagem de contato conhecido (`+55 11 98888-1001`) | Conversa vinculada ao `cliente_id` e evento na timeline (depende de A-04) | 🚫 |
| F-22 | Pós-deploy: mesma mensagem duas vezes | Processada uma vez | 🚫 |
| F-23 | Pós-deploy: texto com "advogado" ou "pagamento" | Resposta de handoff, sem chamar a IA | 🚫 |
| F-24 | Pós-deploy: formato de envio e de registro de webhook contra a versão real da Evolution | Aceito pela API | 🚫 não sei se bate (A-19) |

### 4.4 Telas (T)

Rodadas contra `VITE_DEMO_MODE=false` local, Chromium, 1280×800 e 375×800.

| ID | Passo | Esperado | Resultado 01/10 |
|---|---|---|---|
| T-01 | Abrir as 7 rotas do site + `/login` | 200, `h1` correto, sem exceção JS | ✅ (1 erro de console por página: 401 do refresh, A-07) |
| T-02 | Viewport 375 px em `/`, `/contatos`, `/login`, `/vistos` | Sem rolagem horizontal | ✅ |
| T-03 | `/blog/inexistente` | Mensagem "Artigo não encontrado" + link | ✅ |
| T-04 | `/rota-que-nao-existe` | Página 404 da marca | ❌ tela padrão do React Router (A-12) |
| T-05 | `/portal`, `/portal/jornada`, `/admin`, `/admin/clientes`, `/admin/leads`, `/admin/configuracoes` sem sessão | Redireciona para `/login` | ✅ 6/6 |
| T-06 | `/login` com credencial errada | Toast "E-mail ou senha inválidos." | ✅ |
| T-07 | `/contatos` com formulário vazio | 5 mensagens de erro (nome, e-mail, telefone, visto, consentimento) | ✅ |
| T-08 | `/contatos` com dados válidos | Confirmação; linha em `crm.leads`; consentimento registrado | ⏳ IP limitado; consentimento não é gravado (A-10) |
| T-09 | `/contatos` quando a API devolve 429 | Mensagem "Muitas tentativas…" | ⏳ por código |
| T-10 | `/contatos` anônimo não deve baixar `src/mocks/store` | Nenhuma requisição | ❌ baixa `store.ts` e `di.ts` (A-13) |
| T-11 | e2e: `pnpm --filter @akros/web test:e2e` | 11/11 | ⏳ sem credenciais |
| T-12 | Portal como Carlos: dashboard "Olá, Carlos" + EB-2 NIW; jornada com aviso "não grava"; documentos; pagamentos (BRL/USD); mensagens; agenda com reunião; perfil | Dados do próprio cliente, sem store mock | ⏳ |
| T-13 | Portal como Renata: repetir T-12 | Nenhum dado de Carlos aparece | ⏳ |
| T-14 | Admin: dashboard (funil de leads), clientes 360 (2 linhas), fila de revisão, propostas (vazia), operação, comunicação, agenda | Dados reais; avisos de "não grava" | ⏳ |
| T-15 | Admin → programas: editar e salvar um requisito; recarregar | Alteração persiste (UPDATE admin) | ⏳ |
| T-16 | Admin → configurações | Estados vazios reais ("Nenhuma integração real cadastrada.") | ⏳ |
| T-17 | Admin: `/admin/leads`, `/aprovacoes`, `/pagamentos`, `/reativacao` | Redirecionam e somem do menu | ⏳ (coberto pelo e2e AC-7) |
| T-18 | F5 em `/portal` e em `/admin` logado | Sessão rehidrata pelo cookie | ⏳ |
| T-19 | Logout e voltar com o botão do browser | Pede login | ⏳ |
| T-20 | Aba logada aberta por mais de 60 min, depois navegar | Renova o token ou leva ao login | ⏳ esperado ❌ (A-06) |
| T-21 | Simular 429 em `/api/sessao/refresh` com cookie válido | Não desloga a UI | ⏳ esperado ❌ (A-07) |
| T-22 | Barra de demo e impersonação | Ausentes em modo real | ⏳ |
| T-23 | Cliente novo convertido do lead consegue entrar | Login funciona | ❌ sem fluxo de convite (A-09) |

### 4.5 Código e gates (C)

Rodados no clone de `origin/main`.

| ID | Comando | Resultado 01/10 |
|---|---|---|
| C-01 | `pnpm lint` (biome) | ✅ 274 arquivos |
| C-02 | `pnpm --filter ./apps/web typecheck` | ✅ |
| C-03 | `pnpm --filter ./apps/web test` | ✅ 163/163 (41 arquivos) |
| C-04 | `pnpm --filter ./apps/web build` | ✅ entry 311 kB |
| C-05 | `pnpm arch:check` | ✅ 237 módulos, 0 violações |
| C-06 | `pnpm check:edge-functions` | ✅ 7 funções |
| C-07 | `pnpm lint:migrations` (convenções + squawk) | ✅ 16 migrations |
| C-08 | `pnpm audit:esteira` e `pnpm eval:spec` | ✅ 214 docs; dívida de baseline 299 AC / 74 artefatos |
| C-09 | `pnpm test:gates` | ✅ 81/81 |
| C-10 | `deno check supabase/functions/*/index.ts` | ✅ 8 arquivos |

Limite dos gates verdes: nenhum deles tocou o Supabase real. É por isso que A-03 (assinatura do
Vault) e A-04 (regex) passam na CI e falham em produção. Vale um gate que rode as migrations contra
um Postgres com as assinaturas reais do Supabase, ou um smoke pós-deploy.

### 4.6 Abuso que um cliente mal-intencionado tenta (S)

Rodar só contra ambiente de teste ou dentro de transação.

| ID | Ataque | Esperado | Resultado 01/10 |
|---|---|---|---|
| S-01 | `PATCH /rest/v1/pagamentos?id=eq.<id>` com `Content-Profile: pagamentos`, JWT de cliente, `{"status":"pago"}` | 403 ou 0 linhas | ❌ altera (B-11) |
| S-02 | Mesmo ataque em `jornada/etapas` e `documentos/documentos` | 403 ou 0 linhas | ❌ (B-12, B-13) |
| S-03 | `GET /rest/v1/dados_recebimento` com JWT de usuário sem papel | 403 ou `[]` | ❌ 2 linhas (B-16) |
| S-04 | `POST /rest/v1/rpc/criar_cliente_a_partir_de_lead` com JWT de cliente | 42501 | ✅ |
| S-05 | `GET /rest/v1/leads` com JWT de cliente e com `anon` | `[]` / 401 | ✅ |
| S-06 | Forjar `X-Forwarded-For` para furar o rate limit | Cota não zera | ✅ |
| S-07 | `sessao-refresh` sem `X-Akros-Csrf` | 401 | ✅ |
| S-08 | Enviar `estagio:"fechado"` no formulário público | 400 | ⏳ por código (`.strict()`) |

## 5. Ordem sugerida de correção

1. **Configuração (sem código):** variáveis do Netlify, Auth (site URL, redirects, signup off, senha
   mínima, senha vazada), `CORS_ALLOWED_ORIGINS`. Destrava A-01, A-05 (CORS), A-08 (parte), A-11.
2. **Migration de endurecimento de RLS:** A-02, A-08 (policies), A-14 (`REVOKE EXECUTE`). Reexecutar
   B-11 a B-16 e S-01 a S-03 até ficarem ✅.
3. **Corrigir e aplicar `0016`:** A-03 e A-04, alinhar o shim; deploy das duas functions;
   confirmar A-19 com a Evolution real; rodar F-19 a F-24.
4. **Sessão:** renovar o token por `expiresAt` e por 401; distinguir 401 de 429/5xx no refresh
   (A-06, A-07).
5. **Fluxo de negócio que falta no real:** convite/criação de login do cliente (A-09), tela de
   leads com conversão (A-10 junto, gravando o consentimento), e as escritas de processo atrás de
   RPC/Edge Function (pagamento, etapa, documento).
6. **Qualidade:** 404, store fora de `/contatos`, mensagens de erro do login, FK de `programa_id`.

## Anexo A — script de RLS com rollback

Executa como cada persona dentro de um `DO` que termina em `RAISE EXCEPTION`; a exceção desfaz tudo
e devolve o relatório na mensagem de erro. Não contém `DELETE` nem `UPDATE` sem `WHERE` por
desenho. Troque os UUIDs pelos de `auth.users` e `crm.clientes` do ambiente.

```sql
DO $t$
DECLARE
  rep text := ''; n int;
  carlos uuid := 'ab48f353-f2a7-4475-ab3c-19d15ce4cdb7';      -- auth.users.id do cliente A
  carlos_cli uuid := '760facdf-37fa-4f41-8cef-9a79d673a2cf';  -- crm.clientes.id do cliente A
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', carlos, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'cliente'))::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE pagamentos.pagamentos SET status = 'pago' WHERE cliente_id = carlos_cli;
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || format(E'cliente marca o próprio pagamento como pago: %s linha(s)\n', n);
  EXCEPTION WHEN OTHERS THEN rep := rep || format(E'bloqueado: %s\n', SQLERRM); END;

  BEGIN
    UPDATE jornada.etapas SET status = 'concluida'
    WHERE fase_id IN (SELECT f.id FROM jornada.fases f JOIN jornada.jornadas j ON j.id = f.jornada_id
                      WHERE j.cliente_id = carlos_cli);
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || format(E'cliente conclui a própria etapa: %s linha(s)\n', n);
  EXCEPTION WHEN OTHERS THEN rep := rep || format(E'bloqueado: %s\n', SQLERRM); END;

  BEGIN
    UPDATE documentos.documentos SET status = 'aprovado' WHERE cliente_id = carlos_cli;
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || format(E'cliente aprova o próprio documento: %s linha(s)\n', n);
  EXCEPTION WHEN OTHERS THEN rep := rep || format(E'bloqueado: %s\n', SQLERRM); END;

  BEGIN
    UPDATE crm.clientes SET case_manager = 'x', programa_id = 'outro', deleted_at = now()
    WHERE id = carlos_cli;
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || format(E'cliente edita case_manager/programa/deleted_at: %s linha(s)\n', n);
  EXCEPTION WHEN OTHERS THEN rep := rep || format(E'bloqueado: %s\n', SQLERRM); END;

  -- usuário autenticado sem papel (cadastro aberto)
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated',
    'app_metadata', json_build_object('provider', 'email'))::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM pagamentos.dados_recebimento;
  rep := rep || format(E'sem papel lê dados_recebimento: %s linha(s)\n', n);
  SELECT count(*) INTO n FROM programas.programas;
  rep := rep || format(E'sem papel lê programas: %s linha(s)\n', n);

  RESET ROLE;
  RAISE EXCEPTION E'\n=== RELATÓRIO (rollback) ===\n%', rep;
END
$t$;
```

Depois de rodar, confira que nada persistiu: `select count(*) from audit.eventos` deve voltar ao
valor anterior.
