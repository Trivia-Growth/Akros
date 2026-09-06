---
name: TASKS
description: Decomposição AC→task→gate de E13-S09.
story: E13-S09
alwaysApply: false
---

# tasks.md — E13-S09 Sair do mock: os 4 contextos restantes

> Uma story-filha por contexto, como em E13-S01..S05 — cada passo reversível sozinho.

## Task 1 — `crm.leads` + adapter (AC-1)
Schema com RLS (lead é admin-only: não loga), adapter e `criarAPartirDeLead` real.
Destrava as 6 telas presas desde E13-S08.

**Gate:** `lint:migrations` verde; teste de conversão lead→cliente gravando em `crm.clientes`.

## Task 2 — `jornada` (AC-2, AC-6)
`DashboardPage`, `JornadaPage`, `OperacaoPage`. Auditar hook após early return em cada uma.

**Gate:** `pnpm test` + navegação real fora do modo demo.

## Task 3 — `documentos` (AC-2, AC-6)
Depende da task 2 (requisito de documento é por fase).

**Gate:** idem.

## Task 4 — `pagamentos` (AC-2, AC-6)

**Gate:** idem.

## Task 5 — `comunicacao` (AC-2, AC-6)
Maior volume: threads em JSONB.

**Gate:** idem.

## Task 6 — Store fictícia fora do ar (AC-3)
`useMockDb` deixa de ser inicializada quando `isDemoMode = false`. Não é filtro — é não carregar.

**Gate:** teste montando a app com `VITE_DEMO_MODE=false` e afirmando store vazia.

## Task 7 — Deletar o mapa de id (AC-4)
Remover `MAPA_ID_REAL_PARA_MOCK` e a `SPEC_DEVIATION`. Se algo quebrar ao remover, é porque um
contexto não migrou — o mapa é o detector.

**Gate:** `pnpm run eval:spec` mostrando um `SPEC_DEVIATION` a menos; suíte verde.

## Task 8 — Isolamento provado pela aplicação (AC-5)
Novo caso no `e2e/auth-matrix.spec.ts`: cliente A navega o portal e não vê nada de B. Substitui a
verificação por `curl` no PostgREST por uma pelo caminho real.

**Gate:** `pnpm --filter @akros/web exec playwright test` verde (roda no `pre-push`).


---

## Progresso (2026-08-31)

**Task 1 entregue em código — falta aplicar no projeto real.** `crm.leads` existe com RLS admin-only,
índice por estágio e trigger de auditoria; a FK `crm.clientes.lead_origem_id`, que 0001 deixou
como coluna solta porque a tabela de lead não existia, finalmente fecha.

| | |
|---|---|
| `0011_E13-S09_schema_leads.sql` | tabela, RLS, índice, FK `NOT VALID` |
| `0012_E13-S09_valida_fk_lead_origem.sql` | `VALIDATE CONSTRAINT` em transação separada |
| `supabase/tests/02-rls-leads_test.sql` | admin vê · cliente recebe `[]` · cliente não insere · ninguém apaga · FK barra id inexistente |

Duas decisões que o Squawk e o padrão da casa forçaram, e valem registro:

- **FK entra `NOT VALID`.** Validar na criação exige scan e `SHARE ROW EXCLUSIVE` nas duas
  tabelas, bloqueando escrita. Hoje `crm.clientes` tem 2 linhas, mas migration é imutável e vai
  reaplicar num banco que talvez não seja mais pequeno.
- **Sem policy de `DELETE` para ninguém.** Lead descartado vira `estagio = 'descartado'`. Apagar
  destruiria a base de reativação (E11-S05) e a trilha de auditoria.

**Ganho de brinde:** `00-shim-supabase.sql` passou a fazer `auth.jwt()` ler `request.jwt.claims`
do settings da sessão, como o PostgREST faz de verdade. **Isso torna RLS testável na CI** — antes
o stub devolvia `NULL`, toda policy dava falso, e um teste teria "passado" provando o oposto do
que parece. É o primeiro passo real contra o item "RLS sem teste automatizado no CI" do
`SECURITY_DEBT`.

### Também entregue

**Task 6 (AC-6) fechada por gate, não por auditoria.** `correctness/useHookAtTopLevel` ligado no
Biome. O código passa limpo hoje, e a regra foi provada disparando com uma violação proposital
antes de ser considerada ativa. Isso cobre não só as telas desta story, mas toda tela futura.

**Adapter de lead escrito** (`shared/contracts/SupabaseLeadRepository.ts`) com testes de
mapeamento — que é onde o erro silencioso mora: uma coluna esquecida em `paraColunas` some sem o
TypeScript reclamar, porque o retorno é `Record<string, unknown>`.

**Ligação dividida no `di.ts`.** `container.capturaLeads` usa o adapter real fora do modo demo,
portanto o formulário público não grava mais no Zustand. `container.leads` continua mock de
propósito: ligar a gestão antes dos hooks/telas produz estado partido no kanban.

