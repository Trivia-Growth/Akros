# Akros Constitution

Plataforma digital da Akros Immigration Solutions (site institucional, portal do cliente
gamificado, painel admin). Stack: React 19 + Vite + TypeScript + Tailwind; Supabase (Postgres +
Edge Functions). Idioma dos artefatos: **PT-BR, com termos técnicos em inglês**.

Esta constituição é a barra que `/speckit-plan` confere na seção *Constitution Check* e que
`/speckit-analyze` trata como inegociável. Ela resume o que já valia em `CLAUDE.md`, `ANTI-PADROES.md`
e `seguranca/os-grade.md`; em caso de conflito, vale esta.

## Core Principles

### I. A spec é a fonte da verdade
Implementa-se a partir de `specs/NNN-<slug>/spec.md`. Os Acceptance Scenarios (Given/When/Then) são
o contrato e o oráculo de teste. "Fora de escopo" é vinculante. Spec ambígua: pare e pergunte
(`/speckit-clarify`), nunca adivinhe. Código que diverge da spec leva `// SPEC_DEVIATION: <motivo>`
no código e em `tasks.md`, e a divergência se resolve corrigindo o código **ou** atualizando a spec
com ADR — nunca em silêncio.

### II. Portas e adapters, com regra de dependência
`interfaces → application → domain ← infrastructure`, dentro de
`apps/web/src/features/<dominio>/`. `domain/` sem I/O nem framework. Features de domínios diferentes
não se importam; compartilham por `packages/` ou `shared/`. Mock e Supabase vivem atrás da mesma
porta (ADR-0002); rota real nunca importa o container de mocks. Verificado por `pnpm arch:check`.

### III. Segurança OS-grade (INEGOCIÁVEL)
- RLS **FORCE** em toda tabela, schemas por domínio, GRANT explícito por papel.
- `audit.*` append-only; `DELETE` não concedido a ninguém em dado de negócio.
- Segredos no Vault; webhooks com HMAC ou capability token em header; `service_role` nunca no client.
- Edge Function pública declara rate limit (fail-closed no caminho sensível); endpoint por cookie
  exige o header CSRF; entrada externa é validada com Zod `.strict()`.
- Policy de UPDATE para o próprio cliente não pode permitir mudar estado de processo (pagamento,
  etapa, documento): a transição passa por RPC `SECURITY DEFINER` ou Edge Function com validação e
  auditoria.
- Dívida de segurança vai para `docs/SECURITY_DEBT.md`, nunca fica só na cabeça de alguém.

Verificado por `pnpm lint:migrations`, `pnpm check:edge-functions`, gitleaks e `db-tests`.

### IV. Teste prova o AC; gate verde não é "correto"
Todo Acceptance Scenario tem teste executável (vitest, SQL com `ASSERT` ou Playwright). Antes de dar
PASS numa feature, roda-se `/revisao-adversarial`: assuma que está quebrada e tente provar
(borda, erro parcial, concorrência, abuso). Achado reproduzido vira teste. Teste de segurança prova
o caminho de ataque, não só o caminho feliz.

### V. Linguagem ubíqua e i18n
Termos de `docs/glossary.md` e do domínio da feature, sem sinônimos; termo novo entra no glossário
no mesmo PR. Nenhum texto hardcoded em UI: PT-BR (padrão) e EN via react-i18next.

### VI. Interface com identidade
Toda UI segue a skill **impeccable** (`.claude/skills/impeccable/`) e a identidade navy `#0D2240`,
gold `#C6A254`, cream `#F5F4F0`. Feature com UI passa pelo checklist impeccable e por verificação em
browser real.

### VII. Rastreabilidade por story
Todo trabalho carrega o ID da story (`E0N-S0N`, ver `docs/epics/ROADMAP.md`): no cabeçalho da
`spec.md`, no commit (`feat(E0N-S0N): …`) e na migration (`NNNN_E0N-S0N_descricao.sql`, sequência
sem pular). Uma story = uma pasta em `specs/` no layout do spec-kit.

### VIII. Honestidade sobre conhecimento
Padrões do codebase primeiro, depois docs do projeto, depois documentação oficial. Não achou:
diga "não sei" e sinalize. Incerteza explícita vale mais que chute confiante. Relatório de
conclusão distingue o que foi executado do que foi só lido.

## Gates e fluxo

Fluxo por feature (spec-kit): `/speckit-specify` → `/speckit-clarify` (se houver ambiguidade) →
`/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` →
`/speckit-converge` → `/revisao-adversarial` → PR. Feature trivial (≤3 arquivos, sem decisão)
dispensa o ciclo e vai direto ao PR.

Gates mantidos, e só estes (ADR-0016):
- **Local (pre-commit/pre-push):** Biome, typecheck, vitest, commitlint, gitleaks (se instalado).
- **CI:** qualidade (lint, typecheck, `arch:check`, build, testes), segurança (gitleaks, migrations,
  Edge Functions) e `db-tests` (migrations do zero + testes SQL), agregados no check `ci`, o único
  obrigatório na `main`.
- **Sob demanda:** `pnpm e2e` (Playwright contra o Supabase real) antes de mexer em auth/RLS/sessão.

Gate novo só entra se pegar um defeito que nenhum dos acima pega e que tenha custado caro; entra
junto com o teste do próprio gate e com a remoção de outro de custo equivalente. Gate que passa
sem avaliar nada (coleção vazia) é bug do gate.

Papéis: `@devops` é o único com `git push`/PR. Os demais papéis Triviaiox (`@pm`, `@architect`,
`@sm`, `@dev`, `@qa`) são personas de trabalho, não etapas obrigatórias separadas dos comandos
spec-kit.

## Governance

Esta constituição prevalece sobre `CLAUDE.md` e `AGENTS.md` quando divergem. Emenda exige ADR em
`docs/adr/` (nunca se edita um ADR aceito; cria-se outro que o substitua), atualização desta versão
e, se mudar gate, atualização do `lefthook.yml` e do `.github/workflows/ci.yml` no mesmo PR. Todo PR
verifica o Constitution Check do plano. Complexidade além do necessário é justificada na seção
*Complexity Tracking* do plano.

**Version**: 1.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-01
