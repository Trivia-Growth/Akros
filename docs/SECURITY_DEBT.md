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
**Fecha em:** `specs/E13-S09-adapters-supabase-restantes/` (E13-S08 migrou só `clientes`; os outros 4 contextos e a deleção do mapa de id estão especificados lá).

### Store global única carrega dado de todas as personas na memória do browser
Mesmo autenticado como um cliente só (E12-S02), `useMockDb` mantém as 5 personas mockadas
inteiras na memória do JS da aba — um `console.log(useMockDb.getState())` no DevTools expõe tudo.
**Aceitável hoje** porque o dado é 100% fictício (sem PII real). **Bloqueia** subir qualquer dado
real de cliente antes de existir filtragem de estado no frontend equivalente à RLS do banco.
**Fecha em:** `specs/E13-S09-adapters-supabase-restantes/` AC-3 — a store deixa de ser **carregada** fora do modo demo. Filtrar não resolve: quando o filtro roda, o dado já está na memória.

### Edge Functions sem rate limiting
`grep -rn "rate\|limit" supabase/functions/` não devolve nada. `sessao-login` aceita tentativa
ilimitada de senha: força bruta e enumeração de usuário sem custo. `seguranca/os-grade.md` pede
rate limit `fail-closed` em função pública e a `Definition-of-Done.md` §4 lista como obrigatório.
Superfície reduzida hoje (2 usuários seed), o que diminui o alcance, não o risco.
**Fecha em:** `specs/E14-S01-rate-limit-edge-functions/` — contador em `seguranca.rate_limit`, chave hasheada (IP é dado pessoal), `fail-closed` no caminho de sessão. Especificada em 2026-08-31.

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

### PII de documento de imigração enviada a LLM de terceiro
Ao trocar `MockAnalisadorDocumento` por um adapter de LLM real, passaporte, comprovante de
residência e carta de experiência saem do perímetro. O **ADR-0005** chama isso pelo nome —
"documento de imigração é PII pesado" — e aponta para este arquivo. Hoje o analisador é
determinístico e local; nada sai da máquina.
**Fecha em:** decisão registrada sobre provedor, retenção e opt-out de treino, antes do primeiro
adapter real. Trilha `ia/` cumprida (`@prompt-engineer` + `@security`).

### Credenciais de integração externa ainda sem cofre
Google Calendar, Microsoft Graph, Calendly, Meta Graph, OpenRouter, Whisper e Fireflies aparecem
como formulário de credencial em `/admin/configuracoes`. Todas mockadas — nenhum token real é
aceito ou persistido. Quando qualquer uma virar real, cai a exigência de
`seguranca/os-grade.md` §Credenciais externas: `refresh_token` em Supabase Vault, `access_token`
cifrado, nada exposto na UI. O **ADR-0007** já registrou essa preocupação ao aprovar a tool de
agenda do agente.
**Fecha em:** E14 (cofre de credenciais).

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
Pipeline `.github/workflows/ci.yml` criado em 30/08/2026 mas ainda **não ativo** (sem check
obrigatório em `main`) — até lá `squawk`/`lint:migrations` seguem rodando local/
best-effort (`lefthook.yml`), sem revisão de PR antes de cada `db push` real (E13-S01..S05 foram
aplicadas assim, sessão solo). Aceitável em fase de prototipagem com um único operador; deve virar
CI real (job dedicado, aprovação antes de aplicar) antes de mais de uma pessoa mexer em schema.

### RLS sem teste automatizado no CI
Verificação de RLS de E13-S01..S05 foi manual (curl direto no PostgREST, documentada em cada
`design.md`). `apps/web/e2e/auth-matrix.spec.ts` (E12-S03) cobre isolamento por papel/rota e um
caso de isolamento por `cliente_id` (AC-6) — não é cobertura abrangente de toda policy de todo
schema. Caminho natural é pgTAP (citado em `lefthook.yml`, depende de Docker — não instalado
neste ambiente) rodando como job de CI dedicado.

### `pnpm audit` não roda em nenhum gate
O script `audit:deps` existe no `package.json` e não é chamado por nada — nem pelo `lefthook.yml`,
nem pela CI. `seguranca/baseline-minimo.md` §7 pede `pnpm audit` quebrando o build em
vulnerabilidade alta. Árvore de dependências pequena e recente reduz a exposição, não a fecha.
**Fecha em:** job bloqueante no `.github/workflows/ci.yml`.

### Secret scanning é best-effort local
O `gitleaks` no `pre-push` tem `skip: "! command -v gitleaks"` — numa máquina sem o binário, o
gate passa sem varrer nada, silenciosamente. O job `gitleaks` de `.github/workflows/ci.yml` já
nasce sem `skip` e instala o binário, o que fecha o furo **na CI**; local continua best-effort por
design (não travar quem não tem a ferramenta).
**Fecha em:** já fechado do lado da CI quando o pipeline estiver ativo com o check obrigatório.

### Matriz de autorização (e2e) é gate local, não é enforçada no servidor
Decisão de 2026-08-31: o e2e roda **sempre** no `pre-push` (`lefthook.yml`, sem `skip`) e **nunca**
na CI. O motivo é custo e perímetro — na CI ele levaria minutos em todo push e faria cada PR
abrir sessão no Supabase de produção, além de exigir a senha dos usuários seed nos secrets do
repositório.

O risco que sobra: o gate depende da máquina de quem empurra. Quem tiver o hook desinstalado, ou
usar `--no-verify`, manda regressão de autorização para a `main` sem barreira. A branch protection
não tem como cobrir isso.
**Mitigação:** o `pre-push` falha alto se faltar credencial ou browser (sem `skip`), então o
caminho normal não tem como pular silenciosamente.
**Fecha em:** ambiente de teste separado do de produção — aí o e2e pode voltar para a CI sem os
dois problemas que o tiraram dela.

## Referências
- `seguranca/baseline-minimo.md`, `seguranca/os-grade.md` — checklists que geraram estas entradas.
- `docs/epics/ROADMAP.md` — perguntas abertas de produto (nº 6, 8) espelhadas aqui do ângulo de
  segurança/conformidade.
- ADR-0008 (sessão), ADR-0009 (single-tenant), ADR-0010 (schema) — decisões que este arquivo não
  reabre, só documenta o que ficou de fora delas conscientemente.
