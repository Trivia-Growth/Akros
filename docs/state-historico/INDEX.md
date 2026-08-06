---
name: state-historico-index
description: Índice do histórico arquivado de docs/STATE.md — 1 linha por período, para achar rápido sem ler tudo.
alwaysApply: false
---

# Índice — histórico do STATE.md

> `docs/STATE.md` guarda só a sessão mais recente + bloqueios abertos. Quando crescer demais
> (regra de bolso: acima de ~500 linhas ou `alwaysApply: true` pesando no contexto de toda sessão),
> arquive o conteúdo antigo aqui por período, cronológico reverso, e registre 1 linha nesta tabela.

| Período | Arquivo | O que tem |
|---------|---------|-----------|
| — | — | Nenhuma rotação ainda. Primeira entrada aparece aqui quando `docs/STATE.md` for arquivado pela primeira vez. |

## Como buscar
`grep -rn "termo" docs/state-historico/` acha rápido sem abrir cada arquivo. Cada arquivo é
`alwaysApply: false` — só entra no contexto se puxado explicitamente (`/handoff`, ou pedindo pra
ler), nunca no carregamento automático de sessão.
