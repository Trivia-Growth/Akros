---
name: ROADMAP
description: Épicos, stories e status. Atualizar ao concluir stories. Owner de story marca aqui antes de codar.
alwaysApply: false
---

# ROADMAP — Akros

Protótipo visual (dados mockados, sem login, localhost). **Sempre marque o owner da story antes de codar.**

Legenda status: ⬜ Não começado · 🟨 Em andamento · 🟩 Concluído · ⚠️ Bloqueado
Legenda spec: ✅ spec gerada · ⏳ spec pendente

**Status geral:** 🟩 rodada 1 (E00–E05, 25 stories) e 🟩 rodada 2 (E06–E11, 21 stories + E10-S01)
concluídas e implementadas — nasceu da mensagem do Bruno Luz de 06/08/2026. Ver `docs/STATE.md`.

---

## E00 — Fundação & Design System

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E00-S01 | Scaffold do app | Vite + React 19 + TS + Tailwind + React Router + estrutura de pastas DDD | @claude-code | 🟩 | ✅ |
| E00-S02 | Design System (impeccable) | Tokens Akros, tipografia, 14 componentes base | @claude-code | 🟩 | ✅ |
| E00-S03 | i18n (PT-BR + EN) | react-i18next, namespaces por feature, toggle de idioma | @claude-code | 🟩 | ✅ |
| E00-S04 | Camada de mock + DI | Portas/adapters, fixtures, 4 personas, container de injeção | @claude-code | 🟩 | ✅ |
| E00-S05 | Layout shells + routing | PublicLayout, PortalLayout, AdminLayout; rotas das 3 frentes | @claude-code | 🟩 | ✅ |

## E01 — Site Institucional (Marketing)

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E01-S01 | Homepage | Hero editorial com foto, stats, categorias, EB-2 NIW, metodologia, fundadora, depoimentos, CTA. **Redesenhada em 06/08/2026** | @claude-code | 🟩 | ✅ |
| E01-S02 | Quem Somos | 4 integrantes com fotos reais do site oficial, valores. **Ampliada em 06/08/2026** | @claude-code | 🟩 | ✅ |
| E01-S03 | Vistos | 12 tipos reais, filtro imigrante/não-imigrante | @claude-code | 🟩 | ✅ |
| E01-S04 | Metodologia | 7 passos visuais (análise → relocation) | @claude-code | 🟩 | ✅ |
| E01-S05 | Outros Serviços | 4 categorias de atendimento | @claude-code | 🟩 | ✅ |
| E01-S06 | Blog | Lista + post, 4 artigos reais | @claude-code | 🟩 | ✅ |
| E01-S07 | Contatos + Form de Lead | Formulário que gera Lead no kanban | @claude-code | 🟩 | ✅ |

## E02 — Portal do Cliente

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E02-S01 | Dashboard do cliente | Visão geral, progresso, próximas ações, atalhos | @claude-code | 🟩 | ✅ |
| E02-S02 | Jornada gamificada | Intro + 5 fases, unlock sequencial (core do produto) | @claude-code | 🟩 | ✅ |
| E02-S03 | Documentos & Checklists | Upload, regras de envio, status por fase | @claude-code | 🟩 | ✅ |
| E02-S04 | Assinatura digital | Assinar documentos via modal (nome + aceite) | @claude-code | 🟩 | ✅ |
| E02-S05 | Pagamentos | Status, resumo, formatação Intl por moeda | @claude-code | 🟩 | ✅ |
| E02-S06 | Agendamento de reuniões | Slots mock, próximas/passadas, transcrição | @claude-code | 🟩 | ✅ |
| E02-S07 | Perfil do cliente | Editar dados, idioma preferido | @claude-code | 🟩 | ✅ |
| E02-S08 | Perfil evolui: dados do processo + família | Aba "Dados do processo" (nome legal, nascimento, passaporte, estado civil, endereço) e aba "Família" (dependentes, incluir no processo) — oculta pra programas com sujeito organização. Cliente 360 (admin) ganha resumo somente-leitura. | @claude-code | 🟩 | ✅ |

