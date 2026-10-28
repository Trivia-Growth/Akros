---
name: impeccable
description: Polish UI — garante que frontend não parece AI-generated. 5 pilares, checklist, antes/depois.
alwaysApply: false
---

# /impeccable — UI Polish Guide

Comando pra finalizar polish de UI antes de release/PR.

## Como usar

```
/impeccable
```

Abre:
1. Skill `.claude/skills/impeccable/SKILL.md` — 5 pilares (spacing, typography, color, interaction, consistency)
2. Checklist antes/depois — `.claude/skills/impeccable/checklist-antes-depois.md`
3. Definition-of-Done seção 7 — gates obrigatórios

## Fluxo

1. **Leia SKILL.md** — entenda os 5 pilares
2. **Preencha checklist-antes-depois.md** — screenshots + razões de cada mudança
3. **Rode peer review** — outro olho humano
4. **Marque Definition-of-Done seção 7** — ✅ quando passar
5. **Commit + PR** — inclua checklist preenchido

## 5 Pilares (resumo)

1. **Spacing** — intencional, agrupa conceitos, sem branco vazio
2. **Typography** — font com personalidade, escala harmônica, weights intencionais
3. **Color** — paleta coerente, contrast WCAG AA, cores têm razão
4. **Interaction** — animações propositais, easing natural, prefers-reduced-motion
5. **Consistency** — ícones mesma set, border-radius escala, shadows 1-2 níveis, edge cases designados

## Gate

```bash
# Checklist preenchido + screenshots antes/depois
# Peer review passou (outro designer/dev)
# Todas mudanças têm razão documentada
```

## Referência

- `.claude/skills/impeccable/SKILL.md` — framework completo
- `.claude/skills/impeccable/checklist-antes-depois.md` — template
- `Definition-of-Done.md` seção 7 — gates obrigatórios
- https://github.com/pbakaus/impeccable — inspiração

---

**Obrigatório:** toda feature com UI passa por impeccable antes de `/validar`.
