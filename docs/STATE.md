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

### Peer review em browser real — concluído nesta sessão (28/08, tarde)
Extensão Claude in Chrome conectada (problema inicial era instalação/restart pendente do lado do
usuário). Bateria completa rodada num Chrome de verdade contra `pnpm dev`:

- **E12-S02 (AC-1 a AC-7):** todos confirmados na UI — guarda de rota redireciona pro `/login`
  sem sessão; login admin/cliente funcionam; F5 rehidrata via `sessao-refresh`; logout revoga no
  Supabase e limpa cookie (F5 depois não rehidrata mais); credencial errada mostra erro genérico;
  cliente tentando `/admin` é barrado e devolvido ao `/portal`; `useClienteAtivo()` resolve a
  persona certa (`cliente-carlos`) a partir do `clienteId` da sessão.
- **E12-S01 (as 18 mutações):** cada uma exercitada de verdade na UI — enviar/transcrever
  mensagem, responder e-mail, salvar agente, adicionar base de conhecimento, duplicar/salvar
  programa, conectar/desconectar conta de agenda e de canal (inclusive o fluxo com
  compartilhamento que usava o hack `.at(-1)` removido), atualizar integração, salvar pasta do
  cliente, cadastrar pagamento.

**2 bugs de crash pré-existentes achados e corrigidos** (não causados por E12, mas travavam a
aba "Agente IA" de `/admin/comunicacao` e potencialmente o modal de conversão de lead em
`KanbanPage.tsx`): seletor Zustand com `.filter()`/`.map()` inline devolve array novo a cada
chamada, o que quebra `useSyncExternalStore` (loop infinito → "Maximum update depth exceeded").
Corrigido com `useMemo` nos dois pontos. Isso é exatamente a classe de bug que a pendência
"peer review nunca feito" (arrastada desde a rodada 2) existia pra pegar.

**Armadilha descoberta e corrigida:** `apps/web/.env.local` com `VITE_DEMO_MODE=false` (criado
pra eu testar login real) vazava pro Vitest também (mesma regra de carregamento de env do Vite),
quebrando os smoke tests de modo demo. Corrigido com `apps/web/.env.test.local` forçando
`VITE_DEMO_MODE=true` — `.env.test.local` tem precedência sobre `.env.local` no modo `test`, sem
afetar o `pnpm dev`. Vale para qualquer dev que ligar esse flag localmente depois.

Gates finais: typecheck ✅, 82/82 testes ✅, build ✅.

### Próximo passo
`E12-S03` — Playwright + matriz de autorização. E12-S01 e E12-S02 estão 🟩, incluindo peer review
visual — nenhuma pendência de verificação em aberto pras duas.

---

## Handoff — 2026-08-30 (E12-S03 implementado, épico E12 fecha 🟩)

**Owner:** Lucas Azevedo (execução autônoma solicitada — "bateria de implementação").

### E12-S03 — Playwright + matriz de autorização (🟩)
`apps/web/e2e/auth-matrix.spec.ts` — 5 specs verdes (AC-1 a AC-5 do `spec.md`): guarda de rota sem
sessão, admin não acessa `/portal`, cliente não acessa `/admin` e vê a persona certa, senha errada
não autentica, logout revoga no servidor (F5 depois não rehidrata). 1 `test.fixme` documentado
(AC-6, isolamento por `cliente_id` — só fecha com E13: precisa de RLS real + um segundo usuário
`cliente` seed, que é decisão de produto fora de escopo até agora).

Credenciais de teste em `apps/web/.env.test.local` (gitignored, nunca em código) — lidas por um
parser mínimo em `playwright.config.ts` (sem depender de `dotenv`). `webServer` reaproveita
`pnpm dev` já rodando (`reuseExistingServer: true`); fora do `pre-push`/CI — mesma categoria de
`db-tests` com Docker, depende de rede externa ao commit.

**2 gates pegaram problemas reais introduzidos nas stories anteriores, corrigidos nesta sessão:**
1. `pnpm run arch:check` — `features/sessao/application/hooks.ts` importava
   `infrastructure/EdgeFunctionSessaoService.ts` direto, violando
   `interfaces → application → domain ← infrastructure`. Corrigido registrando `sessao` no
   `container` de `app/di.ts` (não por causa do ADR-0002 — sessão não tem variante mock — mas
   porque a regra de dependência vale igual pra qualquer contexto).
2. `pnpm run audit:esteira` — os 9 docs de E12-S01/S02/S03 foram commitados **sem rodar
   `audit:esteira`** antes, faltando `alwaysApply: false` no frontmatter. Corrigido em todos.
   **Lição:** rodar a esteira completa (`pnpm run ci:local` ou os scripts um a um) antes de
   commitar specs novas, não só typecheck/test/build.

