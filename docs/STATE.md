---
name: STATE
description: Estado volátil do trabalho. Atualizar ao pausar/retomar (use /handoff).
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

Sessão atual:
- **Data:** 2026-08-19
- **Owner:** Claude (execução autônoma solicitada pelo usuário)
- **Rodada 1 (E00–E05, 25 stories):** 🟩 concluída e implementada
- **Rodada 2 (E06–E11 + E10-S01, 22 stories):** 🟩 especificada e implementada
- **E04-S05 — Custo de IA nas conversas:** 🟩 especificada e implementada nesta sessão. Campo
  `Conversa.custoIA` (USD, mockado) exibido como badge no inbox admin (`/admin/comunicacao`),
  na lista e no cabeçalho da conversa aberta, só quando `atendidoPorIA`. Ver
  `specs/E04-S05-custo-ia-conversas/spec.md`.
- **E04-S06 — Canal Instagram / Meta:** 🟩 especificada e implementada nesta sessão. Instagram
  Direct (Meta Graph API) vira canal de fato: `CanalComunicacao` ganha `"instagram"`, formulário
  de credenciais da Meta em `/admin/configuracoes` (App ID, App Secret, Access Token, Webhook
  Verify Token, Instagram Business Account ID), seletor de canais no agente de IA em
  `/admin/comunicacao` (aba Agente IA — fechou gap pré-existente sem UI), badge de canal por
  conversa no inbox, e conversa de exemplo atendida por IA vinda do Instagram. Ver
  `specs/E04-S06-canal-instagram-meta/spec.md`.
- **E03-S06 — Documento de proposta:** 🟩 especificada e implementada nesta sessão. `Proposta`
  ganha `validoAte` e `itensEscopo[]`; nova rota `/admin/propostas/:id`
  (`PropostaDocumentoPage.tsx`) renderiza a proposta como documento estilo papel A4, com logo
  real da Akros, paleta navy/gold/cream, e botão "Imprimir / Salvar PDF" (`window.print()`);
  `AdminLayout` ganhou `print:hidden`/`print:p-0` na sidebar/topbar/main pra impressão sair limpa
  em qualquer tela admin. Ver `specs/E03-S06-documento-proposta/spec.md`.
- **Guia de mensagem por tipo de visto (site/Contatos):** trivial, sem spec formal. `LeadForm.tsx`
  mostra um `hint` (dica) sob o campo "Mensagem (opcional)" conforme o tipo de visto escolhido,
  pt-BR/en, ainda opcional — não bloqueia o envio.
- **E04-S08 — Transcrição configurável:** 🟩 especificada e implementada nesta sessão. Fireflies e
  Microsoft Teams viram integrações reais no catálogo de `/admin/configuracoes` (categoria
  `transcricao`); `/admin/agenda` só oferece "Ver transcrição" quando o provedor daquela
  transcrição está ativo; badge do modal deixou de ser hardcoded "Fireflies" e passou a refletir
  `Transcricao.provedor`. Ver `specs/E04-S08-transcricao-configuravel/spec.md`.
- **E04-S07 — Tool de agenda do agente:** 🟩 especificada e implementada nesta sessão.
  **Decisão de produto sinalizada e registrada em ADR-0007** (não confirmada com a Akros): o
  agente de IA agora pode marcar reunião direto na conversa, sem aprovação humana por reunião —
  exceção escopada ao princípio de humano no loop (ADR-0005), condicionada a duas autorizações
  humanas explícitas (conectar conta em `/admin/configuracoes` + ativar a tool no agente em
  `/admin/comunicacao` → Agente IA). O gate humano de E11-S04 (qualificação de lead) **não foi
  alterado** — caminho separado. `ContaAgendaConectada` (Google/Microsoft/Calendly, múltiplas
  contas por provedor) + `RegraAtendimentoIA.ferramentaAgendamento` + `Reuniao.criadaPor`.
  Conversa de exemplo com diálogo completo de agendamento em `/admin/comunicacao` (Camila Duarte)
  e reunião correspondente rastreável em `/admin/agenda` (badge "Agendado pelo agente"). Ver
  `docs/adr/0007-agente-agenda-reuniao-sem-gate.md`,
  `specs/E04-S07-agenda-tool-agente/{design,spec}.md`.
