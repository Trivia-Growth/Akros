---
name: STATE
description: Estado volátil do trabalho — só a seção "Agora". Reescrito a cada pausa (use /handoff); histórico em docs/state-historico/.
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

## Agora

- **Data:** 2026-09-05
- **Story ativa:** `E13-S12` 🟨 (aguardando rollout DevOps). Lote E13-S09/S10/S11/S12 commitado
  em 5 commits locais (5a0acf8..f8a1c34); push/PR é passo do @devops. **P0 do SECURITY_DEBT
  fechado:** as 4 rotas admin que ainda liam mock (`/admin/leads`, `/admin/aprovacoes`,
  `/admin/pagamentos`, `/admin/reativacao`) existem só no modo demo — fora dele redirecionam ao
  dashboard e somem do menu (`demoOnly`). Sessão real não carrega `useMockDb` nem `mocks/store`;
  e2e AC-7 prova pelo caminho do usuário. Migração real dessas 4 telas vira story própria
  (depende de RPC/Edge Function de transição/auditoria).
- **Gates:** 155 unitários, build, `arch:check`, biome, migration lint e `deno check` verdes no
  lote. Playwright serial com AC-7 novo (rotas mock inexistentes fora do demo) — total 11/11.
- **Próximo passo:** DevOps aplica `0016` e deploya `integracoes-ia-salvar`/`evolution-webhook`
  (e dá push no lote + abre PR); então administrador configura chaves só em
  `/admin/configuracoes` e ativa agente. Depois: story de migração das 4 telas ocultadas.

### Bloqueios abertos

1. **E2E só local:** autentica contra Supabase real; não roda na CI por decisão registrada no
   `lefthook.yml`. Auth-matrix 7/7 em 2026-09-05.
2. **Dívida nomeada no baseline:** 307 AC sem task e 75 artefatos ausentes em 69 specs
   (ADR-0011). Não é para regularizar em massa — encolhe quando a story antiga for tocada.
3. **E16-S01 permanece 🟨:** CSP/telemetria escritas; faltam verificação no preview, deploy da
   function e exercício real do runbook de rollback.
4. **Mutações de processo bloqueadas:** RLS histórico permite UPDATE próprio em Jornada,
   Documento e Pagamento, mas não valida todas as transições; `comunicacao.eventos` não concede
   INSERT ao navegador; `crm.propostas` não valida seu ciclo de vida. Não habilitar UI até
   Storage/RPC/Edge Function aplicar transição, validação e auditoria. É o que segura as 4 telas
   ocultadas (kanban de leads, aprovações, conciliação, reativação).
5. **Rollout E13-S12:** código/migration estão commitados e testados, mas nenhuma key/instância
   foi configurada e functions ainda precisam do deploy do DevOps. Agente permanece sem saída
   externa.

### Decisões recentes

- **ADR-0011 — política de artefato por tier.** A regra "nunca implemente sem spec.md e tasks.md"
  era violada por 73% do repositório. `tier` vira campo obrigatório na spec e decide o que é
  exigido; a dívida herdada fica nomeada e só encolhe.
- **CI ligada e `main` protegida.** 12 checks obrigatórios, strict, sem force-push e sem deleção.
  `enforce_admins` ficou **desligado** de propósito — ligar tranca o único mantenedor numa
  emergência; revisitar quando o time crescer. `e2e` fora dos obrigatórios enquanto estiver
  desligado (bloqueio 2).
- **Atenção — worktree obsoleto.** `/Users/lucasazevedo/Documents/GitHub/Akros` é um segundo
  worktree deste repositório, parado em `main` de 06/08 (32 commits atrás, sem nenhum dos gates
  novos). Rode `git pull` lá antes de tocar qualquer coisa, ou remova o worktree.
- **E15-S01.** 68 chunks, entrada de 850,74 kB para 596,25 kB, `ErrorBoundary` por rota. Um
  `throw` no admin não derruba mais o site.
- **ADR-0012 — Vault + capability header.** BYOK passa por Edge Function admin/CSRF, segredo fica
  no Vault e Evolution autentica webhook por token de 256 bits em header; URL não contém segredo.

## Histórico

Sessões anteriores em `docs/state-historico/` — comece pelo `docs/state-historico/INDEX.md`.

> STATE é volátil e é lido em toda sessão: mantenha `## Agora` do tamanho de uma tela. Detalhe
> técnico não se perde — ele é **movido** para o arquivo do mês, nunca cortado. Decisão durável
> vai para `docs/adr/`, não para cá.

---
*Atualizar ao pausar. Use `/handoff` — ele impõe este formato.*
