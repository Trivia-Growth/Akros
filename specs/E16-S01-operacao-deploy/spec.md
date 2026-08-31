---
name: SPEC
description: Contrato (AC) de operação — deploy preview por PR, CSP/HSTS e sink de erro de cliente. E16-S01.
story: E16-S01
tier: pequeno
alwaysApply: false
---

# spec.md — E16-S01 Operação: preview, headers e telemetria

## Contexto
Três lacunas de operação achadas na auditoria de 2026-08-30, em ordem de prioridade definida pelo
dono do produto. Todas baratas agora e caras depois que houver usuário real.

1. **Sem deploy preview** — nenhuma validação visual acontece fora de `localhost`. A pendência de
   "peer review nunca feito" atravessou duas rodadas inteiras por causa disso.
2. **Sem CSP e sem HSTS** — SD-02 em `docs/SECURITY_DEBT.md`. O ADR-0008 aceita explicitamente que
   XSS com a página aberta continua podendo agir em nome do usuário e nomeia CSP estrita como a
   mitigação; ela não existe.
3. **Sem sink de erro de cliente** — SD-10. `shared/lib/log.ts` escreve local. Combinado com a
   ausência de Error Boundary (E15-S01), o modo de falha é tela branca sem telemetria.

Tier **pequeno**: nenhuma decisão nova de arquitetura. CSP e sessão já estão decididos em
ADR-0008; o sink pendura no boundary que E15-S01 cria.

## Fora de escopo
- APM, tracing distribuído, dashboard de métrica de negócio.
- Rate limiting das Edge Functions (SD-01) — story própria de segurança.
- Ambiente de staging permanente. Preview por PR é efêmero, e é o que resolve o problema citado.

## Dependência
AC-3 depende do `ErrorBoundary` de **E15-S01**. Os demais são independentes.

## Acceptance Criteria

### AC-1 — Todo PR gera uma URL navegável
> **Já satisfeito, descoberto em 2026-08-31.** O primeiro PR real (#3) trouxe
> `netlify/imigrationakros/deploy-preview` verde sem nenhuma mudança em `netlify.toml`: a
> integração do Netlify com o repositório já gerava preview por PR. O que faltava não era a
> configuração — era **existir um PR**, coisa que não acontecia em 38 commits. A task 1 vira
> verificação, não implementação.
**Given** um PR aberto contra `main`
**When** a CI conclui
**Then** o PR tem uma URL de deploy preview daquele commit, e a URL serve a versão do PR — não a
de `main`.

### AC-2 — CSP sobe primeiro em modo relatório
**Given** o deploy de produção
**When** a página é servida
**Then** a resposta traz `Content-Security-Policy-Report-Only` e `Strict-Transport-Security`, e a
política de relatório cobre `script-src`, `style-src`, `connect-src` e `frame-ancestors`.

### AC-3 — Erro de cliente chega a algum lugar consultável
**Given** uma exceção capturada pelo `ErrorBoundary` (E15-S01)
**When** o fallback é exibido
**Then** a stack, a rota e o identificador da sessão são enviados ao sink, e o envio falhando
**não** quebra o fallback.

### AC-4 — Telemetria não vaza dado pessoal
**Given** um erro que ocorre numa tela com dado de cliente
**When** o evento é enviado ao sink
**Then** o payload não contém e-mail, telefone, documento nem token — verificado por teste sobre o
serializador, não por inspeção.

### AC-5 — Rollback é procedimento escrito e testado
**Given** um deploy ruim em produção
**When** quem está de plantão abre `docs/runbook-rollback.md`
**Then** encontra o comando exato para reverter o deploy, o comando para reverter uma migration, e
o procedimento para o caso em que só a migration subiu — e cada um foi executado ao menos uma vez
em ambiente de teste antes de virar linha do runbook.
