---
name: TASKS
description: Decomposição do i18n.
story: E00-S03
---

# TASKS — i18n (E00-S03)

| Task | AC | Gate |
|------|-----|------|
| T-1 Configurar react-i18next (pt-BR default, en, detecção) | AC-1 | init sem erro; fallback pt-BR |
| T-2 Estrutura de locales + namespaces | AC-3 | arquivos common/site/portal/admin nos 2 lng |
| T-3 Seletor de idioma (persistência localStorage) | AC-2 | troca instantânea + persiste |
| T-4 Convenção sem-hardcoded + lint/checagem | AC-4 | revisão sem literais visíveis |

## Ordem
T-1 → T-2 → T-3 → T-4
