---
name: STATE
description: Estado volátil do trabalho — só a seção "Agora". Reescrito a cada pausa (use /handoff); histórico em docs/state-historico/.
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

## Agora

- **Data:** 2026-09-06
- **E00-S06 concluída e commitada em 2026-09-06** (trabalho de duas sessões na mesma árvore,
  consolidado num commit só). Os 3 invariantes adotados
  integralmente (1, 3, 5→metade-4) fecham: AC-1 (`check-gate-coverage.mjs` novo, 11/11 scripts
  com teste par — faltavam `check-story`, `nova-story`, `prepare-hooks`, `remind-impeccable`),
  AC-2 (guarda de coleção vazia em `check-edge-functions`/`lint-migrations`/`validate-mermaid`,
  já estava em `eval-spec-fidelity`/`audit-esteira`), AC-3 (regra `frente-nao-importa-frente` já
  existia), AC-4 (teste de não-propagação já existia em `E15-S01`), AC-5
  (`check-degraded-mode.mjs` novo: design.md da story de origem declara `integracoes:` no
  frontmatter e precisa de seção "Modo degradado" por slug — retrofit completo, 10 integrações
  em 6 design.md: `E04-S07` google/microsoft/calendly, `E13-S12` evolution/openrouter, e
  design.md mínimos criados para `E04-S01` whatsapp, `E04-S04` fireflies, `E04-S06` instagram e
  `E04-S15` openrouter/whisper). Todos os 5 AC verdes por comando, não por inspeção. Achados de
  bug ao escrever os testes, corrigidos no mesmo lote:
  - `check-degraded-mode.mjs` reportava a mensagem genérica de "zero integrações" mesmo quando o
    erro real era um `integracoes:` malformado — ordem dos guards trocada.
  - `nova-story.mjs` procurava heading `### E0N —` (o real é `## E0N —`) e um schema de tabela de
    6 colunas que não existe mais no ROADMAP (real são 8) — nunca inseria a linha certa. Ganhou
    também modo `--epico/--story/--descricao/--owner/--tier/--root` não-interativo:
    `rl.question()` encadeado trava para sempre com stdin não-TTY (achado ao tentar testar).
  - `remind-impeccable.mjs` media "achei tasks.md" pelo exit code de `find` (sempre 0 mesmo sem
    match) — trocado por leitura direta de `specs/*/tasks.md` via `isSpecDir`.
  - `check-story.mjs` ganhou override de root (`argv[2]`) só para teste isolado.
  Novos comandos wireados no `pre-push`: `gate-coverage` e `degraded-mode` (ao lado de `esteira`
  e `edge-functions`, como o `design.md` pedia); `mermaid` passou a rodar seu teste antes do gate
  (`pnpm run validate:mermaid`, mesmo padrão dos outros). Commitada em 2026-09-06 como
  `feat(E00-S06)`; push continua sendo passo do @devops.
- **Story anterior:** `E13-S12` 🟨 (aguardando rollout DevOps, sem mudança nesta sessão). Lote
  E13-S09/S10/S11/S12 commitado em 5 commits locais (5a0acf8..f8a1c34); push/PR é passo do
  @devops. **P0 do SECURITY_DEBT fechado:** as 4 rotas admin que ainda liam mock (`/admin/leads`,
  `/admin/aprovacoes`, `/admin/pagamentos`, `/admin/reativacao`) existem só no modo demo — fora
  dele redirecionam ao dashboard e somem do menu (`demoOnly`). Sessão real não carrega
  `useMockDb` nem `mocks/store`; e2e AC-7 prova pelo caminho do usuário. Migração real dessas 4
  telas vira story própria (depende de RPC/Edge Function de transição/auditoria).
- **Gates:** 80/80 `test:gates` (scripts/), `arch:check`, `eval:spec` e `audit:esteira` verdes
  após as mudanças de E00-S06. E13-S12: 155 unitários, build, `arch:check`, biome, migration lint
  e `deno check` verdes no lote. Playwright serial com AC-7 novo — total 11/11.
- **Próximo passo:** DevOps aplica `0016` e deploya
  `integracoes-ia-salvar`/`evolution-webhook` (e dá push nos lotes E13 + E00-S06 + abre PR); então
  administrador configura chaves só em `/admin/configuracoes` e ativa agente. Depois: story de
  migração das 4 telas ocultadas.

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