Gates finais: typecheck ✅, 82/82 testes ✅, build ✅, arch:check ✅, esteira ✅ (141 docs),
eval:spec ✅, mermaid ✅, Playwright 5/5 ✅ (+1 fixme).

### Épico E12 (fundação de auth) — fechado
`E12-S01` (contrato de portas) → `E12-S02` (auth real) → `E12-S03` (matriz executável). Todos 🟩.
Auth real funcionando ponta a ponta, validado em browser real e via Playwright.

### E13-S01 implementado (🟩) — primeira tabela de negócio real
`crm.clientes` no ar em `mhxopadkizktsenohnbm`, RLS provado **de verdade** via PostgREST (não
simulado): logado como Carlos (cliente) só a própria linha volta; logado como Lucas (admin) as
duas voltam; `INSERT`/`DELETE` sem GRANT pra `authenticated` — 403 confirmado nos dois. Fecha o
`test.fixme` do E12-S03 (AC-6) com um teste real (Playwright bate direto no PostgREST).

**ADR-0010 novo** (schema relacional + JSONB pra blob variável; migrations em
`supabase/migrations/`, não `db/migrations/` — que nunca existiu de fato, `db/README.md` corrigido
com nota). Segundo usuário `cliente` seed criado (`renata.alves@example.com`) — ampliação
consciente do escopo de E12-S02 ("só 2 usuários"), registrada porque sem um segundo cliente real
não dava pra provar isolamento de linha nenhum.

**4 gaps reais achados rodando a bateria completa de gates** (nenhum tinha sido rodado nas stories
anteriores até o momento em que "rodar tudo antes de commitar" virou hábito nesta sessão):
1. PostgREST só expõe `public`/`graphql_public` por padrão — schema `crm` precisou ser adicionado
   via Management API (`PATCH /v1/projects/{ref}/postgrest`, `db_schema`).
2. `service_role` não tem GRANT automático em schema criado dinamicamente (só em `public`, de
   fábrica) — precisou de migration própria (`0002`) com `GRANT ... TO service_role`.
3. `supabase/config.toml` **não existia no repo** — as 3 funções de sessão do E12-S02 nunca
   tinham sido declaradas nele; `check-edge-functions.mjs` (gate que existe desde E00-S11
   especificamente pra isso) nunca tinha rodado. Gerado via `supabase init` + declaradas as 3
   funções com `verify_jwt = false`.
4. `.impeccable/hook.cache.json` (gerado pela skill impeccable a cada sessão) não estava no
   `.gitignore` nem no `files.ignore` do `biome.json` — `biome check .` (gate real do pre-push)
   quebrava pra qualquer um que tivesse essa skill ativa. Corrigido nos dois lugares.

**Lição registrada duas vezes agora (E12-S03 e E13-S01): rodar a bateria completa de gates
(`arch:check`, `audit:esteira`, `eval:spec`, `lint:migrations`, `check-edge-functions`, `mermaid`,
`biome check .` — não só `typecheck`/`test`/`build`) antes de considerar uma story pronta, mesmo
sob autonomia. Cada vez que isso não aconteceu, dívida real ficou pra trás sem ninguém notar.**

Gates finais: os 10 acima + Playwright (6/6, zero fixme).

### E13-S02 implementado (🟩) — schema `jornada` normalizado
3 tabelas (`jornadas`/`fases`/`etapas`, FK em cascata) — diferente de `crm.clientes`,
`fases`/`etapas` viraram tabela própria (não JSONB) porque E09-S03/S04 (painel de gargalos,
alertas) consultam etapa **através de clientes diferentes**, exatamente o critério do ADR-0010
pra "vira coluna/tabela". Helper `crm.meu_cliente_id()` criado (sem `SECURITY DEFINER` — roda com
o privilégio de quem chama, a RLS de `crm.clientes` já decide o que ele enxerga) — reaproveitado
daqui pra frente em vez de repetir a sub-query em cada policy nova.

Gaps do E13-S01 já conhecidos, aplicados de forma preventiva desta vez (sem redescobrir): schema
`jornada` adicionado ao `db_schema` da Data API antes de tentar seed; `GRANT ... TO service_role`
numa migration própria (`0004`) desde o início, sem precisar de tentativa-e-erro.

RLS provado via PostgREST nas 3 tabelas com dados reais (jornada+fase+etapa seed pra Carlos e
Renata): cliente só vê a própria jornada/fases/etapas; admin vê as duas. Gates: os 10 de sempre,
todos verdes.

