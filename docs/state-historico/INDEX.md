---
name: state-historico-index
description: Índice do histórico arquivado de docs/STATE.md — 1 linha por período, para achar rápido sem ler tudo.
alwaysApply: false
---

# Índice — histórico do STATE.md

> `docs/STATE.md` guarda só a seção `## Agora` (estado corrente + bloqueios). Sessão encerrada é
> arquivada aqui por mês, e ganha uma linha nesta tabela. Cada arquivo é `alwaysApply: false` —
> nunca entra no carregamento automático de sessão.

| Período | Arquivo | O que tem |
|---------|---------|-----------|
| 2026-08 | `docs/state-historico/2026-08.md` | Rodadas 1 e 2 (E00–E11, 47 stories mockadas), épico E12 (auth real via Supabase, ADR-0008/0009, matriz Playwright) e épico E13 (10 schemas reais com RLS, `audit.*` append-only, primeiro adapter Supabase no frontend). |

## Como buscar
`grep -rn "termo" docs/state-historico/` acha rápido sem abrir cada arquivo. Puxe o arquivo do mês
só quando o `## Agora` do `STATE.md` não bastar.
