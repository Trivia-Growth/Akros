---
name: STATE
description: Estado volátil do trabalho — só a seção "Agora". Reescrito a cada pausa (use /handoff); histórico em docs/state-historico/.
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

## Agora

- **Data:** 2026-08-31
- **Story ativa:** nenhuma em implementação. Épico **E13 fechado** (S01–S08 🟩): 10 schemas reais
  com RLS provado ao vivo, `audit.*` append-only, e o primeiro adapter Supabase real no frontend
  (`SupabaseClienteRepository`) — prova ponta a ponta de que o ADR-0002 aguenta a migração sem
  reescrever tela.
- **Próximo passo:** `E13-S09` — migrar `jornada`/`documentos`/`pagamentos`/`comunicacao` para
  Supabase real, criar `crm.leads` + `criarClienteAPartirDeLead`, e então as 6 telas admin que
  ficaram mock. Ao fechar, **deletar** (não substituir) o `MAPA_ID_REAL_PARA_MOCK` em
  `SupabaseClienteRepository` — todo mundo passa a falar uuid.

### Bloqueios abertos

1. **Política de artefato não decidida.** `specs/_debt-baseline.json` nomeia 310 AC sem task de
   61 specs antigas. O baseline é temporário e só some quando a política virar ADR: em que tier
   `tasks.md` e `product.md` são realmente obrigatórios. Enquanto isso, `product.md` existe em
   4 de 80 specs contra uma regra que diz "sempre".
2. **CI existe mas não está ativa.** `.github/workflows/ci.yml` tem 13 jobs; falta marcar os
   checks como obrigatórios na branch protection de `main`. Até lá `@devops` é papel sem poder —
   38 commits, 0 PRs — e duas sessões podem colidir no mesmo arquivo (aconteceu em 30/08 com
   `docs/SECURITY_DEBT.md`).
3. **Resiliência e operação são desenho, não código.** `specs/E15-S01-resiliencia-modulo/` e
   `specs/E16-S01-operacao-deploy/` estão especificadas e não implementadas. Hoje ainda não há
   Error Boundary nem code-splitting: um `throw` em qualquer tela derruba site, portal e admin
   juntos. Bundle único de 850,74 kB.
4. **`P0` abertos em `docs/SECURITY_DEBT.md`** bloqueiam produção — rate limiting nas Edge
   Functions e CSP/HSTS, além do frontend que ainda lê mock fora de `clientes`.

### Decisões recentes

- **Esteira endurecida (31/08).** Dois gates que passavam avaliando zero itens foram corrigidos;
  todo gate de `scripts/` com teste próprio agora tem `<nome>.test.mjs` provando que ele falha
  quando deve (`pnpm run test:gates`, 30 testes). RLS FORCE, caminho `docs/*.md` citado e
  `pnpm run <script>` citado viraram gate. Ver `specs/E00-S06-invariantes-padrao-os/design.md`.
- **Bootstrap documentado.** `docs/NOVO-PROJETO.md` diz o que copiar, o que apagar e as 6 lacunas
  conhecidas ao iniciar um projeto novo com este padrão.

## Histórico

Sessões anteriores em `docs/state-historico/` — comece pelo `docs/state-historico/INDEX.md`.

> STATE é volátil e é lido em toda sessão: mantenha `## Agora` do tamanho de uma tela. Detalhe
> técnico não se perde — ele é **movido** para o arquivo do mês, nunca cortado. Decisão durável
> vai para `docs/adr/`, não para cá.

---
*Atualizar ao pausar. Use `/handoff` — ele impõe este formato.*
