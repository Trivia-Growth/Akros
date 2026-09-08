---
name: STATE
description: Estado volátil do trabalho — só a seção "Agora". Reescrito a cada pausa (use /handoff); histórico em docs/state-historico/.
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

## Agora

- **Data:** 2026-09-08
- **Story ativa:** nenhuma — `E06-S05` concluída e commitada nesta data (ver histórico abaixo);
  as stories restantes estão bloqueadas (deploy DevOps: E13-S12/E16-S01) ou aguardam decisão de
  produto/arquitetura (E10-S02+, E14-S02, dívida do ADR-0004 abaixo).
- **Dívida do ADR-0004 — RESOLVIDA em 2026-09-08 pelo ADR-0014:** a zona cinzenta (editor de
  Programa inteiro pré-existente + INSERT admin de `0015`, sem ADR) foi ratificada pelo dono do
  produto — **admin edita o Programa inteiro**; a salvaguarda é o congelamento por
  `programaVersao` dos casos instanciados (ADR-0004 continua valendo pelo mecanismo de versão,
  não pela imutabilidade da UI). Pagamentos recorrentes/multi-meio/faturas (E10-S02+) **fora de
  escopo por decisão** até nova orientação.
- **Gates:** 163 unitários (+8 de E06-S05), biome, `arch:check`, build e `audit:esteira` verdes.
- **Próximo passo:** DevOps dá push nos lotes acumulados (E13 + E00-S06 + E15-S02 + E06-S05),
  aplica `0016` e deploya as functions; decisões pendentes com o Bruno: escopo do ADR-0004
  (acima), E10-S02+ (provedor de pagamento real), E14-S02 (ratificar cofre entregue por E13-S12
  como SD-05 fechado).

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