## E03 — Painel Admin

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E03-S01 | Kanban de leads | 6 colunas, drag-drop + fallback acessível, conversão | @claude-code | 🟩 | ✅ |
| E03-S02 | Base de clientes + Visão 360 | Lista + 7 abas (dados/jornada/docs/pagtos/reuniões/conversas/histórico) | @claude-code | 🟩 | ✅ |
| E03-S03 | Gestão de jornada | Liberar próxima fase (gate central da gamificação) | @claude-code | 🟩 | ✅ |
| E03-S04 | Proposta comercial | Criar/enviar/aceitar, formatação de moeda | @claude-code | 🟩 | ✅ |
| E03-S05 | Dashboard admin | Funil, clientes por fase, saúde, receita (dataviz) | @claude-code | 🟩 | ✅ |
| E03-S06 | Documento de proposta | Visualização HTML formatada e imprimível da proposta, identidade Akros | @claude-code | 🟩 | ✅ |

## E04 — Integrações (mockadas, UI realista)

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E04-S01 | Inbox WhatsApp | 2 canais, threads, anexado à visão 360 | @claude-code | 🟩 | ✅ |
| E04-S02 | Agentes IA | Config + simulação de resposta com handoff | @claude-code | 🟩 | ✅ |
| E04-S03 | Agenda (Gmail/Outlook) | Status conexão mock, sincronização, todas reuniões | @claude-code | 🟩 | ✅ |
| E04-S04 | Transcrições (Fireflies) | Resumo + action items, evidência na visão 360 | @claude-code | 🟩 | ✅ |
| E04-S05 | Custo de IA nas conversas | Badge de custo (USD) por conversa atendida por IA, no inbox admin | @claude-code | 🟩 | ✅ |
| E04-S06 | Canal Instagram / Meta | Credenciais Meta Graph API + Instagram como canal do agente de IA | @claude-code | 🟩 | ✅ |
| E04-S07 | Tool de agenda do agente | Contas Google/Microsoft/Calendly + agente marca reunião direto (ADR-0007) | @claude-code | 🟩 | ✅ |
| E04-S08 | Transcrição configurável | Fireflies / Microsoft Teams como integração de transcrição em /admin/configuracoes | @claude-code | 🟩 | ✅ |
| E04-S09 | Agente simplificado | Remove Skills/MCPs, adiciona correções e UI de horários de atendimento | @claude-code | 🟩 | ✅ |
| E04-S10 | Base de conhecimento compartilhada | Catálogo único entre agentes, aba geral em /admin/comunicacao | @claude-code | 🟩 | ✅ |
| E04-S11 | Múltiplas contas por canal | WhatsApp/Instagram com várias contas, agente escolhe conta específica | @claude-code | 🟩 | ✅ |
| E04-S12 | E-mail unificado + armazenamento em nuvem | Conta Google/Microsoft ganha escopos (agenda/e-mail/arquivos); inbox de e-mail na timeline do cliente; caixa compartilhável entre usuários; documentos do cliente com selo de pasta OneDrive/Drive. Mockado — sem OAuth real, sem upload de binário. | @claude-code | 🟩 | ✅ |
| E04-S13 | Cliente 360: pasta por fase, fluxo de pagamento, conversas e leads com histórico | Pasta do Drive configurável por cliente com subpasta por fase; cadastro de itens do fluxo de pagamento; aba conversas mostra WhatsApp+e-mail; aba documentos mostra caminho salvo; detalhe do lead ganha Reuniões/Proposta; conversão lead→cliente reparenta timeline/conversas/e-mails/reuniões/proposta (fix de bug — ficavam órfãos). | @claude-code | 🟩 | ✅ |
| E04-S14 | Inbox WhatsApp com mídia rica | Imagem, áudio (gravar/ouvir/transcrever), anexo de arquivo e emoji no inbox admin — estrutura de mensageria. Aba E-mail virou estrutura de e-mail (De/Para/Assunto), não bolha de chat. | @claude-code | 🟩 | ✅ |
| E04-S15 | BYOK por agente (OpenRouter) + Whisper | Cada agente configura sua própria chave OpenRouter e escolhe o modelo (nunca compartilhado). Transcrição de áudio do inbox passa a exigir a integração Whisper ativa em Configurações. Fix: IDs de conta de agenda desatualizados após o rename do E04-S12 (agente Ana não achava mais suas contas). | @claude-code | 🟩 | ✅ |
| E04-S16 | Conversas: abrir thread completa + portal sem mensageria externa | Cliente 360 → Conversas vira lista (WhatsApp + cada e-mail) que abre em modal com a thread inteira e resposta inline. Portal do cliente (Mensagens) para de reexibir WhatsApp/e-mail — só chat do portal e eventos de sistema (fase liberada, documento analisado). | @claude-code | 🟩 | ✅ |

