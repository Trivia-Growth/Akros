---
name: impeccable-checklist
description: Template antes/depois pra polish UI. Use ao finalizar feature com UI.
---

# Checklist Impeccable — Antes/Depois

Copie este template e preencha ao finalizar componente/página. Submeta com PR como evidência de impeccable.

---

## Feature: [Nome]

**Story:** E0N-S0N
**Componente(s):** [lista de componentes]
**Data:** [data]

---

## Screenshots Antes/Depois

[Cola 2 screenshots: antes (genérico) e depois (impeccable)]

```
ANTES:
[screenshot ou URL]

DEPOIS:
[screenshot ou URL]
```

---

## 5 Pilares — Checklist & Justificativas

### 1. Spacing & Alignment

- [ ] **Spacing intencional**
  - Antes: [descrição do spacing genérico]
  - Depois: [novo spacing com razão]
  - Razão: [por que mudou?]

- [ ] **Whitespace agrupa**
  - Mudanças: [onde aumentou espaço entre grupos]

- [ ] **Sem branco vazio**
  - Checado: sim

### 2. Typography

- [ ] **Font não-genérica**
  - Font escolhida: [nome, porquê]
  - Alternativas rejeitadas: [por quê]

- [ ] **Tamanhos em escala**
  - Antes: [tamanhos usados]
  - Depois: [nova escala]

- [ ] **Line-height por tamanho**
  - Títulos: 1.2
  - Corpo: 1.5
  - Pequeno: 1.6

- [ ] **Font-weight intencional**
  - Labels: regular (400)
  - Destaques: medium (500)
  - Títulos: semibold (600)

- [ ] **Letter-spacing em maiúsculas**
  - Badges: +0.5px
  - Labels: +0.25px

### 3. Color & Contrast

- [ ] **Paleta coerente**
  - Cores primárias: [lista]
  - Cores neutras: [lista]
  - Sem cores "aleatórias"

- [ ] **Contrast WCAG AA**
  - Texto escuro sobre fundo claro: ratio ___
  - Texto claro sobre fundo escuro: ratio ___

- [ ] **Cor tem razão**
  - Vermelho (erro): [por quê]
  - Verde (sucesso): [por quê]
  - Azul (info): [por quê]

- [ ] **Dark mode intentional**
  - Antes: [como era gerado]
  - Depois: [novo approach]
  - Razão: [especial no dark mode?]

### 4. Interaction & Animation

- [ ] **Animações têm propósito**
  - Hover: feedback visual (250ms)
  - Loading: reveal (600ms)
  - Dismiss: exit (300ms)

- [ ] **Duração apropriada**
  - Feedback: 250ms
  - Reveal: 600ms
  - Micro: 150ms

- [ ] **Easing natural**
  - Feedback: cubic-bezier(0.34, 1.56, 0.64, 1)
  - Reveal: cubic-bezier(0.16, 1, 0.3, 1)
  - Saída: cubic-bezier(0.7, 0, 0.84, 0)

- [ ] **Hover/focus/active distintos**
  - Hover: bg -5% darker
  - Focus: ring 2px offset 2px
  - Active: shadow inset

- [ ] **prefers-reduced-motion respeitado**
  - Duração → 0ms quando prefers-reduced-motion
  - Ou: opacity fade ao invés de slide

### 5. Consistency & Details

- [ ] **Ícones set único**
  - Set escolhido: [Heroicons/Feather/outro]
  - Tamanho: 20px (corpo), 24px (header)
  - Peso: regular

- [ ] **Border-radius escala**
  - Pequeno: 4px (inputs, small badges)
  - Médio: 8px (cards, buttons)
  - Grande: 12px (panels, modals)

- [ ] **Shadows consistentes**
  - Level 1 (card hover): 0 1px 3px rgba(0,0,0,0.1)
  - Level 2 (modal): 0 10px 25px rgba(0,0,0,0.15)

- [ ] **Form fields mesma height**
  - Input: 40px (padding 8px 12px, text 14px)
  - Select: 40px (same)
  - Textarea: múltiplos de 40px (80px, 120px, etc)

- [ ] **Edge cases designados**
  - Empty state: [descrição, screenshot]
  - Loading: [skeleton/spinner, screenshot]
  - Error: [toast/alert, screenshot]

---

## Peer Review

- [ ] Peer reviews (outro olho humano)
  - Reviewer: [nome]
  - Feedback: [o que aprimorou]
  - Aprovado: [ ] sim

---

## Notas Finais

[Qualquer contexto extra — referências design, trade-offs, decisões que merecem doc]

---

## Próximo Passo

- [ ] Screenshots + checklist adicionados ao PR
- [ ] Comment no PR linkando este arquivo
- [ ] Pronto pra `/validar` (Definition-of-Done)
