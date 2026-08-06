---
name: impeccable
description: Polishing UI to look human-made, not AI-generated. Refine design, spacing, typography, interactions, consistency.
---

# impeccable — UI Polish & Design Consistency

> Skill para "humanizar" e polir UI, removendo artefatos de geração AI e garantindo design consistente.
> Baseado em https://github.com/pbakaus/impeccable

## O que é

Muitos UIs gerados por AI têm "marca de AI": spacing perfeito demais, tipografia genérica, animações abruptas, nenhum detalhe que traísse intenção. Impeccable é um framework mental pra detectar e corrigir essas características — fazendo o design parecer intencional, handcrafted, com personalidade.

## Quando usar

- **Finalizando feature visual** (quase pronta, falta o polish)
- **Antes de release/demo** (quer impressionar stakeholder, parecer profissional)
- **Ao revisar design** (checklist adversarial pra UI)
- **Componente novo no design system** (deve passar aqui antes de ir pra library)

## 5 Pilares do Impeccable

### 1. **Spacing & Alignment**
Espaçamento não é "ótimo" — é **intencional**.

- Não use grid perfeito (8px). Varie: 12px, 16px, 20px, 24px (quebra monotonia).
- Espaço branco estratégico (breathing room pra leitura).
- Alinhamento visual (não matemático) — texto alinhado pra "parecer" centrado, às vezes é offset.
- Density diferente por seção (cabeçalho apertado, conteúdo espaçoso).

**Checklist:**
- [ ] Padding/margin tem "razão" (não copypaste)
- [ ] Whitespace agrupa conceitos relacionados
- [ ] Não há "branco vazio" no meio (indica design incompleto)

### 2. **Typography**
Fonte é a personalidade.

- Não use default (Tailwind's sans). Escolha fonte com caráter (Geist, Inter, Suisse, etc).
- Tamanhos em escala harmônica (não qualquer número): 12→14→16→18→20→24→32→40→48.
- Line-height varia por tamanho (pequeno: 1.5, grande: 1.2).
- Font-weight intencional (not just bold/normal).
- Letter-spacing ajustado pra maiúsculas (títulos, badges, labels).

**Checklist:**
- [ ] Font escolhida é não-genérica (tem personalidade)
- [ ] Tamanhos seguem escala (não random)
- [ ] Contrast suficiente (WCAG AA)
- [ ] Ligaduras/kerning ativas se fonte suporta

### 3. **Color & Contrast**
Cor é emoção e usabilidade.

- Paleta coerente (não 12 tons de azul).
- Contrast suficiente (não apenas pra acessibilidade — pra legibilidade).
- Cor tem "razão" (não "porque ficou bonito").
- Saturação varia por contexto (destaque saturado, neutral dessaturado).
- Modo escuro não é invert (repensar cores, não copiar).

**Checklist:**
- [ ] Paleta tem identidade (não flat Tailwind)
- [ ] Sem gradientes desnecessários
- [ ] Hover/focus states existem e são claros
- [ ] Dark mode é intentional (não auto-gerado)

### 4. **Interação & Animation**
Movimento conta história.

- Duração tem razão (250ms pra feedback, 600ms pra reveal).
- Easing natural (não linear). Usar cubic-bezier custom, não ease-in-out genérico.
- Transição segue movimento real (objetos não "pulam").
- Hover/focus/active estados são distintos visualmente.
- Sem animação "só porque é legal" (toda animação serve propósito).

**Checklist:**
- [ ] Animações têm propósito (feedback, reveal, etc)
- [ ] Duração é apropriada pra contexto
- [ ] Easing não é linear
- [ ] Modo prefers-reduced-motion respeitado
- [ ] Loading states e skeletons são design-consistent

### 5. **Consistência & Details**
Detalhe mata diferença entre OK e wow.

- Ícones combinam (mesma set, tamanho consistente).
- Borders e radius coerentes (não variar sem razão).
- Shadows profundidade clara (não 5 níveis de depth).
- Form fields têm same height/padding (não variar).
- Empty states, 404s, loading têm design (não placeholder genérico).

**Checklist:**
- [ ] Ícones são set único (não misturar Feather + Heroicons)
- [ ] Border-radius tem escala (4px→8px→12px, não random)
- [ ] Shadows consistentes (1-2 níveis, não 5)
- [ ] Componentes similares tem same look
- [ ] Edge cases (empty, loading, error) são designed

## Como usar este skill

1. **Rode após UI pronta** — não no meio da dev (distração).
2. **Coma 1 pilar por vez** — não quer mudar tudo de uma vez.
3. **Defenda suas mudanças** — "por que este espaço?" (não "porque ficou melhor").
4. **Compare com referências** — olhe design premium (Vercel, Apple, Linear) e veja por quê.
5. **Teste em device real** — Figma/dev tools não mostram tudo.

## Gates

Gate pra impeccable passar:

```bash
# Antes/depois screenshots side-by-side
# Checklist dos 5 pilares preenchido
# Sem "porque ficou mais bonito" — sempre tem razão
# Recomendação: peer review (outro olho humano)
```

## Exemplo: Button Impeccable

❌ **Antes (AI-generated):**
```tsx
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Click me
</button>
```
Problema: padding genérico, color flat, hover abrupt.

✅ **Depois (Impeccable):**
```tsx
<button className="px-4 py-3 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors duration-200 font-medium tracking-tight">
  Click me
</button>
```
Razões:
- Padding 2px maior (visual breathing)
- Dark blue instead of bright (less harsh)
- Rounded-md instead of default (softer)
- Hover transition smooth (not abrupt)
- Font-medium + tracking-tight (typography intentional)

## Referências

- https://github.com/pbakaus/impeccable — framework original
- Vercel design system (https://vercel.com/)
- Linear app UX (https://linear.app/)
- Apple design (https://www.apple.com/design/)

---

## Checklist Rápido Pré-Release

- [ ] Spacing intencional (não grid 8px everywhere)
- [ ] Tipografia não-genérica (fonte com personalidade)
- [ ] Cores satured→dessaturated por importância
- [ ] Interações têm easing + duração apropriada
- [ ] Ícones, borders, shadows consistentes
- [ ] Dark mode designed (não auto-gerado)
- [ ] Empty/loading/error states são polidos
- [ ] Peer review passou (outro olho humano)

Quando tudo verde, seu UI não parece "feito por AI" — parece feito por designer que sabe o que tá fazendo.
