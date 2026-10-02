# Implementation Plan: Spec Kit como SDD e gates enxutos

**Story**: E00-S07 | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

## Summary

Instalar o Spec Kit (`specify init . --integration claude`), escrever a constituição do Akros,
remover os gates que policiam o formato antigo de spec, enxugar `lefthook.yml` e `ci.yml` e
reescrever a documentação de processo. Sem tocar em `apps/web`, `supabase/` ou specs legadas.

## Technical Context

**Language/Version**: Node 22 (scripts), YAML, Markdown, Bash (scripts do Spec Kit)
**Primary Dependencies**: `specify-cli` 1.0.13 (uv tool, só para init/upgrade), lefthook, GitHub Actions
**Storage**: N/A
**Testing**: `node --test` dos gates mantidos; execução dos comandos dos jobs
**Target Platform**: Claude Code (integração `claude`), CI GitHub Actions
**Project Type**: processo/ferramental do monorepo
**Constraints**: nenhum gate de segurança removido; specs legadas intocadas; push só pelo `@devops`
**Scale/Scope**: 91 specs legadas, 17 scripts removidos, 4 skills removidas

## Constitution Check

| Princípio | Status |
|---|---|
| I. Spec fonte da verdade | ok — esta spec existe e dirige a mudança |
| II. Portas e adapters | N/A — sem código de aplicação |
| III. Segurança OS-grade | ok — `lint:migrations`, `check:edge-functions`, gitleaks, `db-tests` preservados |
| IV. Teste prova o AC | ok — cada AC tem comando em `tasks.md`; e2e vira sob demanda (risco registrado no ADR-0016) |
| V. Linguagem ubíqua / i18n | N/A |
| VI. Interface | N/A |
| VII. Rastreabilidade | ok — ID E00-S07 no cabeçalho, nos commits e no ROADMAP |
| VIII. Honestidade | ok — risco de perda de cobertura e de required checks registrado |

## Project Structure

```text
specs/001-spec-kit-sdd-gates-enxutos/{spec,plan,tasks}.md   ← esta story, layout spec-kit
specs/E0N-S0N-*/                                            ← congeladas
.specify/                                                    ← spec-kit (memory, templates, scripts)
.claude/skills/speckit-*                                     ← skills do spec-kit
docs/adr/0015-spec-kit-como-sdd.md · 0016-gates-enxutos.md
```

**Structure Decision**: o ID da story vai no cabeçalho da spec (a pasta é `NNN-slug` por imposição do
script do Spec Kit, que numera pelas pastas `^[0-9]{3,}-`; as pastas `E0N-…` não colidem).

## Decisões de implementação

- `specify init . --integration claude --non-interactive --force`: não alterou arquivos existentes
  (verificado por `git status`: só `.specify/` e `speckit-*` novos).
- `pnpm install --ignore-scripts` ao trabalhar em worktree, para o `prepare` não gravar hooks no
  `.git` compartilhado.
- A CI mantém `db-tests` idêntico e junta os demais gates por afinidade (qualidade × segurança),
  um `pnpm install` por job.
- `audit:deps` (pnpm audit) continua como script avulso; não entra na CI para não aumentar gates.

## Complexity Tracking

Sem violações da constituição.
