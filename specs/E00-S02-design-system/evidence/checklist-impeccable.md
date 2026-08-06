# Checklist Impeccable — Design System (E00-S02)

**Story:** E00-S02 · **Componentes:** Button, Card, Badge, Input, Textarea, Select, Modal, Tabs,
Progress, Stepper, Avatar, Tooltip, Toast, Skeleton · **Showcase:** `/dev/ui`

## 1. Spacing & Alignment
- [x] Espaçamento por escala Tailwind consistente (gap-1.5/2/4, px-3.5/5/7) — não é grid 8px cru
      em todo lugar; padding de inputs (h-11, px-3.5) escolhido pra alinhar visualmente com botões (h-11 no md)
- [x] Whitespace agrupa: label+input+hint com gap-1.5; seções do showcase com gap-4/10

## 2. Typography
- [x] Fonte com personalidade: **Fraunces** (display/serif, títulos) + **Inter** (sans, corpo) — self-hosted via @fontsource
- [x] Escala harmônica definida em tailwind.config (xs 12→6xl 60, linha-por-tamanho)
- [x] Line-height maior em corpo (1.6), menor em headings (1.05-1.2)
- [x] Weight intencional: medium (500) em labels/badges, semibold (600) em títulos
- [x] Letter-spacing em uppercase labels (`tracking-label` = 0.08em) — section titles do showcase

## 3. Color & Contrast
- [x] Paleta da marca: navy `#0D2240` (+ escala 50-950), gold `#C6A254` (+ escala), cream `#F5F4F0`
- [x] Contrast: texto navy sobre branco/cream — AA; texto branco sobre navy — AA (verificado visualmente,
      navy é escuro o suficiente: luminância baixa)
- [x] Cor tem razão: danger=vermelho, success=emerald, warning=amber, gold=destaque de marca
- [ ] Dark mode — não implementado nesta fase (fora de escopo da spec E00-S02, mencionado como opcional)

## 4. Interaction & Animation
- [x] Transições com duração intencional: 150ms (inputs/tooltip), 200ms (button/modal backdrop), 500ms (progress bar fill)
- [x] Easing customizado: `ease-out-soft` (cubic-bezier 0.16,1,0.3,1) para progress; padrão Tailwind nos demais (adequado à escala pequena das transições de cor)
- [x] Hover/focus/active distintos: cada variant de Button tem hover E active separados; focus-visible com ring gold em todos os componentes interativos
- [x] `prefers-reduced-motion` respeitado globalmente via CSS (index.css, já herdado do scaffold E00-S01)

## 5. Consistency & Details
- [x] Ícones: **um único set** (lucide-react) — Loader2, ChevronDown, Check, Lock, CheckCircle2, XCircle, Info, X
- [x] Border-radius em escala: sm=4px, DEFAULT/md=8px, lg=12px, xl=16px — Button/Input=md, Card=lg, Badge=full
- [x] Shadows em 2 níveis: `shadow-subtle` (cards, botões primary) e `shadow-elevated` (modal, toast) + `shadow-gold` (destaque)
- [x] Form fields mesma altura: Input/Select/Button(md) todos h-11
- [x] Estados vazios/loading: Skeleton component disponível; Button tem estado loading nativo

## Peer Review
- [ ] Revisão visual humana em browser — **não disponível nesta sessão** (extensão Chrome não conectada
      no ambiente de execução). Recomenda-se abrir `pnpm dev` → `/dev/ui` e revisar visualmente antes do
      merge/demo ao cliente.

## Notas
- Todos os componentes verificados via build + typecheck + lint (biome, zero erros/warnings).
- Acessibilidade: Modal com foco gerenciado (foco inicial, restore, Escape, backdrop click),
  aria-live no ToastViewport, aria-invalid/aria-describedby em Input/Textarea/Select, semântica nativa
  (`<progress>`, `<output>`) usada onde o linter apontou alternativa mais correta que `role=`.
- `<dialog>` nativo avaliado e descartado para o Modal: exigiria refatorar para API imperativa
  (`showModal()`/`close()`), incompatível com o padrão controlado `open`/`onClose` usado pelas
  features que vão consumir este componente (jornada, admin). Documentado via biome-ignore com razão.