- **E04-S09/S10/S11 — Agente reformulado:** 🟩 especificadas e implementadas nesta sessão, 3
  stories em sequência:
  - **S09:** removidos `SkillAgente`/`ConectorMCP` do domínio e da UI (Agente IA). A "Alma do
    agente" absorve o papel de prompt de instruções (inclusive quando consultar cada base de
    conhecimento). Novo `CorrecaoAgente[]` (texto + data) — card "Correções" pra registrar
    comportamento a não repetir. `janelasAtendimento` ganhou UI (nunca tinha tido).
  - **S10:** `baseConhecimento` deixou de ser embutido por agente — vira catálogo compartilhado
    (`basesConhecimento`, nova aba "Base de conhecimento" em `/admin/comunicacao`); cada agente
    referencia por `baseConhecimentoIds: string[]`.
  - **S11:** `RegraAtendimentoIA.canais` (tipo fixo) virou `contasCanalIds: string[]`, referenciando
    `ContaCanalConectada` — catálogo dinâmico em `/admin/configuracoes` (nova seção "Contas de
    canal conectadas"), várias contas por provedor (WhatsApp/Instagram), como já era possível com
    calendário (E04-S07) e e-mail.
  Ver `specs/E04-S09-agente-simplificado/spec.md`,
  `specs/E04-S10-base-conhecimento-compartilhada/spec.md`,
  `specs/E04-S11-multiconta-canal/spec.md`.
- **Stories em progresso:** Nenhuma

## Última entrega desta sessão

1. **Fotos reais da equipe** e **redesign da Homepage/Quem Somos** (E01-S01/S02) — ver histórico
   de commits para o detalhe; não repetido aqui para não duplicar.
2. **Rodada 2 completa: especificada E implementada.** A partir da mensagem do Bruno Luz
   (06/08/2026), foram geradas e implementadas 22 stories novas (E06–E11, incluindo E10-S01):
   - **E06 — Programas de visto**: `Programa` como dado versionado (ADR-0004). Novo bounded
     context `features/programas/`. Dois programas no catálogo: `eb2-niw` (migrado de
     `jornada-template.ts`, removido) e `religioso-r-eb4` (novo, prova de escalabilidade).
     Conversão de lead escolhe o programa; catálogo somente-leitura em `/admin/programas`.
   - **E07 — IA de análise de documentos** (ADR-0005): `AnalisadorDocumentoPort` +
     `MockAnalisadorDocumento` determinístico. Parecer em `Documento.analise`, nunca muda
     `Documento.status` — só decisão humana muda (`/admin/documentos`, fila priorizada por
     espera). Regras específicas para o caso citado pela Akros (carta de experiência × carta de
     recomendação × carteira de trabalho).
   - **E08 — Comunicação unificada** (ADR-0006): `EventoComunicacao` append-only substitui
     `Interacao` (removida do código). Timeline funde eventos de sistema/chat/e-mail/reunião com
     as mensagens do WhatsApp (`useTimeline`). Chat do portal em `/portal/mensagens`.
   - **E09 — Ritmo e responsabilidade**: `Etapa.responsavel` (cliente/Akros/terceiro/USCIS),
     previsão de conclusão por fórmula aberta (`calcularPrevisao`), painel de gargalos + central
     de alertas em `/admin/operacao`.
   - **E10-S01 — Pagamento por transferência**: sem gateway (decisão do cliente); dados de
     recebimento **fictícios** (`mocks/dados-recebimento.ts`), upload de comprovante pelo
     cliente, conciliação manual em `/admin/pagamentos`.
   - **E11 — Pré-venda**: perfil rico do lead, qualificação conversacional com roteiro
     **fictício/mockado** (`mocks/qualificacao.ts` — não é o formulário real da Akros), cadência
     de follow-up de 4 toques, gate humano antes de agendar (`/admin/aprovacoes`), base de
     reativação (`/admin/reativacao`).
3. **3 ADRs novos** (0004, 0005, 0006) e **2 design docs** (E06-S01, E07-S01) documentando as
   decisões arquiteturais acima.
4. **25 testes novos** (16 de invariante em `mocks/rodada2-actions.test.ts` + 9 smoke de render).
   Total: **78 testes**, todos verdes.
5. Duas `SPEC_DEVIATION` novas registradas no código (conteúdo de programa em PT-BR literal, não
   i18n; `documentos/application` conhece `programas` — mesma exceção já documentada para
   `jornada`→`programas`).

## Resumo de progresso

Protótipo visual da Akros Immigration Solutions **100% implementado** para as duas rodadas.

**As 3 frentes navegáveis em localhost, agora com ~15 telas novas:**
- **Site institucional** (`/`) — 7 páginas, redesign de Home/Quem Somos com fotos reais.
- **Portal do cliente** (`/portal`) — dashboard (agora com "de quem é a bola" + previsão) +
  jornada (com badge de responsável por etapa) + documentos (com parecer de IA) + assinatura +
  pagamentos (transferência) + **mensagens** (chat do portal, novo) + agenda + perfil.
- **Painel admin** (`/admin`) — kanban (com escolha de programa na conversão + abas de
  perfil/qualificação/timeline no lead) + **aprovações** (gate, novo) + clientes 360 +
  **revisão de documentos** (fila de IA, novo) + propostas + **conciliação** (pagamentos, novo) +
  **programas** (catálogo, novo) + **operação** (gargalos/alertas, novo) + **reativação** (novo) +
  comunicação + agenda.

**Impersonação/demo:** seletor de persona (**5 clientes** agora — incluindo a Igreja Vida Nova no
programa religioso), alternador Cliente↔Admin, 6 cenários pré-configurados, botão resetar demo.

## Arquitetura implementada

- Portas/adapters (ADR-0002): ~17 portas com Mock*Repository, container de DI (`app/di.ts`)
  ampliado com `programas`, `timeline` e `analiseDocumento`.
- Estado mock: Zustand (`useMockDb`) — cresceu de ~15 para ~30 actions nesta sessão.
- i18n completo (react-i18next): pt-BR + EN, zero texto de UI hardcoded (conteúdo de
  programa/jornada é exceção documentada, ver SPEC_DEVIATION).
- Design system: 16 componentes (`shared/ui/`), reaproveitados sem mudança nas telas novas.
- **78 testes vitest**: regras de negócio centrais + as invariantes da rodada 2 (IA nunca muda
  status, cadência para na resposta, gate bloqueia agendamento, versão do programa congela,
  timeline unificada, previsão com dados insuficientes cai no padrão).

## Arquitetura decidida e implementada na rodada 2

- **ADR-0004** — Programa de visto como dado versionado. `criarFasesTemplate()` removido; a
  jornada é instanciada de um `Programa` (`instanciarJornada`) e congela a versão usada.
- **ADR-0005** — Análise de documento por IA atrás de `AnalisadorDocumentoPort`, parecer em campo
  separado do status. A IA nunca aprova; o cliente sempre pode enviar assim mesmo.
- **ADR-0006** — `EventoComunicacao` append-only unifica WhatsApp, e-mail, chat do portal,
  reunião e evento de sistema numa timeline só, e absorve `Interacao` (removida).

## Gates (verificados nesta sessão)

```
Typecheck:  ✅ zero erros
Build:      ✅ sucesso (~690kB, aviso de bundle size não-bloqueante)
Lint:       ✅ zero erros (biome)
Arch check: ✅ zero violações (dependency-cruiser, 151 módulos, 444 dependências)
Esteira:    ✅ 108 docs OK
Testes:     ✅ 78/78 passando
```

## Pendências conhecidas

1. **Peer review visual em browser real não realizado** — sem ferramenta de browser no ambiente
   desta sessão. As ~15 telas novas da rodada 2 nunca passaram por olho humano. **Recomendado
   antes de qualquer demo ao vivo.**
2. **Conteúdo/copy não validado pela Akros** — textos, prazos e a proposta de fluxo religioso são
   estimativas razoáveis, não confirmadas pelo cliente (ver as 8 perguntas em aberto no ROADMAP).
3. **Dados fictícios que precisam virar reais antes de produção**: dados bancários
   (`mocks/dados-recebimento.ts`), roteiro de qualificação (`mocks/qualificacao.ts`), limiares de
   alerta e intervalos de cadência.
4. **Bundle size** — build gera ~690kB (aviso do Vite, não-bloqueante). Cresceu com a rodada 2;
   code-splitting por rota fica mais importante antes de produção.

## Próximos passos

1. Peer review visual em browser das ~15 telas novas — prioridade máxima antes de demo ao vivo.
2. Levar as 8 perguntas em aberto (`docs/epics/ROADMAP.md`) para Bruno/Natalia/Dra. Denise.
3. Validar conteúdo com a Akros antes de qualquer apresentação externa.
4. Fase futura: migrar mocks → Supabase seguindo ADR-0002, incluindo trocar
   `MockAnalisadorDocumento` por um adapter de LLM real (ver implicações de PII na ADR-0005).

## Notas/contexto de troca

- Fonte da jornada EB-2 NIW: `manual-cliente-eb2-niw-utf8-links-corrigidos-v2.html`. Fonte do
  programa religioso: proposta própria, sem documento-fonte — precisa de validação jurídica.
- Identidade: `Akros identidade/` (logos). Paleta navy `#0D2240` / gold `#C6A254` / cream `#F5F4F0`.
- Todas as specs em `specs/E0N-S0N-*/spec.md`. Rodada 2 não tem pasta `evidence/` (checklist
  impeccable) — reaproveitou os componentes de design system existentes, sem tela nova de
  primeiro princípio; recomenda-se o peer review da pendência 1 acima cobrir isso.
- `pnpm exec biome` trava neste ambiente sandboxed (thread nativa Rust incompatível com o
  wrapper de spawn do pnpm) — lint validado chamando o binário `cli-darwin-arm64/biome`
  diretamente. Não afeta `git commit`/`git push` (lefthook invoca de forma diferente e funciona).

---

## Handoff — 2026-08-28 (sessão de revisão pré-produção)

**Owner:** Lucas Azevedo. **Nada de código foi alterado nesta sessão** — só revisão e decisão.

### O que aconteceu
Revisão adversarial do monorepo inteiro, com foco em ida para produção: isolamento de dados,
validação na borda, lazy loading, estratégia de teste e paridade de qualidade no backend.
4 bloqueadores P0 e 25 pontos catalogados. Três decisões de arquitetura foram fechadas e viraram ADR.

### Decisões tomadas (leia antes de retomar)
- **ADR-0008 — sessão.** Access token só em memória (TTL 15 min); refresh token em cookie
  `HttpOnly; Secure; SameSite=Strict`, gravado e lido só por Edge Function
  (`sessao-login` / `sessao-refresh` / `sessao-logout`). Cookie precisa ser **first-party**:
  rewrite de proxy no Netlify em `/api/sessao/*`. Dados continuam indo direto ao PostgREST —
  só a sessão passa por função.
- **ADR-0009 — single-tenant.** Sem `org_id` em nenhuma tabela. Isolamento por papel
  (schema `portal` × `admin`) e por `cliente_id` vindo do claim do JWT. Fecha a pergunta
  aberta nº 7 do ROADMAP.
- **Ordem de execução:** Playwright **antes** do schema. A matriz de autorização é escrita
  primeiro e vira a especificação executável do isolamento.

### Bloqueadores P0 identificados
1. **Portas/adapters não são usadas.** `app/di.ts` só é importado por arquivos de teste; as 20
   páginas leem/escrevem direto `useMockDb`. Migrar mock→Supabase **não é** "trocar o adapter".
2. **Zero autenticação e zero guarda de rota.** Não existe spec de auth em `specs/`.
3. **Store global única** com dados de todos os clientes — induz ao vazamento entre clientes.
4. **Backend greenfield:** 0 migrations, 0 Edge Functions declaradas.

### Plano acordado (7 stories, nesta ordem)
`E12-S01` contrato de portas + cliente de dados → `E12-S02` auth/RBAC + funções de sessão →
`E12-S03` Playwright + matriz de autorização → `E13` schema/RLS/audit/LGPD →
`E14` cofre de credenciais + Edge Functions → `E15` lazy loading + resiliência → `E16` operação.

**E13 só é considerado pronto quando as linhas de dados da matriz de autorização ficam verdes** —
não quando as tabelas sobem.

### Estado do repositório ao pausar
- Trabalho de frontend em andamento **pelo Codex** no mesmo worktree. O push do worktree completo
  é do Lucas, ao fim daquele trabalho.
- Não commitado nesta sessão, mas criado: `docs/adr/0008-sessao-token-memoria-refresh-cookie.md`,
  `docs/adr/0009-single-tenant-sem-org-id.md`, e a marcação da pergunta nº 7 do ROADMAP como decidida.

### Correções de esteira feitas nesta sessão

**1. `audit:esteira` voltou ao verde (132 docs OK).** Tinha ficado vermelho com 40 problemas
depois que a skill *impeccable* foi instalada — os 35 arquivos de `reference/` e os `scripts/`
dela não seguem o frontmatter SDD, e o script varria tudo. A skill é **uso deliberado e fica
commitada**: qualquer pessoa ou agente que clone o repo precisa herdar as mesmas skills e o mesmo
padrão de desenvolvimento. Quem estava errado era o script. Em `scripts/audit-esteira.mjs`:
- Regra nova e geral: dentro de `.claude/skills/`, **só o `SKILL.md` é doc da esteira**.
  `reference/`, `scripts/` e exemplos são material interno da skill. Vale para as skills do
  projeto (todas têm só `SKILL.md`) e para qualquer skill de terceiro vendorizada depois.
- `apps/web/PRODUCT.md` entrou na lista de views geradas por ferramenta (marcador
  `impeccable:product-schema`), junto de `GEMINI.md` e `.github/copilot-instructions.md`.
- Bug corrigido: `IGNORE_DIRS.has(name)` casa por **nome de pasta**, então a entrada
  `".claude/skills/_disabled"` nunca casou com nada. Virou `IGNORE_PATHS`, checado por caminho
  relativo.

**2. Armadilha descoberta — `pnpm run ci:local` pode passar sem rodar nada.** O lefthook v2 filtra
os comandos de `pre-push` por arquivo empurrado; com a árvore só suja/untracked, os 12 comandos
saem como `skip: no matching push files` e o resumo fica verde em 0,15s. **Verde do `ci:local` sem
commit não significa nada.** Rodar os gates direto (`pnpm run typecheck`, `pnpm test`,
`pnpm run arch:check`, `pnpm run audit:esteira`, `pnpm run build`) ou commitar antes.

### Estado real dos gates em 28/08 (rodados um a um)
```
Typecheck:  ✅ zero erros
Testes:     ✅ 82/82 (vitest)
Arch check: ✅ zero violações (162 módulos, 488 dependências)
Esteira:    ✅ 132 docs OK
Mermaid:    ✅ blocos OK
Migrations: ✅ 0 migration(s) — nenhuma existe ainda
Edge fn:    ✅ 0 função(ões) declarada(s) — só template
Build:      ✅ 842 kB num chunk (aviso de bundle, não-bloqueante — ver E15)
Lint:       ⚠️ 4 erros de formatação/organizeImports em PerfilPage.tsx, DashboardPage.tsx
            e ProgramasPage.tsx — arquivos em edição pelo Codex. O hook de `pre-commit`
            roda `biome check --write` nos staged e corrige sozinho no commit.
Gitleaks:   ⏭️ não instalado localmente (best-effort local; o gate bloqueante é o da CI)
```

### Próximo passo
Retomar por **E12-S01** (contrato de portas). Auth, banco e Edge Functions vêm em seguida —
já com ADR-0008 e ADR-0009 como contrato.

---

## Handoff — 2026-08-28 (E12-S01 e E12-S02 implementados)

**Owner:** Lucas Azevedo (execução por Claude nesta sessão).

### E12-S01 — Contrato de portas em uso (🟨, falta peer review visual)
Premissa do handoff anterior ("container só usado em teste") estava desatualizada — 15 arquivos de
produção já usavam `container`. O gap real era 18 mutações órfãs (ação pega direto de `useMockDb`
em vez de ir pelo `container`) em 4 arquivos: `ComunicacaoPage.tsx`, `ProgramasPage.tsx`,
`ConfiguracoesPage.tsx` (contexto sem porta nenhuma — criada do zero) e `Cliente360.tsx`.
Corrigido; gates verdes (typecheck, 82/82 testes, build, lint). Ver
`specs/E12-S01-contrato-portas/{spec,tasks}.md` para a auditoria completa e o gate por nome de
ação (não por nome de arquivo — assim não escapa de novo).
**Pendente:** peer review visual das 4 telas tocadas em `pnpm dev` — sem ferramenta de browser
nesta sessão.

### E12-S02 — Autenticação e RBAC (🟨, falta gate manual com browser)
Projeto Supabase (`mhxopadkizktsenohnbm`, `sa-east-1`) já existia. Implementado conforme
ADR-0008/0009:
- **3 Edge Functions** (`sessao-login`, `sessao-refresh`, `sessao-logout`) — deployadas e
  testadas via curl ponta a ponta (login, CSRF gate, refresh/rotação, logout revoga e limpa
  cookie). Deployadas com `--no-verify-jwt` (não há JWT de entrada antes do login existir).
  Secret `CORS_ALLOWED_ORIGINS=http://localhost:5173` setado no projeto — **falta adicionar o
  domínio de produção quando o site for linkado ao Netlify**.
- **Proxy first-party**: `netlify.toml` (produção) e `apps/web/vite.config.ts` (dev, espelha o
  mesmo comportamento) redirecionam `/api/sessao/*` pras functions.
- **Novo bounded context** `features/sessao/` (domain/application/infrastructure/interfaces) —
  ver `specs/E12-S02-auth-rbac/domain.md`. Não entra no `container` de `app/di.ts` (esse é
  especificamente a substituição mock→Supabase do dado de negócio; sessão é real desde o dia 1).
- **Guarda de rota**: `RequireRole` em `/admin` e `/portal`, só ativa quando `!isDemoMode` (flag
  que já existia desde E05-S01, em `shared/lib/env.ts` — não foi inventada agora).
  `isDemoMode = true` continua o padrão (demo ao vivo da Akros sem dependência de backend).
- **Ponte pro dado mockado (SPEC_DEVIATION)**: `useClienteAtivo()` usa
  `sessao.usuario.clienteId` fora do modo demo — os dois usuários seed já têm `app_metadata`
  setado com esse claim (`cliente-carlos` pro cliente teste). Sem tabela `usuarios` real ainda —
  isso é E13.
- **2 usuários reais no Supabase Auth** (não hardcoded): `lm.azeved@gmail.com` (admin),
  `carlos.mendes@example.com` (cliente, mapeado à persona `cliente-carlos`). Senha combinada
  com o Lucas.
- Botão "Sair" adicionado em `AdminLayout`/`PortalLayout`, visível só fora do modo demo.

**Pendente:** gate manual do `spec.md` (login/guarda de rota/F5/logout num browser real) — a
mecânica de sessão foi validada via curl direto nas Edge Functions, mas o fluxo completo
front-end (`RequireRole`, `LoginPage`, `useBootstrapSessao`) não passou por navegador nesta
sessão. Rodar com `pnpm dev` (`.env.local` já tem `VITE_DEMO_MODE=false`).

### Credenciais e segredos desta sessão
`.env.local` (gitignored) tem: token de Management API do Supabase, `service_role` key,
`VITE_DEMO_MODE=false`. **Não commitados.** Token de Management API foi colado em texto puro pelo
usuário no chat desta sessão — usado como está (decisão do usuário), não rotacionado.

### Próximo passo
`E12-S03` — Playwright + matriz de autorização (depende de E12-S02, que está funcionalmente
pronto mas sem verificação visual). Antes disso, considerar rodar o gate manual de browser das
duas stories pendentes.

---
*Atualizar este arquivo ao pausar a sessão. Use `/handoff` para semiautomatizar.*