## E05 — Demo & Impersonação

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E05-S01 | Seletor de persona / impersonar | Barra de demo, alternar Cliente↔Admin | @claude-code | 🟩 | ✅ |
| E05-S02 | Cenários de demo | 6 cenários (padrão, funil cheio, 4 personas) | @claude-code | 🟩 | ✅ |

---

# Rodada 2 — visão de produto do cliente (E06–E11)

Origem: mensagem do **Bruno Luz** em 06/08/2026, dividindo a plataforma em módulos
(backend/documentos, comunicação, área do cliente, pagamentos, escalabilidade, pré-vendas).
Specs geradas em 06/08/2026; **nenhuma story implementada ainda**.

Decisões tomadas com o cliente nesta rodada:
- Comunicação **híbrida** — WhatsApp como porta de entrada, portal como canal de registro (ADR-0006).
- Multi-visto: **arquitetura pronta + 2 programas mockados**, sem editor no admin (ADR-0004).
- IA de documentos: **sempre sugere, humano aprova** (ADR-0005).

## E06 — Programas de visto (multi-fluxo) · ADR-0004

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E06-S01 | Modelo de Programa | Programa como dado versionado; porta + instanciação da jornada. **Arquitetural** | @claude-code | 🟩 | ✅ |
| E06-S02 | Programa Visto Religioso | R/EB-4 com documentos institucionais da igreja — prova de que o 2º fluxo entra sem código | @claude-code | 🟩 | ✅ |
| E06-S03 | Abertura de caso com programa | Escolha do programa na conversão do lead; jornada instanciada do template | @claude-code | 🟩 | ✅ |
| E06-S04 | Catálogo de programas | Visão somente-leitura no admin, com comparação lado a lado | @claude-code | 🟩 | ✅ |
| E06-S05 | Editor de etapas + análise IA por skill/referência | Admin cadastra requisitos de documento pela UI; cada um pode habilitar análise por IA com skill e arquivo de referência. **Arquitetural — requer ADR novo restringindo o ADR-0004 antes de codar.** | — | ⬜ | ✅ |

## E07 — IA de análise de documentos · ADR-0005

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E07-S01 | Porta de análise | `AnalisadorDocumentoPort`, tipos tipados, parecer separado da decisão. **Arquitetural** | @claude-code | 🟩 | ✅ |
| E07-S02 | Feedback ao cliente | Parecer no upload, correção antes da fila; enviar assim mesmo sempre possível | @claude-code | 🟩 | ✅ |
| E07-S03 | Fila de revisão humana | Admin decide; sem aprovação em massa sem leitura | @claude-code | 🟩 | ✅ |
| E07-S04 | Carta experiência × recomendação | Regras do caso concreto citado pela Akros + cenário de demo | @claude-code | 🟩 | ✅ |

## E08 — Comunicação unificada (híbrido) · ADR-0006

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E08-S01 | Timeline unificada | `EventoComunicacao` append-only; absorve `Interacao`. **Arquitetural** | @claude-code | 🟩 | ✅ |
| E08-S02 | Chat no portal | Canal registrável, mensagem ancorada em documento/fase, não apagável | @claude-code | 🟩 | ✅ |
| E08-S03 | Política de canal | Anexo do WhatsApp é registrado e redirecionado, nunca bloqueado nem perdido | @claude-code | 🟩 | ✅ |

