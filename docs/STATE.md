---
name: STATE
description: Estado volátil do trabalho — só a seção "Agora". Reescrito a cada pausa (use /handoff); histórico em docs/state-historico/.
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

## Agora

- **Data:** 2026-08-31
- **Story ativa:** nenhuma em implementação. **E13 fechado** (S01–S08), **E15-S01 fechado**
  (resiliência de módulo) e **E00-S06 em andamento** (invariantes da esteira — 3 dos 4 aplicados).
- **PR aberto:** [#3](https://github.com/Trivia-Growth/Akros/pull/3) — 15 checks verdes, mergeable.
  Aguarda merge do `@devops`.
- **Próximo passo:** `E13-S09` — migrar `jornada`/`documentos`/`pagamentos`/`comunicacao` para
  Supabase real, criar `crm.leads` + `criarClienteAPartirDeLead`, e então as 6 telas admin que
  ficaram mock. Ao fechar, **deletar** (não substituir) o `MAPA_ID_REAL_PARA_MOCK` em
  `SupabaseClienteRepository`.

### Bloqueios abertos

1. **`P0` em `docs/SECURITY_DEBT.md`** bloqueiam produção: rate limiting nas Edge Functions,
   CSP/HSTS, e o frontend que ainda lê mock fora de `clientes`.
2. **Job `e2e` desligado na CI** (`vars.E2E_HABILITADO`). Ele autentica contra o Supabase de
   produção; ligar exige decidir sobre usuários de teste em ambiente separado. Enquanto isso a
   matriz de autorização só roda na máquina de quem lembra.
3. **Dívida nomeada no baseline:** 307 AC sem task e 75 artefatos ausentes em 69 specs
   (ADR-0011). Não é para regularizar em massa — encolhe quando a story antiga for tocada.
4. **E16-S01 não implementada** (CSP, sink de erro). O deploy preview do Netlify, que era o AC-1,
   já funcionava — descoberto ao abrir o primeiro PR.

### Decisões recentes

- **ADR-0011 — política de artefato por tier.** A regra "nunca implemente sem spec.md e tasks.md"
  era violada por 73% do repositório. `tier` vira campo obrigatório na spec e decide o que é
  exigido; a dívida herdada fica nomeada e só encolhe.
- **CI ligada.** `.github/workflows/ci.yml` com um job por gate; `main` protegida com 12 checks
  obrigatórios, sem force-push e sem deleção. `enforce_admins` ficou **desligado** de propósito —
  ligar tranca o único mantenedor numa emergência; decisão a revisitar quando o time crescer.
- **E15-S01.** 68 chunks, entrada de 850,74 kB para 596,25 kB, `ErrorBoundary` por rota. Um
  `throw` no admin não derruba mais o site.

## Histórico

Sessões anteriores em `docs/state-historico/` — comece pelo `docs/state-historico/INDEX.md`.

> STATE é volátil e é lido em toda sessão: mantenha `## Agora` do tamanho de uma tela. Detalhe
> técnico não se perde — ele é **movido** para o arquivo do mês, nunca cortado. Decisão durável
> vai para `docs/adr/`, não para cá.

---
*Atualizar ao pausar. Use `/handoff` — ele impõe este formato.*
