---
name: SPECS
description: Story-Driven Development (SDD) artefatos. product.md, spec.md, design.md, tasks.md.
---

# specs/ — Artefatos SDD

Repositório de **especificações e designs** de features. Cada feature tem seu diretório em `specs/NNNN-*` com os artefatos canônicos.

## Estrutura

```
specs/
├── _examples/                          # Exemplos de SDD completo (referência)
│   └── 0001-exemplo-feature/
│       ├── product.md                  # Por quê, para quem, sucesso
│       ├── spec.md                     # Contrato técnico (AC)
│       ├── design.md                   # Como (só tier arquitetural)
│       └── tasks.md                    # Decomposição AC→task→gate
├── quick/                              # Specs triviais (≤3 arquivos)
│   └── [nome].md                       # One-file spec (sem product/design)
├── 0001-primeira-feature/              # Feature E01-S01, E01-S02, ...
│   ├── product.md
│   ├── spec.md
│   ├── design.md (se tier arquitetural)
│   └── tasks.md
└── 0002-segunda-feature/               # etc
    └── ...
```

## Naming Convention

Diretório: `NNNN-<slug>`
- `NNNN`: sequência crescente (0001, 0002, …)
- `<slug>`: palavra-chave da feature (bulk-approve, dashboard-home, auth-oauth, etc)

Exemplo:
```
specs/0001-bulk-approve-ordens/product.md
specs/0002-dashboard-home/spec.md
specs/0003-oauth-integration/design.md
```

## Quando criar cada artefato

### product.md
- **Tier:** Pequeno + (sempre, exceto trivial)
- **Owner:** @pm + @analyst
- **Perguntas:** Por quê? Para quem? Como medir sucesso?
- **Exemplo:** `_examples/0001-exemplo-feature/product.md`

### spec.md
- **Tier:** Pequeno +
- **Owner:** @pm (baseado em product.md)
- **Format:** User story + Acceptance Criteria (Given/When/Then)
- **Oráculo:** É a verdade canônica que @dev e @qa usam
- **Exemplo:** `_examples/0001-exemplo-feature/spec.md`

### design.md
- **Tier:** ⚠️ **Arquitetural ONLY**
- **Owner:** @architect
- **Perguntas:** Como? Fluxo de dados? Decisões hard-to-reverse?
- **Triggers:** novo bounded context, integração externa, schema change em produção, tecnologia nova
- **Exemplo:** `_examples/0001-exemplo-feature/design.md`
- **Anti-pattern:** Não crie se tier é trivial/pequeno — perde efetividade.

### tasks.md
- **Tier:** Pequeno +
- **Owner:** @sm (transforma spec.md + design.md em tasks)
- **Format:** 1 task = 1 AC, cada task tem gate executável (comando)
- **Destino:** Serve de input pra Triviaiox stories (execução)
- **Exemplo:** `_examples/0001-exemplo-feature/tasks.md`

### quick/ (specs triviais)
- **Tier:** ≤3 arquivos, sem decisão
- **Format:** Uma única página markdown (.md), combina user story + AC
- **Owner:** @dev direto (sem @pm/@architect)
- **Exemplo:**
  ```markdown
  # Fix button alignment (quick/fix-button-align.md)
  
  Button `.submit` não alinha com input em mobile.
  Change: add `w-full` no Tailwind class.
  Teste: pnpm run test --testNamePattern="button.*align"
  ```

## Workflow padrão

```
1. @pm escreve product.md (por quê)
2. @pm escreve spec.md (contrato, ACs)
3. @architect escreve design.md (se tier arquitetural) e/ou ADR
4. @sm escreve tasks.md (decomposição, gates)
5. @dev implementa task a task (local git, 1 commit/task)
6. @qa valida gates (executa cada gate)
7. @devops faz PR, merge, push
```

Ver `AGENTS.md` pra detalhes de autoridade/timing.

## Verificação de Qualidade

Cada artefato tem frontmatter:
```markdown
---
name: [PRODUCT|SPEC|DESIGN|TASKS]
description: [uma linha, o que é este doc]
story: E0N-S0N (ID da story que este spec descreve)
---
```

**Verificação automática** (`/auditar`):
- Frontmatter válido
- Links internos existem (product.md → spec.md → design.md → tasks.md)
- tasks.md cita ACs da spec.md
- Sem `A COMPLETAR` (placeholders)
- Commits linkados

## Referências

- **CLAUDE.md** — convenções gerais
- **AGENTS.md** — quem escreve/consome cada artefato
- **ANTI-PADROES.md** — quando PARAR e perguntar
- **Definition-of-Done.md** — gates executáveis (task.md)
- `_examples/` — template pronto (copie e adapte)
