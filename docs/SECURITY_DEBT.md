---
name: SECURITY_DEBT
description: Dívida de segurança aceita conscientemente. Toda exceção ao baseline/os-grade que não foi corrigida na hora vem pra cá — P0 bloqueia produção.
alwaysApply: false
---

# SECURITY_DEBT.md — Akros

Referenciado por `CLAUDE.md`, `Definition-of-Done.md`, `seguranca/baseline-minimo.md`,
`seguranca/os-grade.md`, ADR-0005, ADR-0007 e specs de E07/E11 — citado desde o início do projeto,
nunca criado até esta entrada (achado pelo gate de esteira em 30/08/2026, durante E13-S05).

Legenda: **P0** bloqueia produção · **P1** corrige antes de dado real de cliente · **P2** aceito
por tempo indeterminado, monitorar.

## P0 — bloqueia produção

### Frontend ainda não fala com o schema real (RLS só provado no banco)
`crm`/`jornada`/`documentos`/`pagamentos`/`agenda`/`programas`/`comunicacao` têm RLS real,
provado via PostgREST (E13-S01..S05) — mas a UI ainda lê 100% de `useMockDb` (E12-S01). O
isolamento por `cliente_id` só existe no banco; a aplicação em si não o exercita ainda.
**Fecha em:** E13-S08 (trocar `MockClienteRepository`/demais por adapter Supabase).

### Store global única carrega dado de todas as personas na memória do browser
Mesmo autenticado como um cliente só (E12-S02), `useMockDb` mantém as 5 personas mockadas
inteiras na memória do JS da aba — um `console.log(useMockDb.getState())` no DevTools expõe tudo.
**Aceitável hoje** porque o dado é 100% fictício (sem PII real). **Bloqueia** subir qualquer dado
real de cliente antes de existir filtragem de estado no frontend equivalente à RLS do banco.
**Fecha em:** E13-S08, junto da troca de adapter.

## P1 — corrigir antes de dado real de cliente

### Dados bancários fictícios (`pagamentos.dados_recebimento`)
Titular/banco/conta são **fictícios de propósito** (E10-S01, ROADMAP pergunta aberta nº 8).
Substituir pelos dados reais da Akros é decisão consciente, não técnica — feita quando a Akros
aprovar uso fora de demo.

### `crm.leads` não existe — eventos/threads de lead ficam sem dono
`comunicacao.eventos.cliente_id` e `email_threads.cliente_id` são nullable pra cobrir o caso de
lead ainda não convertido (E13-S05/design.md). Hoje isso só significa "invisível pra qualquer
cliente" (correto). Quando `crm.leads` existir, decidir se leads precisam de RLS própria (hoje
não logam, só staff acessa via admin).

### Retenção de dado de lead perdido (LGPD)
ROADMAP pergunta aberta nº 6: base legal e prazo de guarda pra lead descartado/inativo (E11-S02/
S05) não estão definidos. Bloqueia o schema `lgpd.*` (E13-S07) ficar completo — hoje não há nem
schema, quanto mais política de retenção.

### Timeout por inatividade
`seguranca/baseline-minimo.md` pede ~30min de timeout por inatividade. ADR-0008 cobre TTL do
access token (15min) e rotação do refresh — mas um usuário ativo continuamente nunca é
deslogado por inatividade pura (só fechar a aba encerra a sessão, por design do ADR-0008). Não
implementado; registrado como fora do ADR, decisão de produto separada se a Akros pedir.

## P2 — aceito, monitorar

### Credenciais coladas em texto puro no histórico desta sessão de chat
Um token de Management API do Supabase (`sbp_...`) e a senha dos usuários seed
(`lm.azeved@gmail.com`, `carlos.mendes@example.com`, `renata.alves@example.com`) foram colados em
texto puro pelo usuário durante a sessão de 28-30/08/2026. **Usados como estão, por decisão
consciente do usuário** (optou por não rotacionar quando perguntado). Nunca gravados em arquivo
versionado (ficam só em `.env.local`/`.env.test.local`, gitignored) — mas o histórico da
conversa em si contém os valores em claro. Se esse histórico for exposto, essas credenciais
devem ser tratadas como comprometidas.

### Migrations aplicadas direto em produção via `supabase db push` manual
Sem pipeline `.github/workflows/` neste repo ainda — `squawk`/`lint:migrations` rodam local/
best-effort (`lefthook.yml`), sem revisão de PR antes de cada `db push` real (E13-S01..S05 foram
aplicadas assim, sessão solo). Aceitável em fase de prototipagem com um único operador; deve virar
CI real (job dedicado, aprovação antes de aplicar) antes de mais de uma pessoa mexer em schema.

### RLS sem teste automatizado no CI
Verificação de RLS de E13-S01..S05 foi manual (curl direto no PostgREST, documentada em cada
`design.md`). `apps/web/e2e/auth-matrix.spec.ts` (E12-S03) cobre isolamento por papel/rota e um
caso de isolamento por `cliente_id` (AC-6) — não é cobertura abrangente de toda policy de todo
schema. Caminho natural é pgTAP (citado em `lefthook.yml`, depende de Docker — não instalado
neste ambiente) rodando como job de CI dedicado.

## Referências
- `seguranca/baseline-minimo.md`, `seguranca/os-grade.md` — checklists que geraram estas entradas.
- `docs/epics/ROADMAP.md` — perguntas abertas de produto (nº 6, 8) espelhadas aqui do ângulo de
  segurança/conformidade.
- ADR-0008 (sessão), ADR-0009 (single-tenant), ADR-0010 (schema) — decisões que este arquivo não
  reabre, só documenta o que ficou de fora delas conscientemente.
