---
name: STATE
description: Estado volátil do trabalho. Atualizar ao pausar/retomar (use /handoff).
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

Sessão atual:
- **Data:** 2026-08-06
- **Owner:** Claude (execução autônoma solicitada pelo usuário)
- **Epic em foco:** Nenhum — **ROADMAP COMPLETO** (E00 a E05, 25 stories)
- **Stories em progresso:** Nenhuma — todas concluídas

## Resumo de progresso

Protótipo visual da Akros Immigration Solutions **100% implementado** seguindo o ciclo SDD
(specs já existiam de sessão anterior; esta sessão executou @dev + @qa para todas as 25 stories).

**As 3 frentes estão navegáveis em localhost:**
- **Site institucional** (`/`) — 7 páginas com conteúdo real coletado de akrosimmigration.com
- **Portal do cliente** (`/portal`) — dashboard + jornada gamificada (Introdução + 5 fases,
  unlock sequencial) + documentos + assinatura + pagamentos + agenda + perfil
- **Painel admin** (`/admin`) — kanban de leads (6 colunas) + clientes 360 (7 abas) + gestão
  de jornada (gate central) + propostas + dashboard com métricas + comunicação (WhatsApp +
  agente IA) + agenda integrada + transcrições Fireflies

**Impersonação/demo** (barra fixa em todas as telas): seletor de persona (4 clientes em
estados diferentes de jornada), alternador Cliente↔Admin, 6 cenários pré-configurados,
botão resetar demo.

## Arquitetura implementada

- Portas/adapters (ADR-0002): 13 portas, todas com Mock*Repository, container de DI (`app/di.ts`)
- Estado mock: Zustand (`useMockDb`) com seed determinístico + `resetarDemo()`
- i18n completo (react-i18next): pt-BR + EN, 4 namespaces, zero texto hardcoded
- Design system: 15 componentes (`shared/ui/`), tokens Akros (navy/gold/cream)
- 38 testes vitest cobrindo regras de negócio centrais (gate de unlock sequencial,
  progresso da jornada, conversão lead→cliente, ciclo de vida de proposta, mutações de
  documentos/pagamentos/agenda/comunicação)

## Gates finais (verificados nesta sessão)

```
Typecheck: ✅ zero erros
Build:     ✅ sucesso
Lint:      ✅ zero erros (biome)
Testes:    ✅ 38/38 passando
```

## Pendências conhecidas

1. **Peer review visual em browser real não realizado** — extensão Chrome (claude-in-chrome)
   indisponível no ambiente desta sessão. Todos os checklists impeccable (`specs/*/evidence/`)
   foram preenchidos por revisão de código, mas a validação visual humana em `pnpm dev` ainda
   não ocorreu. **Recomendado antes de demo ao cliente.**
2. **Conteúdo/copy não validado pela Akros** — textos, valores de honorários, prazos médios
   são estimativas razoáveis baseadas no manual e site reais, não confirmados pelo cliente.
3. **Bundle size** — build gera ~600kB (aviso do Vite, não-bloqueante). Considerar code-splitting
   por rota antes de produção.

## Próximos passos

1. Rodar `pnpm dev`, abrir `/dev/ui` e as 3 frentes, revisar visualmente com a barra de demo.
2. Validar conteúdo com a Akros (Natalia Luz) antes da apresentação.
3. Ver "Sugestões estratégicas" em `docs/epics/ROADMAP.md` para próxima rodada (score de
   elegibilidade, notificações, badges de gamificação, portal do recomendante, etc).
4. Fase futura: migrar mocks → Supabase seguindo ADR-0002 (trocar adapters no container, sem
   tocar UI/domínio).

## Notas/contexto de troca

- Fonte da jornada: `manual-cliente-eb2-niw-utf8-links-corrigidos-v2.html`.
- Identidade: `Akros identidade/` (logos). Paleta navy `#0D2240` / gold `#C6A254` / cream `#F5F4F0`.
- Todas as specs em `specs/E0N-S0N-*/spec.md`, evidências de impeccable em `specs/E0N-S0N-*/evidence/`.
- Correção de bug notável: hooks de documentos/pagamentos/agenda inicialmente usavam fetch
  assíncrono via container (padrão do `site/hooks.ts`), o que não refletia mutações em tempo
  real. Refatorados para leitura reativa direto do `useMockDb` (mesmo padrão de `jornada/hooks.ts`).
- Extensões de porta feitas durante execução (além do previsto em E00-S04):
  `ClienteRepository.atualizar()` (necessário para E02-S07).
- `pnpm exec biome` trava neste ambiente sandboxed (thread nativa Rust incompatível com o
  wrapper de spawn do pnpm) — lint foi validado chamando o binário `cli-darwin-arm64/biome`
  diretamente. Não afeta `git commit` (lefthook invoca de forma diferente e funciona normal).

---
*Atualizar este arquivo ao pausar a sessão. Use `/handoff` para semiautomatizar.*