## E09 — Ritmo, previsão e responsabilidade

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E09-S01 | Dono da etapa | `responsavel`: cliente / Akros / terceiro / USCIS. Base do épico | @claude-code | 🟩 | ✅ |
| E09-S02 | Previsão pelo ritmo | Faixa de conclusão com fórmula aberta; impacto da inércia visível | @claude-code | 🟩 | ✅ |
| E09-S03 | Painel de gargalos | Onde os casos param, por quanto tempo, de que lado (dataviz) | @claude-code | 🟩 | ✅ |
| E09-S04 | Alertas | Cliente inativo, material vencido, etapa travada | @claude-code | 🟩 | ✅ |
| E09-S05 | Cliente não conclui etapa sozinho | Cliente envia (pendente → em_analise); só a Akros aprova (→ concluida, com notificação) ou devolve pra ajuste (→ pendente de novo). Cliente 360 ganha painel "Aguardando sua avaliação" com Aprovar/Devolver. | @claude-code | 🟩 | ✅ |

## E10 — Pagamentos na plataforma

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E10-S01 | Pagamento por transferência | Sem gateway: dados de recebimento (fictícios), upload de comprovante, conciliação manual pela equipe | @claude-code | 🟩 | ✅ |
| E10-S02 | Cartão salvo + recorrência | Cobrança recorrente automática | — | ⬜ | ⏳ |
| E10-S03 | Multi-meio (QuickBooks / Wise) | Integração real com os sistemas que a Akros já usa | — | ⬜ | ⏳ |
| E10-S04 | Faturas e recibos | Documento fiscal no portal | — | ⬜ | ⏳ |

> **Decisão do cliente (06/08/2026): sem gateway.** A Akros recebe por transferência bancária/Pix
> (BRL) ou transferência internacional (USD) — não por cartão. E10-S01 cobre esse fluxo completo
> (dados fictícios, upload de comprovante, conciliação manual). S02–S04 permanecem em backlog:
> cartão/recorrência e integração real com QuickBooks/Wise exigem decisão de produto que não foi
> tomada nesta rodada.

## E11 — Pré-venda: qualificação e follow-up

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E11-S01 | Qualificação no WhatsApp | As ~10 perguntas em conversa, com retomada e link ainda disponível | @claude-code | 🟩 | ✅ |
| E11-S02 | Perfil rico do lead | Budget, momento de vida, objeção principal; preservado no descarte | @claude-code | 🟩 | ✅ |
| E11-S03 | Cadência de follow-up | 4 toques, cada um com uma saída diferente; para na primeira resposta | @claude-code | 🟩 | ✅ |
| E11-S04 | Gate humano no agendamento | Nada vai para a agenda sem aprovação; sem auto-aprovação | @claude-code | 🟩 | ✅ |
| E11-S05 | Base de reativação | Segmentar por objeção/momento; campanha iniciada por humano | @claude-code | 🟩 | ✅ |

## Ordem de execução (rodada 2) — como foi implementado

```
E06-S01 (programa como dado)
   ├─▶ E06-S02, E06-S03, E06-S04
   └─▶ E09-S01 (responsavel vive no template do programa)
            └─▶ E09-S02 ─▶ E09-S03, E09-S04
E07-S01 (porta de análise; depende do TipoDocumento do E06-S01)
   └─▶ E07-S02 ─▶ E07-S03 ─▶ E07-S04
E08-S01 (timeline; absorveu Interacao — Cliente360, dashboard e kanban migrados juntos)
   └─▶ E08-S02, E08-S03
E10-S01 (pagamento por transferência — reaproveita o canal registrável do E08)
E11-S02 (perfil) ─▶ E11-S01 ─▶ E11-S03 ─▶ E11-S04 ─▶ E11-S05
```

## Perguntas que continuam em aberto com a Akros

Implementado com dados fictícios/estimativas razoáveis onde a resposta real ainda não existe.
Nenhuma delas bloqueia o uso do protótipo em demo — bloqueiam apenas o conteúdo virar produção.

