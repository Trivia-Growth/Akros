---
name: checklist-impeccable-E01-S01-homepage-evidence
description: Checklist impeccable preenchido para a story.
alwaysApply: false
---

# Checklist Impeccable — Homepage (E01-S01)

## 1. Spacing & Alignment
- [x] Seções com padding vertical generoso e escalonado (py-12/20/24/32) — hero mais respirado que seções internas
- [x] Grid responsivo com gaps consistentes (gap-5/6/8) por densidade de conteúdo

## 2. Typography
- [x] Fraunces (display) nos headings, Inter no corpo — hierarquia clara hero (4xl→6xl) → section (3xl) → body
- [x] Eyebrow labels com tracking-label (uppercase + letter-spacing) para hierarquia terciária

## 3. Color & Contrast
- [x] Alternância navy/branco/cream entre seções cria ritmo visual (hero navy → stats branco → categorias cream → NIW navy-50 → sobre branco → depoimentos cream-200 → CTA navy)
- [x] Gold reservado para destaque (CTA principal, badges, ícones) — não usado indiscriminadamente

## 4. Interaction & Animation
- [x] Hover states herdados do Button/Card do design system (E00-S02)
- [x] Sem animação decorativa desnecessária — foco em conteúdo e legibilidade

## 5. Consistency & Details
- [x] Ícones únicos (lucide-react): GraduationCap, Trophy, Church, FileCheck, Quote
- [x] Círculos decorativos sutis no hero (border, não fill) ecoam o padrão do manual EB-2 NIW original
- [x] Depoimentos com Avatar (iniciais) — consistente com design system

## i18n
- [x] Todo texto via t() — namespace "site", chaves home.*
- [x] pt-BR completo; EN traduzido integralmente (não placeholder)

## Peer Review
- [ ] Revisão visual em browser real — pendente (extensão Chrome indisponível nesta sessão)

## Conteúdo
- Fiel ao site real (akrosimmigration.com): headline, stats, 4 categorias, EB-2 NIW, CEO Natalia Luz,
  3 depoimentos (via container.conteudo — não hardcoded na UI, injetado pelos mocks/blog.ts)
