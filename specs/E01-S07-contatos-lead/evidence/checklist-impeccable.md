# Checklist Impeccable — Contatos + Form Lead (E01-S07)

## 1. Spacing & Alignment
- [x] Grid 2 colunas (canais / form) com proporção 1:1.3 — form recebe mais espaço (foco de conversão)
- [x] Canais de contato como cards clicáveis com ícone+label+valor, gap consistente

## 2. Typography
- [x] Hierarquia clara: eyebrow (label) → h1 (Fraunces) → subtitle (corpo)
- [x] Labels de canal em uppercase pequeno (hierarquia terciária), valor em peso médio

## 3. Color & Contrast
- [x] Canal hover: borda gold sutil + fundo gold-50/30 (feedback claro sem exagero)
- [x] Ícones de canal em navy-50/navy (consistente com paleta)

## 4. Interaction & Animation
- [x] Botão de submit com estado loading nativo (spinner do Button) + texto muda p/ "Enviando..."
- [x] Proteção duplo-envio: `if (submitting) return` no início do handler + botão disabled
- [x] Checkbox com transição de estado (check aparece/some via opacity)
- [x] Estado de sucesso substitui o form (não é só um toast — confirmação clara e persistente)

## 5. Consistency & Details
- [x] Reusa Input/Select/Textarea/Checkbox/Button do design system — zero estilo ad-hoc
- [x] Validação inline por campo (erro abaixo do campo, cor vermelha consistente com o resto do DS)

## i18n
- [x] Todo texto via t() — namespaces "site" (conteúdo da página) + "common" (mensagens de form)
- [x] pt-BR e EN completos

## Acessibilidade
- [x] noValidate no form (validação própria via Zod, evita popups nativos inconsistentes)
- [x] aria-invalid propagado pelos componentes do DS quando há erro
- [x] Canais de contato são links reais (mailto/tel/wa.me/calendly) navegáveis por teclado

## Peer Review
- [ ] Revisão visual em browser real — pendente (extensão Chrome indisponível nesta sessão)

## Gate executável
- 2 testes vitest cobrindo AC-1 (validação rejeita inválido) e AC-2/AC-3 (lead criado no
  estágio "lead", visível via `useMockDb.getState().leads`) — ambos verdes.