### E13-S03 implementado (🟩) — schema `documentos` + `pagamentos`
Réplica do padrão. `pagamentos.dados_recebimento` é o primeiro caso de tabela **sem** `cliente_id`
— não é dado do cliente, é a instrução bancária fictícia da própria Akros (qualquer autenticado
lê, só admin escreve). GRANT a `service_role` já incluído na mesma migration desde o início (gap
de E13-S01 não repetido).

**Achado de verificação, registrado no `spec.md`:** ao testar que Carlos (cliente) não conseguia
`UPDATE` em `dados_recebimento`, o PostgREST devolveu `HTTP 204` (sucesso) mesmo com a policy
bloqueando — RLS filtra as linhas visíveis pro `UPDATE` e, se nenhuma bate, o `UPDATE` afeta 0
linhas e o PostgREST ainda responde 204. **204 sozinho não prova que a policy bloqueou** — só
prova reler a linha (com `service_role`) e confirmar que o valor não mudou. Releitura confirmou:
bloqueado de verdade. Vale pra qualquer teste de RLS negativo daqui pra frente (E13-S04+).

RLS provado via PostgREST: documentos/pagamentos isolados por cliente; `dados_recebimento` lido
pelos dois papéis, escrito só pelo admin (confirmado nas duas direções). Gates completos verdes.

### E13-S04 implementado (🟩) — schema `agenda` + `programas`
Réplica do padrão. `programas.programas` é o segundo caso "sem `cliente_id`" (catálogo global,
ADR-0004/ADR-0009) — mesma forma de `dados_recebimento`: todo autenticado lê, só admin escreve.
`fases_template`/`documentos_exigidos` em JSONB (template versionado congelado como bloco).
RLS provado nas duas direções via PostgREST, incluindo releitura via `service_role` confirmando
que o `UPDATE` de Carlos em `programas` não mudou a linha (mesma checagem do E13-S03).

`comunicacao` virou story própria (E13-S05) em vez de entrar aqui — 12 interfaces (conversas,
agente IA, LLM, base de conhecimento, e-mail), grande demais pra empilhar com agenda/programas
sem perder qualidade de revisão. ROADMAP renumerado: S05 comunicacao, S06 audit, S07 lgpd,
S08 troca de adapter no frontend.

### E13-S05 implementado (🟩) — schema `comunicacao`
5 tabelas. `conversas`/`email_threads` guardam mensagens como JSONB (lidas/escritas como bloco,
sem consulta cruzada entre threads — diferente de `jornada.etapas`). `eventos.cliente_id`
nullable cobre evento de lead ainda não convertido (fica invisível pra qualquer cliente, sem
`crm.leads` existir ainda — registrado em `docs/SECURITY_DEBT.md`). **Caso novo:**
`regras_atendimento_ia`/`fontes_conhecimento` são as primeiras tabelas **admin-only de
verdade** — zero policy de cliente (não "todo autenticado lê" como `programas`/
`dados_recebimento`); cliente autenticado recebe `[]`, confirmado via PostgREST real.

### Descoberta importante: outra sessão (Codex) editando o mesmo worktree, ao vivo
Durante os gates desta story, `scripts/audit-esteira.mjs`/`eval-spec-fidelity.mjs`,
`package.json` (raiz e `apps/web`), `turbo.json`, `Definition-of-Done.md`, `vite.config.ts` e
`pnpm-lock.yaml` mudaram **enquanto os comandos rodavam** — não fui eu. Also surgiram
`.github/` (pipeline de CI, inexistente até agora) e `.claude/skills/revisao-adversarial/`
(nova skill) como diretórios novos não rastreados. **Não toquei em nenhum desses arquivos** —
só criei `docs/SECURITY_DEBT.md` (arquivo novo, sem conflito) porque um gate meu
(`audit:esteira`) parou de passar por causa de uma checagem nova que a outra sessão adicionou
(13 docs do projeto citavam `docs/SECURITY_DEBT.md` e ele nunca tinha sido criado — dívida real,
não bug do gate). Deixe o resto do trabalho deles pra eles: não fiz `git add`/commit de nada
fora do que é meu desta story.

**Se retomar depois:** cheque o que a outra sessão comitou antes de continuar E13 — pode ter
mudado convenção de nome de pasta de spec (`isSpecDir` em `scripts/lib/spec-dirs.mjs` sugere
suporte a mais de um formato) ou adicionado CI real que os próximos `db push` deveriam respeitar.

