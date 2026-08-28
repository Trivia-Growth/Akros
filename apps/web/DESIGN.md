---
name: Akros
description: Plataforma de imigração que orienta cada etapa com clareza e confiança.
colors:
  navy: "#0D2240"
  navy-deep: "#050F1E"
  navy-light: "#EAF0F8"
  gold: "#C6A254"
  gold-light: "#FBF6EB"
  cream: "#F5F4F0"
  cream-soft: "#FBFAF8"
  white: "#FFFFFF"
  border: "#E0DDD5"
  ink: "#1A1A1A"
  ink-soft: "#555555"
  ink-muted: "#8A8A8A"
  success: "#047857"
  warning: "#B45309"
  danger: "#DC2626"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontWeight: 500
    lineHeight: 1.02
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "#152D4C"
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.navy}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
  input-default:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 14px"
  card-default:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Akros

## Overview

**Creative North Star: "Horizonte Dourado"**

Akros combina orientação humana e precisão operacional. Superfícies claras, azul profundo e dourado pontual fazem cada etapa parecer uma travessia bem conduzida, não um labirinto burocrático.

Interface refinada e segura: riqueza reservada para títulos, momentos de progresso e ações decisivas; operação diária permanece legível, silenciosa e objetiva. A composição usa camadas sutis, nunca transparências decorativas ou efeitos que obscureçam informação.

**Key Characteristics:**

- Azul profundo institucional como âncora de confiança.
- Dourado de Conquista para progresso, orientação e ação prioritária.
- Fraunces editorial em títulos; Inter funcional no trabalho diário.
- Cartões claros, bordas quentes e profundidade baixa.
- Movimento curto que esclarece estado, respeitando redução de movimento.

## Colors

Paleta quente e institucional: navy mantém autoridade, cream reduz atrito visual e dourado guia sem ocupar tela inteira.

### Primary

- **Azul Profundo Institucional** (`#0D2240`): navegação, títulos, superfícies de confiança e botão primário.
- **Azul de Horizonte** (`#050F1E`): hero e fundos de maior contraste.
- **Azul de Abertura** (`#EAF0F8`): hover, estado ativo claro e superfícies auxiliares.

### Secondary

- **Dourado de Conquista** (`#C6A254`): CTAs, marcadores de progresso, foco e detalhes de orientação.
- **Dourado Velado** (`#FBF6EB`): suporte suave a estados e badges dourados.

### Neutral

- **Cream de Documento** (`#F5F4F0`): fundo de app e página.
- **Cream de Respiro** (`#FBFAF8`): superfícies de baixa ênfase.
- **Branco de Superfície** (`#FFFFFF`): cartões, campos, cabeçalhos e painéis.
- **Borda Mineral** (`#E0DDD5`): delimitação leve entre blocos.
- **Ink** (`#1A1A1A`), **Ink Suave** (`#555555`) e **Ink Atenuado** (`#8A8A8A`): texto por hierarquia.

### Named Rules

**The Guided Gold Rule.** Dourado marca direção, conquista e decisão; nunca vira cor-base ou enfeite repetitivo.

**The Clear Surface Rule.** Transparência pode suavizar cabeçalho ou sobrepor imagem, mas conteúdo operacional sempre lê sobre superfície estável.

## Typography

**Display Font:** Fraunces, Georgia, serif

**Body Font:** Inter, -apple-system, BlinkMacSystemFont, sans-serif

**Character:** Fraunces dá gravidade humana a marcos e narrativas. Inter sustenta leitura rápida de status, listas, formulários e operação.

### Hierarchy

- **Display** (500, `2.9rem` a `3.75rem`, `1.02–1.05`): hero, números de impacto e títulos de marco.
- **Headline** (500–600, `2rem` a `2.5rem`, `1.15–1.2`): seções públicas e títulos de superfície.
- **Title** (600, `1.125rem` a `1.5rem`, `1.3–1.5`): cartões, painéis e contexto de trabalho.
- **Body** (400, `1rem`, `1.6`): explicação e texto de leitura; limitar cópia longa por container, não por ornamento.
- **Label** (600, `0.75rem`, `0.08em`, caixa alta quando categorizador): eyebrows, grupos de navegação e metadados de navegação.

### Named Rules

**The Two Voices Rule.** Fraunces abre direção e significado; Inter entrega informação e ação. Não introduzir terceira família tipográfica.

## Layout

