---
name: adr-0015-spec-kit-como-sdd
description: O SDD do Akros passa a rodar no GitHub Spec Kit; specs anteriores ficam congeladas; skills sobrepostas saem. Substitui a política de artefato por tier (ADR-0011).
alwaysApply: false
---

# ADR-0015 — Spec Kit como SDD

**Status:** Aceito
**Data:** 2026-10-01
**Decisores:** Lucas Azevedo
**Substitui:** ADR-0011 (política de artefato por tier)
**Relacionados:** ADR-0016 (gates enxutos), `.specify/memory/constitution.md`, `AGENTS.md`,
`specs/001-spec-kit-sdd-gates-enxutos/`

## Contexto

A esteira SDD própria (`product.md` → `design.md` → `spec.md` → `tasks.md`, tier declarado, gates
`audit:esteira` e `eval:spec`) custou mais do que entregou:

- 91 specs, das quais 59 sem `tasks.md` e 77 sem `product.md` na medição de 31/08; o gate que devia
  cobrar isso avaliou zero specs por meses (ADR-0011).
- A dívida herdada precisou de `specs/_debt-baseline.json` (299 AC sem task, 74 artefatos
  ausentes), mantido à mão e que "só encolhe" — ou seja, um gate que mede o passado.
- O formato era só nosso: cada sessão nova precisava reaprender a esteira, e o `nova-story.mjs`
  gerava specs num molde que divergia do formato real.

O GitHub Spec Kit (v1.0.13, MIT) entrega o mesmo ciclo como skills do agente, com templates,
scripts e uma constituição que o `/speckit-plan` confere, mantido fora do repositório.

## Decisão

1. **Adotar o Spec Kit** com a integração `claude`. O diretório `.specify/` e as skills
   `.claude/skills/speckit-*` são versionados; `specify init` só é necessário para atualizar a versão.
2. **Fluxo:** `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
   `/speckit-analyze` → `/speckit-implement` ⇄ `/speckit-converge` → `/revisao-adversarial` → PR.
   Feature trivial (≤3 arquivos, sem decisão) dispensa o ciclo.
3. **Constituição do Akros** em `.specify/memory/constitution.md`: segurança OS-grade, regra de
   dependência, spec como fonte da verdade, rastreabilidade por story, honestidade sobre
   conhecimento. É o que o `/speckit-plan` confere.
4. **Specs anteriores ficam congeladas no lugar** (`specs/E0N-S0N-*/`, 91 pastas). Não são movidas,
   reescritas nem verificadas por gate; ROADMAP e ADRs continuam linkando para elas. Specs novas
   nascem no layout do Spec Kit (`specs/NNN-<slug>/`, numeração sequencial a partir de 001) e levam
   o ID da story (`E0N-S0N`) no cabeçalho, no commit e na migration.
5. **Tier deixa de ser campo obrigatório.** Fica a regra simples: trivial dispensa o ciclo; decisão
   difícil de reverter exige ADR antes do plano (CLAUDE.md, processo por story).
6. **Skills removidas** por sobreposição: `/nova-feature`, `/clarificar`, `/validar`, `/auditar`.
   Ficam `/revisao-adversarial`, `/revisar-pr`, `/handoff` e `impeccable`. Os agentes Triviaiox
   viram papéis de trabalho; `@devops` segue como único com `git push`/PR.
7. **Removidos junto:** `nova-story`, `check-story` (hook de lembrete a cada Edit/Write) e
   `specs/_debt-baseline.json`. O histórico git preserva tudo.

## Consequências

- (+) Ciclo conhecido de fora do projeto, atualizável com `specify`, sem manter gerador próprio.
- (+) Deixa de existir dívida de artefato a medir: o que está congelado não é cobrado.
- (−) O rastreio `ROADMAP → spec` fica manual para specs novas (a pasta é `NNN-slug`, não o ID da
  story). Mitigação: o ID é obrigatório no cabeçalho da spec e a linha do ROADMAP aponta a pasta.
- (−) Templates do Spec Kit estão em inglês; o conteúdo segue o idioma da descrição (PT-BR).
- (−) Atualizar o Spec Kit pode sobrescrever templates editados; edições vivem em
  `.specify/templates/` e devem ser revisadas no diff de cada upgrade.
- Nada do que as specs congeladas descrevem deixa de valer: o que mudou foi quem verifica o formato.
