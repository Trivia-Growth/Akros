---
name: STATE
description: Estado volátil do trabalho — só a seção "Agora". Reescrito a cada pausa (use /handoff); histórico em docs/state-historico/.
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

## Agora

- **Data:** 2026-09-05
- **Story ativa:** `E13-S12` 🟨. **Programas**, **Configurações**, **Agenda**, transcrições,
  **Jornada**, **Documentos**, **Pagamentos**, **Mensagens do portal**, **Propostas**,
  **Comunicação**, **Dashboard admin**, **Dashboard portal**, **Perfil**, **Operação** e
  **Cliente 360** e **Fila de revisão** leem Supabase fora do demo. Consultas usam RLS por
  `auth.uid()`, não `clienteId` legado. Jornada, upload/assinatura,
  comprovante/conciliação, mensageria e ciclo de proposta ficam em leitura até Storage/RPC/Edge
  Function seguros controlarem transições, arquivo e auditoria. **Evolution/OpenRouter:** Central
  agora recebe as duas keys uma vez, guarda no Vault por RPC service-role, registra webhook via
  Edge Function e só responde após checkbox explícito. Recebimento tem deduplicação persistente,
  token capability no header e handoff para pedido sensível/humano.
- **Gates:** 155 unitários, build, `arch:check`, auditoria e eval verdes; migration lint, `deno
  check` e PostgreSQL 17 limpo passaram para E13-S12. Playwright serial
  10/10 confirmou Cliente 360, Perfil, Fila e ausência de `mocks/store` em sessão real.
  Bootstrap compartilha refresh no `StrictMode`, ficando abaixo do teto remoto; matriz fixa locale
  `pt-BR` para asserções determinísticas. Mapa temporário removido; layouts isolam chunks demo.
- **Próximo passo:** DevOps aplica `0016` e deploya `integracoes-ia-salvar`/
  `evolution-webhook`; então administrador configura chaves só em `/admin/configuracoes` e ativa
  agente. Em paralelo, migrar ou ocultar `/admin/leads`, `/admin/aprovacoes`,
  `/admin/pagamentos` e `/admin/reativacao` para fechar corte demo.

### Bloqueios abertos

1. **`P0` em `docs/SECURITY_DEBT.md`:** frontend ainda lê mock em `/admin/leads`,
   `/admin/aprovacoes`, `/admin/pagamentos` e `/admin/reativacao`; store global mantém personas
   enquanto essas rotas existirem fora do demo.
2. **E2E só local:** autentica contra Supabase real; não roda na CI por decisão registrada no
   `lefthook.yml`. Passou 6/6 em 2026-09-04.
3. **Dívida nomeada no baseline:** 307 AC sem task e 75 artefatos ausentes em 69 specs
   (ADR-0011). Não é para regularizar em massa — encolhe quando a story antiga for tocada.
4. **E16-S01 permanece 🟨:** CSP/telemetria escritas; faltam verificação no preview, deploy da
   function e exercício real do runbook de rollback.
5. **Mutações de processo bloqueadas:** RLS histórico permite UPDATE próprio em Jornada,
   Documento e Pagamento, mas não valida todas as transições; `comunicacao.eventos` não concede
   INSERT ao navegador; `crm.propostas` não valida seu ciclo de vida. Não habilitar UI até
   Storage/RPC/Edge Function aplicar transição, validação e auditoria.
6. **Rollout E13-S12:** código/migration estão locais e testados, mas nenhuma key/instância foi
   configurada e functions ainda precisam do deploy do DevOps. Agente permanece sem saída externa.

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