Site público usa containers de `max-w-6xl` com `24px` laterais e seções de `80–112px` verticais. Hero trabalha com grid de 12 colunas no desktop e pilha única no mobile; cartões de estatística e conteúdo quebram de uma coluna para duas, três ou doze conforme tarefa.

Portal e admin usam sidebar fixa de `256px` em `lg`, barra superior de `72px` e área de trabalho com `20px`/`28px` em telas pequenas e `32px`/`36px` em desktop. Em mobile, navegação vira drawer; tabelas e kanban preservam uso com scroll horizontal quando necessário. Ritmo predominante: `8px`, `12px`, `16px`, `20px`, `24px`, `32px`.

## Elevation & Depth

Camadas sutis. Fundo cream, cartão branco e borda mineral definem estrutura; sombra só reforça painel elevado, popover, hover ou hero. Sem glassmorphism.

### Shadow Vocabulary

- **Subtle** (`0 1px 3px rgba(13, 34, 64, 0.08)`): cartões e controles em repouso.
- **Elevated** (`0 10px 25px rgba(13, 34, 64, 0.12)`): stats flutuantes, popovers e superfícies prioritárias.
- **Gold** (`0 4px 14px rgba(198, 162, 84, 0.25)`): CTA dourado e progresso de maior importância.

### Named Rules

**The Quiet Lift Rule.** Sombra confirma hierarquia ou interação; não cria profundidade cenográfica.

## Shapes

Geometria macia e contida: controles usam `8px`, itens de navegação `12px`, cartões e painéis `16px`. Pills ficam reservadas para badges, indicadores e avatares. Bordas de `1px` em Borda Mineral organizam informação antes de qualquer sombra.

## Components

### Buttons

Refinados e seguros, com altura mínima de `44px` no tamanho médio.

- **Shape:** `8px` de raio, peso médio e tracking apertado.
- **Primary:** navy com texto branco; hover navy-700, ativo navy-800 e sombra sutil.
- **Gold:** Dourado de Conquista com texto navy; reservado a ação importante.
- **Secondary / Ghost:** branco com borda mineral ou transparente; hover usa cream/azul claro.
- **Focus:** anel dourado de `2px`, deslocado `2px`.

### Chips

- **Style:** pill de `9999px`, `10px` horizontal e `4px` vertical; cream, gold, navy e cores semânticas comunicam estado.
- **State:** cor contextual deve manter texto escuro e legível; não usar chip como CTA principal.

### Cards / Containers

- **Corner Style:** `16px` para cartão; `12px` para subitem.
- **Background:** branco sobre cream.
- **Shadow Strategy:** sutil em repouso; elevado em painel flutuante ou interação priorizada.
- **Border:** `1px` Borda Mineral, geralmente primeiro sinal de separação.
- **Internal Padding:** `20px` a `24px`, conforme densidade da tarefa.

### Inputs / Fields

- **Style:** altura `44px`, fundo branco, borda mineral, raio `8px`, padding horizontal `14px`.
- **Focus:** borda e anel dourados; erro muda borda para vermelho e anel para vermelho suave.
- **Disabled:** cream e Ink Atenuado; nunca esconder estado com baixa opacidade apenas.

### Navigation

Site usa cabeçalho branco translúcido discreto, borda inferior e links Inter. Portal/admin usam sidebar navy, texto branco atenuado e item ativo com branco translúcido, borda anelar leve e sombra sutil. Em mobile, ambas viram menu ou drawer explícito.

### Progress

Barra de `8px`, pill, base cream e preenchimento dourado. Percentual, quando exibido, usa navy e fica próximo do rótulo.

## Do's and Don'ts

### Do:

- **Do** usar Azul Profundo Institucional para estrutura, navegação e decisões estáveis.
- **Do** reservar Dourado de Conquista para foco, progresso e CTA prioritário.
- **Do** manter cartões claros, borda mineral e sombras de baixa intensidade.
- **Do** usar Fraunces somente para significado, marco ou narrativa; Inter para operação.
- **Do** respeitar `prefers-reduced-motion` e usar transições curtas (`150–300ms`) para mudança de estado.

### Don't:

- **Don't** usar neon, glow excessivo ou gradientes decorativos como linguagem padrão.
- **Don't** usar glassmorphism em conteúdos operacionais.
- **Don't** transformar a interface em visual jurídico frio, monocromático ou intimidatório.
- **Don't** usar dourado como fundo dominante ou substituir navy em elementos estruturais.
- **Don't** adicionar terceira fonte, raios aleatórios ou sombras pesadas.
