---
name: SPEC
description: Layout shells (público/portal/admin) + routing das 3 frentes.
story: E00-S05
tier: pequeno
alwaysApply: false
---

# SPEC — Layout shells + routing (E00-S05)

## User Story
Como **usuário**, quero **navegar entre site, portal e admin com layouts próprios**, para que **cada
frente tenha sua estrutura e navegação**.

## Acceptance Criteria

### AC-1: Três shells
```gherkin
Given  shared/layout/
When   inspeciono
Then   existem PublicLayout (header com nav do site + seletor idioma + footer),
       PortalLayout (sidebar/topbar do cliente), AdminLayout (sidebar do admin)
And    cada shell usa o design system e é responsivo
```

### AC-2: Rotas públicas
```gherkin
Given  o router
When   acesso /
Then   vejo a Homepage (placeholder até E01-S01) dentro do PublicLayout
And    existem rotas /quem-somos /servicos /metodologia /vistos /blog /contatos
```

### AC-3: Rotas do portal
```gherkin
Given  o router
When   acesso /portal
Then   vejo o dashboard do cliente (placeholder até E02-S01) dentro do PortalLayout
And    existem rotas /portal/jornada /portal/documentos /portal/pagamentos /portal/agenda /portal/perfil
```

### AC-4: Rotas do admin
```gherkin
Given  o router
When   acesso /admin
Then   vejo o painel (placeholder até E03) dentro do AdminLayout
And    existem rotas /admin/leads /admin/clientes /admin/jornadas /admin/propostas /admin/comunicacao
```

### AC-5: Navegação e estado ativo
```gherkin
Given  qualquer shell
When   navego pelos itens de menu
Then   o item ativo é destacado
And    o seletor de idioma (E00-S03) está presente em todos os shells
And    não há reload de página (SPA)
```

## Out of Scope
- Conteúdo real das páginas (vem nas features). Aqui só shells + rotas + placeholders.
- Autenticação real (mock/impersonação vem em E05).

## Notas de implementação
- React Router (data router). Layout routes aninhadas por frente.
- Placeholders devem deixar claro "conteúdo em E0X-SYY".
- A barra de demo/impersonação (E05) será montada sobre estes shells.