1. **Roteiro real de qualificação** — E11-S01 usa um roteiro **fictício** (`mocks/qualificacao.ts`) para mostrar o mecanismo. Precisa das ~10 perguntas reais do formulário atual da Akros.
2. **Fluxo religioso R/EB-4** — fases e documentos em `mocks/programas/religioso-r-eb4.ts` precisam de validação da Natalia e da Dra. Denise antes de uso com cliente real.
3. **Limiares de alerta** (E09-S04, em `OperacaoPage.tsx`) e **intervalos da cadência** (E11-S03, em `mocks/cadencia.ts`) — os números atuais são propostas; dependem do tempo de resposta real observado pela equipe.
4. **Fórmula de previsão** (E09-S02) — os limites [0,7 – 3,0] do fator de ritmo são um chute razoável, documentado como tal no código.
5. **Migração entre programas preservando progresso** (E06-S03) — hoje trocar o programa de um cliente reinstancia a jornada e perde o avanço; a UI avisa antes de confirmar.
6. **Retenção de dado de lead perdido** (E11-S02/S05) — base legal e prazo de guarda. Registrar em `docs/SECURITY_DEBT.md` antes de produção.
7. ~~**Multi-tenant / white-label**~~ — **decidido em 28/08/2026: não.** A plataforma é single-tenant da Akros; nenhuma tabela recebe `org_id`. Ver `docs/adr/0009-single-tenant-sem-org-id.md`.
8. **Dados bancários reais** (E10-S01) — `mocks/dados-recebimento.ts` usa titular/banco/conta **fictícios** de propósito. Substituir pelos dados reais da Akros é decisão consciente antes de qualquer uso fora de demo.

---

## Sugestões estratégicas (pensando como dono da Akros)

Ideias para elevar a proposta (validar com a Akros antes de priorizar — **não implementadas
nesta fase**, ficam como backlog para próxima rodada):
- **Score de elegibilidade EB-2 NIW** no site (quiz que gera lead qualificado automaticamente).
- **Estimador de prazo/custo** interativo por tipo de visto.
- **Notificações** (mock) quando admin libera uma fase — reforça a gamificação.
- **Badges/conquistas** por fase concluída (elemento de gamificação explícito).
- **Portal do recomendante** — link para signatários enviarem cartas assinadas (reduz fricção da Fase 2).
- **Central de documentos** com versionamento e status por documento.
- Code-splitting (bundle atual ~615kB — considerar lazy loading das 3 frentes antes de produção).

Itens desta lista **absorvidos pela rodada 2**: central de documentos com versionamento (E06/E07)
e portal do recomendante (candidato natural a E08-S04, ainda não especificado).

## Verificação (2026-08-06, após implementação da rodada 2)

```
Typecheck:  ✅ zero erros
Build:      ✅ sucesso (~690kB, aviso de bundle size não-bloqueante)
Lint:       ✅ zero erros (biome)
Arch check: ✅ zero violações (dependency-cruiser, 151 módulos)
Esteira:    ✅ 108 docs OK (frontmatter, links, specs)
Testes:     ✅ 78/78 passando (vitest) — 25 novos: 16 unitários de invariante + 9 smoke de render
```

**Pendência conhecida:** peer review visual em browser real ainda não foi feito por um agente
(sem ferramenta de browser no ambiente). Antes da demo: rodar `pnpm dev`, navegar pelas 3 frentes
com a barra de demo — agora com ~15 telas novas — e revisar contra os checklists impeccable em
`specs/*/evidence/checklist-impeccable.md`. As telas da rodada 2 (fila de revisão, aprovações,
operação, conciliação, catálogo de programas) nunca passaram por olho humano.

## Próximos passos
1. Peer review visual em browser das telas novas (ver pendência acima) — prioridade antes de qualquer demo ao vivo com a Akros.
2. Levar as 8 perguntas em aberto (seção acima) para a Bruno/Natalia/Dra. Denise — nenhuma bloqueia a demo, mas todas bloqueiam uso em produção.
3. Validar conteúdo/copy com a Akros (textos, valores e prazos são estimativas razoáveis, não dados oficiais confirmados).
4. Quando aprovado para produção: seguir ADR-0002 (portas/adapters) para trocar mocks por Supabase — inclui o `MockAnalisadorDocumento` (ADR-0005) por um adapter de LLM real, com as implicações de PII descritas lá.

---

# Rodada 3 — implantação/produção (E12+)

Origem: revisão adversarial de 28/08/2026 (ver handoff em `docs/STATE.md`), 4 bloqueadores P0
identificados antes de ir para produção. **ADR-0008** (sessão: access token em memória + refresh
em cookie HttpOnly via Edge Function) e **ADR-0009** (single-tenant, sem `org_id`) fecham as
decisões de arquitetura de autenticação. Projeto Supabase já existe (`mhxopadkizktsenohnbm`,
região `sa-east-1`, Postgres 17).

