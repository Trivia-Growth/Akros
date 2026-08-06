---
name: adr-0001-i18n-react-i18next
description: Decisão sobre a stack de internacionalização (PT-BR + EN).
alwaysApply: false
---

# ADR-0001 — Internacionalização com react-i18next

**Status:** Aceito
**Data:** 2026-08-06
**Decisores:** Trívia Studio (arquitetura), Akros (requisito de bilinguismo)
**Relacionados:** docs/ARCHITECTURE.md, spec E00-S03

## Contexto
A plataforma precisa ser bilíngue **PT-BR (default) + Inglês** desde o início (público brasileiro
imigrando para os EUA, com abertura a clientes internacionais). Precisamos de solução madura,
com namespaces por feature, troca de idioma em runtime e zero texto hardcoded.

## Decisão
Usar **react-i18next** com:
- Locales `pt-BR` (default/fallback) e `en`.
- **Namespaces por feature:** `common`, `site`, `portal`, `admin` (+ por feature se necessário).
- Arquivos de tradução em `apps/web/src/shared/i18n/locales/<lng>/<namespace>.json`.
- Toggle de idioma persistido em `localStorage`.
- Detecção inicial: `localStorage` → navegador → fallback `pt-BR`.
- **Regra dura:** nenhum texto literal em componentes — sempre `t('ns:chave')`.

## Alternativas consideradas
| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| react-i18next (escolhida) | Maduro, namespaces, plurais, interpolação, ecossistema | Config inicial | Padrão de mercado, cobre tudo |
| react-intl (FormatJS) | Bom com ICU messages | Mais verboso, menos ergonômico p/ namespaces | Overkill aqui |
| Solução caseira (Context) | Zero dep | Reinventa plural/fallback/lazy | Não vale o risco |

## Consequências
**Positivas:**
- Troca de idioma instantânea; conteúdo institucional traduzível; base pronta p/ novos idiomas.

**Negativas / trade-offs aceitos:**
- Todo conteúdo (inclusive institucional longo: vistos, metodologia) precisa existir nos 2 idiomas
  — nos mocks, EN pode começar como tradução resumida/placeholder marcado.
