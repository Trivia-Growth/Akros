---
name: checklist-impeccable-E01-S02-quem-somos-evidence
description: Checklist impeccable preenchido para a story.
alwaysApply: false
---

# Checklist Impeccable — Quem Somos, Vistos, Metodologia, Serviços, Blog (E01-S02/S03/S04/S05/S06)

Checklist consolidado — as 5 páginas seguem o mesmo padrão visual estabelecido em E01-S01/E00-S02.

## 1. Spacing & Alignment
- [x] Todas as páginas usam mx-auto + max-w-* consistente com a densidade de conteúdo
  (max-w-3xl metodologia/lista, max-w-4xl blog/quem-somos, max-w-5xl vistos/serviços)
- [x] Timeline da metodologia com conector vertical (linha) entre os 7 passos — reforça sequência

## 2. Typography
- [x] Padrão eyebrow → h1 Fraunces → subtitle mantido em todas as páginas
- [x] Blog post: whitespace-pre-line + leading-relaxed para legibilidade de texto longo

## 3. Color & Contrast
- [x] Vistos: card EB-2 NIW com destaque (border-gold-300 + bg-gold-50/30) — carro-chefe visível
- [x] Filtro de vistos (Todos/Imigrantes/Não-imigrantes): estado ativo navy sólido, inativo neutro

## 4. Interaction & Animation
- [x] Filtro de vistos: toggle instantâneo sem reload, sem animação desnecessária
- [x] Cards de serviço/blog com hover:shadow-elevated (feedback de clicável)

## 5. Consistency & Details
- [x] Reusa Card/Badge/Button/Avatar do design system em todas as 5 páginas — zero CSS ad-hoc
- [x] Ícones únicos (lucide): ShieldCheck/Users/HeartHandshake (valores), GraduationCap/Trophy/
  Church/FileCheck (serviços) — mesmo set da homepage

## i18n
- [x] site.json: aboutPage, visasPage, methodologyPage, servicesPage, blogPage — pt-BR e EN
  completos (validados via JSON.parse, sem erros de sintaxe)

## Conteúdo (fidelidade ao real)
- [x] Quem Somos: Natalia Luz + Dra. Denise Sarchiapone (advogada parceira) reais
- [x] Vistos: 12 tipos reais (5 imigrante + 7 não-imigrante) coletados de akrosimmigration.com
- [x] Metodologia: 7 passos reais do site, com nota explícita ligando passos 4-7 à jornada do portal
- [x] Blog: 4 posts com tópicos reais do site (requisitos EB-2 NIW, onde solicitar, guia de
  residência, Green Card sem patrocínio)

## Peer Review
- [ ] Revisão visual em browser real — pendente (extensão Chrome indisponível nesta sessão)

## Gates
- typecheck, build, lint (biome) verdes. 23 testes vitest (regressão, sem novo teste — páginas
  são majoritariamente apresentacionais/conteúdo, sem lógica de domínio nova a testar).