**Conversão entregue e aplicada.** `0013_E13-S09_converte_lead_cliente.sql` cria RPC admin-only,
atômica, fecha o lead e impede conversão duplicada por índice único. O
`SupabaseClienteRepository.criarAPartirDeLead` passou a chamá-la; teste unitário prova a tradução e
`02-rls-leads_test.sql` prova criação + recusa de elevação por cliente. Em 2026-09-04, chamada
remota com JWT admin devolveu `200`, vinculou cliente ao lead e fechou o lead; registros técnicos
foram removidos/arquivados depois da prova.

### Task 9 (nova) — Edge Function `lead-capturar` (AC-7)

**Bloqueia ligar o adapter no `di.ts`.** O formulário público chama
`container.capturaLeads.criar()` como visitante anônimo; com a RLS admin-only isso seria `401` se
tentasse a tabela. Function com Zod + `service_role` + rate limit, e o adapter usa o endpoint
first-party `/api/leads`. O proxy existe no Vite e no Netlify para manter a CSP em
`connect-src 'self'`.

**Gate:** `curl` anônimo criando lead com sucesso pela function, e continuando barrado no
`INSERT` direto da tabela.

**Resultado (2026-09-04):** function v2 `ACTIVE`. `curl` anônimo devolveu `201`; `INSERT` direto
com `anon` devolveu `401`; payload acima de 8 KiB devolveu `413`; lead técnico foi arquivado.
`deno check`, `check:edge-functions`, typecheck, 11 testes focados e SQL verdes. **Task 9 fechada.**

### Achado de 2026-08-31 — ligar o `di.ts` NÃO basta, e isso muda as tasks 2 a 5

Liguei o `SupabaseLeadRepository` no `di.ts` e verifiquei em browser real. O kanban continuou
mostrando os **12 leads mockados**. Motivo: `KanbanPage` **lê** de `useMockDb((s) => s.leads)` e
só **escreve** por `container.leads`. Com o adapter ligado, a escrita vai para o Supabase e a
leitura volta do mock — estado partido, e os ids nem batem (`lead-001` × uuid). **Revertido.**

**O mesmo já vale hoje, em produção, para `clientes`** — migrado em E13-S08. Oito telas seguem
lendo do mock:

```
AdminDashboardPage · ConciliacaoPage · FilaRevisaoPage · AdminAgendaPage
ProgramasPage · OperacaoPage · PropostaDocumentoPage · DemoBar
```

Sintoma concreto: `/admin/clientes` mostra os 2 clientes reais, enquanto dashboard, conciliação,
fila de documentos e agenda mostram as 5 personas fictícias. Quem opera vê duas respostas
diferentes para "quem são nossos clientes". E13-S08 documentou 6 dessas como followup — as outras
duas (`PropostaDocumentoPage`, `OperacaoPage`) não estavam na lista.

**Consequência para o plano:** cada uma das tasks 2 a 5 é *adapter + hooks + telas na mesma
entrega*. Migrar o adapter sem as telas é pior que não migrar — troca "tudo mock" por "metade
cada", que é mais difícil de diagnosticar. A ordem correta por contexto:

1. hooks em `application/hooks.ts` no padrão de E13-S08 (`useXReal`, fetch-on-mount + `refetch`)
2. **todas** as telas daquele contexto trocam `useMockDb` pelos hooks
3. só então o `di.ts` aponta para o adapter real

### Tasks 2 a 8 estão obsoletas — ver a revisão do `design.md`

Elas assumiam "um contexto por vez". A medição de 2026-08-31 mostrou que (a) cinco entidades
usadas pelo admin não têm tabela nenhuma e (b) as telas cruzam contexto — `AdminDashboardPage` lê
sete entidades. A decomposição correta é por **onda**, e está no `design.md`.

**A onda 0 vira story própria (`E13-S10`), e bloqueia todo o resto:** `crm.propostas`,
`configuracoes.integracoes`, `configuracoes.contas_agenda`, `configuracoes.contas_canal`,
`configuracoes.equipe`. Sem elas o AC-3 desta story é inalcançável — `ConfiguracoesPage` sozinha
depende de quatro.

### Plano antigo, mantido só como registro

A parte de frontend não foi feita, e não por falta de tempo: o `design.md` desta story já dizia
"uma story-filha por contexto, como foi de E13-S01 a S05". Cada uma delas precisa do ciclo que a
sessão anterior usou — migrar adapter, auditar hook após early return tela a tela, e **verificar
ao vivo no browser com `VITE_DEMO_MODE=false`**. Sem esse último passo o resultado seria código no
repositório sem prova de que funciona, que é exatamente o que E00-S06 existe para impedir.

Ordem que continua valendo: adapter de lead → `jornada` → `documentos` → `pagamentos` →
`comunicacao` → store fora do ar → deletar `MAPA_ID_REAL_PARA_MOCK` → e2e de isolamento.