Ordem acordada: `E12-S01` → `E12-S02` → `E12-S03` → `E13` (schema/RLS/audit/LGPD) → `E14` (cofre de
credenciais + Edge Functions) → `E15` (lazy loading + resiliência) → `E16` (operação).

## E12 — Fundação de autenticação e autorização

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E12-S01 | Contrato de portas em uso | Gap real (menor que o suposto): 18 mutações órfãs em 4 arquivos ainda pegavam ação direto de `useMockDb` em vez do `container` — corrigido e validado em browser real (peer review 28/08). 2 bugs de crash pré-existentes achados e corrigidos de brinde (loop infinito em seletor Zustand com `.filter()` inline). Ver `specs/E12-S01-contrato-portas/spec.md`. | @claude-code | 🟩 | ✅ |
| E12-S02 | Autenticação e RBAC | Supabase Auth real implementado: 3 Edge Functions de sessão (ADR-0008), proxy Netlify+Vite, guarda de rota (`RequireRole`), RBAC via `app_metadata` (ADR-0009), 2 usuários seed reais. Testado via curl E TAMBÉM em browser real (login, F5, logout, cross-role, AC-2 a AC-7 todos confirmados). Ver `specs/E12-S02-auth-rbac/`. | @claude-code | 🟩 | ✅ |
| E12-S03 | Playwright + matriz de autorização | Matriz executável (`apps/web/e2e/auth-matrix.spec.ts`): 5 specs verdes (guarda de rota, papel, login/logout real) + 1 `test.fixme` documentando o que só fecha com E13 (isolamento por `cliente_id`, RLS). | @claude-code | 🟩 | ✅ |

> **E13 só é considerado pronto quando as linhas de dados da matriz de autorização (E12-S03) ficam
> verdes** — não quando as tabelas sobem. Ver handoff completo em `docs/STATE.md`.

## E13 — Schema real, RLS, audit, LGPD

ADR-0009 (papel + `cliente_id`, sem `org_id`) e ADR-0010 (núcleo relacional + JSONB de blob;
migrations em `supabase/migrations/`) já fecham as decisões duras. Rollout **por bounded
context**, um de cada vez — mesmo padrão do E06 (S01 fixa o modelo, S02+ replicam).

| Story | Título | Descrição | Owner | Status | Spec |
|-------|--------|-----------|-------|--------|------|
| E13-S01 | Schema `crm.clientes` + RLS + segundo cliente seed | RLS provado de verdade via PostgREST no projeto real: cliente só vê a própria linha, admin vê todas, sem INSERT/DELETE pra `authenticated`. Fecha o `test.fixme` do E12-S03 (AC-6) com teste real. | @claude-code | 🟩 | ✅ |
| E13-S02 | Schema `jornada` (fases/etapas) | 3 tabelas normalizadas (fases/etapas são consultadas entre clientes — painel de gargalos — logo não viram JSONB). Helper `crm.meu_cliente_id()` criado, reaproveitado dali pra frente. RLS provado via PostgREST. | @claude-code | 🟩 | ✅ |
| E13-S03 | Schema `documentos` + `pagamentos` | Réplica do padrão. Depende de E13-S01. | — | ⬜ | ⏳ |
| E13-S04 | Schema `comunicacao` + `agenda` + `programas` | Réplica do padrão (contextos restantes). Depende de E13-S01. | — | ⬜ | ⏳ |
| E13-S05 | `audit.*` append-only em todas as tabelas de E13-S01..S04 | Trilha de auditoria (baseline mínimo + os-grade). | — | ⬜ | ⏳ |
| E13-S06 | Schema `lgpd.*` (consentimento, export, delete) | Base legal, direito de exclusão/portabilidade. | — | ⬜ | ⏳ |
| E13-S07 | Frontend: trocar `MockClienteRepository` por adapter Supabase | Primeiro bounded context a sair do mock de verdade — prova que o padrão porta/adapter (ADR-0002) aguenta a troca sem reescrever UI. Depende de E13-S01. | — | ⬜ | ⏳ |
