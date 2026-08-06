---
name: SPEC
description: Homepage institucional (recriação com layout premium).
story: E01-S01
tier: pequeno
alwaysApply: false
---

# SPEC — Homepage (E01-S01)

## User Story
Como **visitante**, quero **uma homepage bonita que apresente a Akros e me convença**, para que **eu
entenda os serviços e vire um lead**.

## Contexto
Recriar a home de akrosimmigration.com com **layout mais bonito**, **mesmas informações**. Conteúdo
real (ver `docs/PROJECT.md`). i18n PT-BR/EN. impeccable obrigatório.

## Seções (ordem)
1. **Hero** — headline "Elevando Talentos ao Topo Global", subheadline "Facilitamos seu sonho de
   viver nos EUA com soluções de imigração personalizadas", CTA primária (agendar/consulta) +
   secundária (conhecer vistos). Visual premium com identidade navy/gold.
2. **Prova social / stats** — +300 famílias atendidas, anos de experiência, satisfação.
3. **Categorias de serviço** — Profissionais Qualificados, Atletas & Artistas, Trabalhadores
   Religiosos, Legalização (cards).
4. **Destaque EB-2 NIW** — carro-chefe: Green Card sem oferta de emprego.
5. **Sobre a CEO** — Natalia Luz (advogada PUC/SP, Green Card 2020 por habilidade excepcional).
6. **Depoimentos** — 3 depoimentos (aprovação I-140 rápida, profissionalismo, transparência).
7. **CTA de conversão** — formulário de lead (ou link para /contatos) — ver E01-S07.
8. **Footer** — nav, contatos (hello@ / +1 469..), redes sociais, política/termos.

## Acceptance Criteria

### AC-1: Hero renderiza com identidade e CTAs
```gherkin
Given  a homepage
When   acesso /
Then   vejo o hero com headline, subheadline e 2 CTAs
And    a identidade visual (navy/gold/cream, logo) está aplicada
```

### AC-2: Todas as seções presentes com conteúdo real
```gherkin
Given  a homepage
When   rolo a página
Then   vejo stats (+300 famílias), 4 categorias de serviço, destaque EB-2 NIW,
       sobre a CEO Natalia Luz, 3 depoimentos, CTA de conversão e footer com contatos
And    o conteúdo corresponde ao negócio real da Akros (sem inventar serviços/dados)
```

### AC-3: i18n
```gherkin
Given  a homepage
When   troco o idioma para EN
Then   os textos da home mudam para inglês (via t(); EN pode ser resumido marcado [EN-TODO] onde faltar)
```

### AC-4: Responsivo e impeccable
```gherkin
Given  a homepage em mobile e desktop
When   avalio
Then   o layout é responsivo (sem scroll horizontal), imagens escalam
And    o checklist impeccable passa (spacing/typography/color/interaction/consistency)
```

### AC-5: CTA leva à captação
```gherkin
Given  a homepage
When   clico na CTA de conversão / preencho o form embutido
Then   sou levado ao fluxo de lead (E01-S07) que cria um Lead no kanban
```

## Out of Scope
- Páginas internas (E01-S02..S06). Blog real. Backend de envio (é mock via porta LeadRepository).

## Notas de implementação
- Feature `site`. Textos em `locales/*/site.json`. Imagens/logos de `Akros identidade/`.
- Depoimentos e stats podem vir de `mocks/` (conteúdo institucional). Números reais quando conhecidos.
- Animações sutis de entrada (respeitar reduced-motion).
