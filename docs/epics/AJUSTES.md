---
name: AJUSTES
description: Lista de ajustes da parte real (achados da avaliação de 2026-10-01), com severidade, story que absorve e status. Evidência completa em docs/qa/caderno-de-teste-fase-real.md.
alwaysApply: false
---

# AJUSTES — parte real

Origem: avaliação de 2026-10-01 sobre `origin/main` @ `a87fbc0`. Evidência, reprodução e casos de
teste estão em `docs/qa/caderno-de-teste-fase-real.md`; os IDs `A-NN` abaixo são os de lá. Ajuste que
vira trabalho ganha story no `ROADMAP.md` e passa a seguir o ciclo spec-kit.

Legenda de status: ⬜ aberto · 🟨 em andamento (story) · 🟩 fechado.

## P0 — impedem produção real

| ID | Ajuste | Story | Status |
|---|---|---|---|
| A-01 | Site Netlify (produção e preview) roda em modo demo: `VITE_DEMO_MODE=false` e `VITE_SUPABASE_*` não definidos; lead do site vai para o mock | — | ⬜ (decisão de 2026-10-01: flag de demo mantida; trocar a variável no Netlify é ação de @devops) |
| A-02 | Cliente logado altera, pela API, o próprio pagamento (`pago`), etapa (`concluida`), documento (`aprovado`) e `case_manager`/`programa_id`/`deleted_at` do cadastro | — | ⬜ |
| A-03 | Migration `0016` não aplica no Supabase real (guarda do Vault usa assinatura de 3 argumentos; real tem 4/5) | — | ⬜ |
| A-04 | `0016`: regex `'\\D'` não normaliza telefone; WhatsApp nunca vincula ao cliente | — | ⬜ |
| A-05 | Edge Functions `integracoes-ia-salvar` e `evolution-webhook` sem deploy (404); `CORS_ALLOWED_ORIGINS` só tem `localhost:5173` | — | ⬜ |

## P1 — antes de cliente real

| ID | Ajuste | Story | Status |
|---|---|---|---|
| A-06 | Access token (1 h) nunca renova: `expiresAt` não é lido, `autoRefreshToken: false` | — | ⬜ |
| A-07 | `refresh()` trata 429/5xx como deslogado; toda página, até a anônima, chama `/api/sessao/refresh` | — | ⬜ |
| A-08 | Cadastro público aberto no Auth; `dados_recebimento` e `programas` com SELECT `true` para qualquer autenticado | E12-S04 (cadastro) · policies ⬜ | 🟨 |
| A-09 | Cliente convertido de lead nasce sem login (`auth_user_id NULL`); não existe convite | E12-S04 | 🟨 |
| A-10 | Consentimento LGPD do lead é coletado e descartado | — | ⬜ |
| A-11 | Auth em configuração de desenvolvimento: `site_url` localhost, lista de redirect vazia, senha mínima 6, senha vazada desligada | E12-S04 | 🟨 |

## P2 — qualidade e dívida

| ID | Ajuste | Status |
|---|---|---|
| A-12 | Página 404 própria (hoje: tela padrão do React Router) | ⬜ |
| A-13 | `/contatos` e home, anônimas em modo real, carregam `src/mocks/store` e `di.ts` | ⬜ |
| A-14 | Advisors: `REVOKE EXECUTE` em `audit.registrar_mudanca()` e `public.rls_auto_enable()`; `search_path` em `crm.meu_cliente_id`; performance (`auth_rls_initplan`, políticas permissivas múltiplas, FKs sem índice) | ⬜ |
| A-15 | Login mostra "E-mail ou senha inválidos." para qualquer falha (429, rede) | ⬜ |
| A-16 | Programa R/EB-4 só existe no mock; `crm.clientes.programa_id` sem FK | ⬜ |
| A-17 | Valores fixos: `case_manager='Natalia Luz'` na RPC de conversão; `origem` do formulário | ⬜ |
| A-18 | `sessao-logout` com escopo global; `telemetria-erro` mede 16 KiB em caracteres | ⬜ |
| A-19 | Payloads da Evolution API não verificados contra a versão instalada | ⬜ |

## Decisões que moldam a ordem (2026-10-01)

- **Login:** e-mail e senha do Supabase por enquanto, só por convite; Google e Microsoft entram
  depois como provedores adicionais.
- **Mock:** flag `VITE_DEMO_MODE` mantida como hoje; isolar o mock de verdade (build separado) e
  zerar dados de teste do Supabase ficam fora desta rodada e dependem de nova decisão.
- **Ordem sugerida do resto:** A-02 e A-01 primeiro (bloqueiam qualquer uso real), depois A-03/A-04/A-05
  e A-06/A-07.
