---
name: PRODUCT
description: Por que a plataforma precisa de autenticação real antes de sair do protótipo.
story: E12-S02
alwaysApply: false
---

# product.md — E12-S02 Autenticação e RBAC

## Por quê

O protótipo (E00–E11) roda sem login — qualquer pessoa com a URL navega como qualquer cliente via
impersonação. Isso é correto para demo, mas é o **bloqueador P0 nº 2** identificado na revisão
adversarial de 28/08/2026 (`docs/STATE.md`): não existe autenticação nem guarda de rota. Sem isso,
não há como colocar dado real de cliente (PII de processo de imigração — passaporte, endereço,
estado civil, dependentes) na plataforma sem expor o processo de um cliente a qualquer outro.

Esta story fecha a fundação de identidade: quem é o usuário, que papel tem, e como a sessão dele é
mantida com segurança — sem essa base, E13 (schema + RLS) não tem em cima do que aplicar policy
(a policy de linha depende do `cliente_id` do claim do JWT, ADR-0009).

## Para quem

- **Cliente** — acessa só `/portal/*`, só os próprios dados.
- **Admin (time Akros)** — acessa só `/admin/*`, dados de todos os clientes.
- Um mesmo login nunca acumula os dois papéis nesta fase (sem hierarquia de permissão além do
  binário cliente/admin — RBAC fino por permissão, se necessário, é decisão de produto futura, fora
  de escopo aqui).

## O que já está decidido (não re-abrir)

- **ADR-0008** — mecânica de sessão: access token em memória (TTL 15min), refresh token em cookie
  `HttpOnly; Secure; SameSite=Strict` gravado só por Edge Function, proxy Netlify pra cookie
  first-party. Três funções: `sessao-login`, `sessao-refresh`, `sessao-logout`.
- **ADR-0009** — isolamento single-tenant: papel decide schema (`portal` vs `admin` — chega em
  E13), `cliente_id` do claim do JWT decide linha dentro do `portal`. Sem `org_id` em lugar nenhum.
- **Ordem:** depende de E12-S01 (páginas já devem consumir via `container`/porta antes de trocar
  o que há por trás — plugar Supabase Auth num código que ainda lê `useMockDb` direto duplicaria
  retrabalho).

## Escopo desta story

- Projeto Supabase já existe (`mhxopadkizktsenohnbm`, `sa-east-1`, Postgres 17) — não cria projeto
  novo.
- Cadastro do primeiro usuário admin (seed, não fluxo de self-signup nesta fase — self-signup de
  admin é risco, não faz sentido de produto).
- Login por e-mail/senha (sem OAuth social nesta story — fora de escopo, decisão de produto
  futura se a Akros pedir).
- Guarda de rota no front: `/portal/*` exige sessão com papel `cliente`; `/admin/*` exige sessão
  com papel `admin`; sem sessão vai pro login.
- A barra de impersonação (E05-S01) **deixa de estar disponível fora de modo dev/demo** quando
  autenticação real está ativa — precisa de flag de ambiente pra não vazar em produção.

## Fora de escopo (explícito)

- MFA e política de senha (ADR-0008 já registrou como fora do ADR — decisão de produto separada).
- Timeout por inatividade (baseline sugere ~30min — implementação desta story pode incluir se
  couber no tamanho, mas não é AC obrigatório; se ficar de fora, vira item explícito do
  `tasks.md`, não escondido).
- RLS / isolamento de linha no banco — é E13. Esta story autentica e resolve o papel; a policy que
  impede um cliente de ler dado de outro é a próxima story.
- Recuperação de senha ("esqueci minha senha") — se a Akros pedir antes do go-live, vira story
  própria; caso contrário, reset é feito manualmente pelo admin via dashboard Supabase nesta fase.
- Multi-fator, SSO corporativo, cartão salvo — não fazem parte do produto atual.

## Usuários seed (ambiente de desenvolvimento)

Criados via Supabase Auth Admin API no projeto `mhxopadkizktsenohnbm`, pra uso durante o
desenvolvimento desta epic — **não** hardcoded no código, são usuários reais no Supabase Auth:

| E-mail | Papel (`app_metadata.role`) | Mapeado pra persona mock | User ID |
|---|---|---|---|
| `lm.azeved@gmail.com` | `admin` | — (acessa `/admin`, todos os clientes) | `c1e4f373-755d-4b68-b729-950c89eb5a64` |
| `carlos.mendes@example.com` | `cliente` | `cliente-carlos` (`app_metadata.cliente_id`) | `ab48f353-f2a7-4475-ab3c-19d15ce4cdb7` |

Senha de ambos: a combinada com o Lucas (não repetida aqui). `email_confirm: true` — sem fluxo de
verificação por e-mail necessário.

**Decisão de escopo desta story** (resposta à dúvida "quanto fica mockado"): a autenticação em si é
real (Supabase Auth + sessão do ADR-0008) — isso é o que valida de verdade. O que fica temporário e
documentado como `SPEC_DEVIATION` é só a **resolução de qual persona mockada mostrar** depois do
login: lida do `app_metadata.cliente_id` do JWT (papel `cliente`) contra o array de personas em
`mocks/personas.ts`, sem tabela `usuarios` real — essa tabela só existe a partir do E13. Nenhuma
credencial (senha, token) é hardcoded em código em nenhum momento.

## Critério de sucesso

- Lucas (admin) consegue logar em `/admin` com e-mail/senha reais e navegar o painel sem
  impersonação ligada.
- Uma pessoa sem sessão que tenta acessar `/admin/*` ou `/portal/*` direto é redirecionada pro
  login, sem ver nenhum dado.
- Fechar a aba encerra a sessão (comportamento do ADR-0008 observável, não só documentado).
- Nenhuma credencial (senha, refresh token) aparece em `localStorage`/`sessionStorage` — checável
  via DevTools em qualquer momento da sessão.
