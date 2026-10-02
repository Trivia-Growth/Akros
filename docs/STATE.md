---
name: STATE
description: Estado volátil do trabalho — só a seção "Agora". Reescrito a cada pausa (use /handoff); histórico em docs/state-historico/.
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

## Agora

- **Data:** 2026-10-01
- **Story ativa:** `E00-S07` 🟨 — Spec Kit como SDD + gates enxutos, na branch
  `chore/E00-S07-spec-kit-sdd` (worktree `~/GitHub/Akros-sdd`). Implementada e verificada
  localmente; **não commitada nem enviada**. Spec em `specs/001-spec-kit-sdd-gates-enxutos/`.
- **Decisões:** ADR-0015 (Spec Kit; 91 specs anteriores congeladas) e ADR-0016 (CI 13→3 jobs,
  pre-push 14→4 comandos; e2e vira `pnpm e2e` sob demanda). Skills `/nova-feature`, `/clarificar`,
  `/validar`, `/auditar` removidas.
- **Próximo passo:** `/revisao-adversarial` sobre o corte (T-12); `@devops` trocar os required
  checks da `main` (T-09, comando em `tasks.md`) e só então abrir o PR.
- **Avaliação de 2026-10-01** (`docs/qa/caderno-de-teste-fase-real.md`, no checkout principal,
  ainda sem commit) mostrou que a parte real não está alcançável em produção e tem furos de RLS;
  viram stories próprias (fora do escopo de E00-S07): site Netlify em modo demo (A-01), RLS de
  UPDATE do cliente (A-02), migration `0016` (A-03/A-04), renovação de token (A-06).
- **Atenção — checkout principal quebrado:** `~/GitHub/Akros` está sem commits e com 1.638 arquivos
  staged mas ausentes do disco. O trabalho vive em worktrees a partir de `origin/main`.

## Histórico

- **2026-09-08 — E06-S05 concluída (🟩).** ADR-0013 escrito e aceito (exceção pontual ao ADR-0004,
  escopo mínimo: só `RequisitoDocumento` editável). CRUD de requisito com remoção bloqueada por
  vínculo (oferece desativar), skill obrigatória validada na aplicação, histórico de troca do
  arquivo de referência; `AnalisadorDocumentoPort` ganhou `skillAnalise?`/`arquivoReferenciaId?`
  opcionais e o mock cita a configuração no parecer — invariante do ADR-0005 provada intacta com
  skill ligada (testes antes do código). Desvio AC-7 registrado: feature `programas` segue PT
  literal (SPEC_DEVIATION prévia). 163 testes, gates verdes.
- **2026-09-06 — E00-S06 concluída (🟩)** e **E15-S02 concluída (🟩, formalização)**. Detalhes nos
  commits `edb54d3`/`d6fe787` (E00-S06) e `a41b8c6` (E15-S02).

- **2026-09-06/05 — histórico anterior:**
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
