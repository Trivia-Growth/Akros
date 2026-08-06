---
name: TASKS
description: Decomposição dos shells + routing.
story: E00-S05
---

# TASKS — Layout + Routing (E00-S05)

| Task | AC | Gate |
|------|-----|------|
| T-1 PublicLayout (header nav + idioma + footer) | AC-1,AC-5 | shell renderiza responsivo |
| T-2 PortalLayout (sidebar/topbar) | AC-1 | shell renderiza |
| T-3 AdminLayout (sidebar) | AC-1 | shell renderiza |
| T-4 Router com rotas públicas + placeholders | AC-2 | rotas do site navegam |
| T-5 Rotas do portal + placeholders | AC-3 | rotas /portal navegam |
| T-6 Rotas do admin + placeholders | AC-4 | rotas /admin navegam |
| T-7 Item ativo + SPA sem reload | AC-5 | destaque ativo; sem reload |

## Ordem
T-4 base → T-1/T-2/T-3 shells → T-5/T-6 → T-7