### E13-S06 implementado (🟩) — `audit.*` append-only
17 triggers (`audit.registrar_mudanca()`, `SECURITY DEFINER` com `search_path` fixo — item
clássico de CVE de `SECURITY DEFINER` se esquecido) em todas as tabelas de negócio de
E13-S01..S05. **Append-only garantido por GRANT, não por RLS** — `service_role` tem `BYPASSRLS`
no Supabase, RLS literalmente não o alcança; a única forma real de bloquear `UPDATE`/`DELETE`
"pra todos, inclusive `service_role`" (como `seguranca/os-grade.md` pede) é nunca conceder esse
privilégio via `GRANT`. Provado ao vivo: `service_role` tentando `UPDATE`/`DELETE` em
`audit.eventos` recebe `42501` (erro de privilégio real, não filtro de RLS). `UPDATE` em
`crm.clientes` gerou evento com `dado_anterior`/`dado_novo` corretos.

Confirmado (novamente): usuário `cliente` autenticado consultando `audit.eventos` recebe `[]`
(admin-only, mesma forma de `regras_atendimento_ia`).

`README.md` está em reescrita grande pela outra sessão (referencia `docs/NOVO-PROJETO.md`, ainda
não criado — por isso `audit:esteira` mostra 1 problema agora; não é meu, não mexi) e apareceu
`specs/E16-S01-operacao-deploy/` também deles. Confirma que seguem trabalhando em paralelo,
como avisado.

### E13-S07 implementado (🟩) — schema `lgpd`
2 tabelas (`consentimentos`, `solicitacoes`), sem entidade prévia no mock — nascem direto do
checklist de `seguranca/os-grade.md`. Cliente cria/lê a própria solicitação de export/delete; só
admin processa (`UPDATE` de status). Cobertas pelo trigger de auditoria (E13-S06) — confirmado
via `audit.eventos` ganhando linha pras duas. RLS provado nas duas direções (releitura via
`service_role` confirmando bloqueio real de novo).

**Epico E13 fecha as 7 stories de schema** (S01-S07): 10 schemas reais no ar
(`crm`/`jornada`/`documentos`/`pagamentos`/`agenda`/`programas`/`comunicacao`/`audit`/`lgpd` +
`public`), todos com RLS provado ao vivo via PostgREST, todos cobertos por auditoria append-only.
Só falta **E13-S08** (trocar adapter mock→Supabase no frontend) pra fechar o épico inteiro —
essa é a story que faz a UI de fato usar tudo isso; até lá, dado de negócio continua 100% mockado
(ver `docs/SECURITY_DEBT.md`, primeiro P0).

### Próximo passo
`E13-S08` (trocar `MockClienteRepository` por adapter Supabase) — primeira prova de que o padrão
porta/adapter (ADR-0002) aguenta a troca sem reescrever UI. É a maior mudança de risco do épico
(toca ~8 telas que consomem `clientes` hoje) — recomendo tratar como story isolada, com peer
review em browser real antes de fechar (mesmo padrão de E12-S01/S02). — ver
`specs/E13-S01-schema-clientes-rls/design.md` pro mecanismo de RLS (papel via claim do JWT,
`cliente_id`/`auth_user_id` pra linha) e `docs/adr/0010-*.md` pra forma de tabela
(núcleo relacional + JSONB) e convenção de migration. Cada schema novo de bounded context precisa
repetir os passos "achados" nesta story: adicionar o schema em `db_schema` (Management API) e
`GRANT ... TO service_role` antes de tentar seed via `service_role`.
`E13-S07` (trocar `MockClienteRepository` por adapter Supabase real) é a story que finalmente
liga a UI no schema real — nenhum dos E13-S02..S06 muda o que a UI lê.

## Handoff — 2026-08-31 (E13-S08 implementado, épico E13 fecha 🟩)

**E13-S08 implementado (🟩)** — primeiro adapter Supabase real no frontend, escopo deliberadamente
estreito (ver `specs/E13-S08-adapter-supabase-clientes/design.md`):
- `@supabase/supabase-js` entra no bundle pela primeira vez (`shared/supabase/client.ts`),
  configurado por ADR-0008 (`persistSession: false`, `autoRefreshToken: false`, `accessToken`
  lendo o token em memória do `useSessaoStore` — nunca `localStorage`).
- `SupabaseClienteRepository` (crm/infrastructure) implementa `ClienteRepository`. Problema
  central: `crm.clientes.id` é uuid real, mas jornada/documentos/pagamentos/comunicacao (ainda
  mock, E13-S09+) só conhecem os ids string do mock (`"cliente-carlos"`). Resolvido com um mapa
  id-uuid↔id-mock **confinado dentro do adapter** (`MAPA_ID_REAL_PARA_MOCK`) — nenhum outro
  arquivo sabe que o uuid existe. `// SPEC_DEVIATION` documentada; mapa fecha (é deletado, não
  substituído) quando E13-S09 migrar aquelas features e todo mundo passar a usar uuid.
- `app/di.ts`: `clientes` agora é `isDemoMode ? MockClienteRepository : SupabaseClienteRepository`.
- Novos hooks em `crm/application/hooks.ts` (`useClienteReal`, `useClientesReais`) — mesma
  estratégia de todo o front: mock reativo (`useMockDb`) em modo demo, fetch-on-mount +
  `refetch()` manual fora dele (sem Realtime — decisão de escopo, operador único).
- Migrado: `useClienteAtivo()` (portal) e `Clientes360Page`/`Cliente360.tsx` (admin, lista +
  detalhe + `PastaDriveCard`). **Não migrado nesta story** (ficam mock mesmo fora do modo demo,
  followup E13-S09): `KanbanPage`, `ProgramasPage`, `ConciliacaoPage`, `FilaRevisaoPage`,
  `AdminAgendaPage`, `AdminDashboardPage` — dependem de `criarClienteAPartirDeLead`/`crm.leads`,
  que não existem no schema ainda.

**Bug real encontrado e corrigido durante a verificação** (não estava no design, achado só ao
rodar Playwright): `jornada/interfaces/DashboardPage.tsx` chamava `useEtapasPorResponsavel` e
`usePrevisao` **depois** de um `if (!cliente || !jornada) return`. Isso nunca quebrou em modo
mock porque `cliente` vinha sempre síncrono (array em memória, mesmo resultado em toda renderização
de uma instância montada). Com `useClienteAtivo()` agora podendo resolver `cliente` de forma
assíncrona (fetch real), a primeira renderização tem `cliente === undefined` (early return, 2
hooks a menos) e a renderização seguinte tem `cliente` definido (2 hooks a mais) — "Rendered more
hooks than during the previous render" no React, app inteiro quebrando com error boundary do
Router. Fix: mover as duas chamadas de hook pra antes do early return (ambas já toleram
`jornada: undefined`). Auditadas as outras 6 telas do portal que usam `useClienteAtivo`
(Jornada/Perfil/Pagamentos/Mensagens/Documentos/Agenda) — nenhuma tinha o mesmo padrão de risco.

**Verificado ao vivo** (browser real, `VITE_DEMO_MODE=false`, não só Playwright):
- Admin em `/admin/clientes` mostra exatamente as 2 linhas reais (Carlos, Renata), não as 5
  personas do mock.
- Abrir Carlos em `Cliente360` mostra dado real, incluindo `perfilImigratorio` (jsonb) com
  familiar cadastrado.
- Editar "Nome da pasta deste cliente" e salvar → `UPDATE` chegou em `crm.clientes` de verdade,
  confirmado por releitura via `service_role` (não só o 200/204 da UI) — depois revertido pro
  valor original.
- Login real como Carlos → `/portal` mostra "Olá, Carlos" com visto/case manager reais, **e**
  jornada/documentos/pagamentos/reuniões (ainda mock) casam certinho via o id ponte — prova que
  o `SPEC_DEVIATION` do mapa funciona sem vazar pro resto do app.
- `pnpm exec playwright test`: 6/6 (matriz de autorização completa, incluindo o AC-3 que exercita
  exatamente este fluxo).

**Epico E13 fecha inteiro** (S01-S08 🟩): 10 schemas reais no ar, RLS provado ao vivo em todos,
auditoria append-only, e agora a UI de fato lendo/escrevendo em pelo menos um bounded context real
— prova ponta a ponta que ADR-0002 (portas/adapters) aguenta a migração sem reescrever telas.
`docs/SECURITY_DEBT.md` P0 "frontend não usa schema real" fica parcialmente resolvido — só
`clientes` migrou; as demais 4+ features seguem mockadas até E13-S09.

### Próximo passo
`E13-S09` (fora desta sessão, não iniciada): migrar `jornada`/`documentos`/`pagamentos`/
`comunicacao` pra Supabase real, criar `crm.leads` + `criarClienteAPartirDeLead` real, e só então
migrar as 6 telas admin que ficaram mock nesta story. Quando isso fechar, o mapa
`MAPA_ID_REAL_PARA_MOCK` em `SupabaseClienteRepository` deve ser **deletado** (não substituído) —
todo mundo passa a falar uuid.

---
*Atualizar este arquivo ao pausar a sessão. Use `/handoff` para semiautomatizar.*
