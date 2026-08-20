---
name: SPEC
description: Documento de proposta em HTML — visualização formatada e imprimível com a identidade visual da Akros.
story: E03-S06
tier: pequeno
alwaysApply: false
---

# SPEC — Documento de proposta (E03-S06)

## User Story
Como **admin**, quero **ver a proposta comercial como um documento formatado, com a identidade
visual da Akros**, para que **eu possa revisar e enviar/imprimir algo apresentável ao lead**, em
vez de só um card de lista.

## Contexto
Hoje `/admin/propostas` (E03-S04) só lista `Proposta` em cards — sem nenhuma visualização de
documento. `Proposta` ganha dois campos novos (`validoAte`, `itensEscopo`) para suportar um
documento completo. Nova rota `/admin/propostas/:id` renderiza o documento em página cheia,
estilo papel, usando a logo real (`/logo-akros.png`) e a paleta navy/gold/cream (skill
`impeccable`). Sem geração de PDF real nem envio por e-mail — "salvar como PDF" usa o print do
navegador (`window.print()`).

## Acceptance Criteria

### AC-1: Campos novos no formulário de nova proposta
```gherkin
Given /admin/propostas, modal "Nova proposta"
When  preencho o formulário
Then  vejo um campo de data "Válida até"
And   vejo uma lista dinâmica de itens de escopo, com botão para adicionar item e remover cada
      item já adicionado
And   preciso de pelo menos 1 item de escopo pra criar a proposta
```

### AC-2: Acessar o documento
```gherkin
Given uma proposta existente na lista de /admin/propostas
When  clico em "Ver documento"
Then  navego para /admin/propostas/:id e vejo o documento formatado da proposta
```

### AC-3: Conteúdo do documento
```gherkin
Given o documento de uma proposta em /admin/propostas/:id
When  a página carrega
Then  vejo: logo da Akros, cabeçalho institucional (nome + tagline), nome do lead/cliente, tipo
      de visto, data de emissão (criadoEm) e validade (validoAte), o texto de escopo, a lista de
      itens de escopo, o valor formatado em destaque (Intl.NumberFormat por moeda), as condições
      de pagamento, e um rodapé
```

### AC-4: Imprimir / salvar como PDF
```gherkin
Given o documento aberto
When  clico em "Imprimir / Salvar PDF"
Then  aciona window.print(); o menu/topo do admin (sidebar, header) não aparece na impressão —
      só o documento
```

### AC-5: Voltar
```gherkin
Given o documento aberto
When  clico em "Voltar"
Then  retorno para /admin/propostas
```

### AC-6: Proposta inexistente
```gherkin
Given um id de proposta que não existe
When  acesso /admin/propostas/:id
Then  vejo uma mensagem de "proposta não encontrada" (sem crash)
```

## Out of Scope
- Geração de PDF real no servidor / biblioteca de PDF — usa só `window.print()` do navegador.
- Envio por e-mail do documento.
- Assinatura digital da proposta (diferente de `SolicitacaoAssinatura` do módulo documentos).
- Visualização da proposta no portal do cliente (fica pra story futura, se necessário).
- i18n do documento — segue o padrão hardcoded em PT-BR já usado em `PropostasPage.tsx`
  (débito pré-existente, não introduzido aqui).

## Notas de implementação
- `crm/domain/types.ts`: `Proposta.validoAte: string` (ISO date), `Proposta.itensEscopo: string[]`.
- `mocks/propostas.ts` e `store.ts` (`criarProposta`): incluir os 2 campos novos.
- Nova rota em `app/router.tsx`: `{ path: "propostas/:id", element: <PropostaDocumentoPage /> }`
  dentro de `/admin`.
- `crm/interfaces/PropostaDocumentoPage.tsx` (novo componente): página estilo papel A4
  (`max-w-[210mm] mx-auto bg-white shadow-elevated`), logo `/logo-akros.png`, paleta navy/gold/
  cream, botões "Voltar" (`Link`) e "Imprimir / Salvar PDF" (`window.print()`) com `print:hidden`.
- `shared/layout/AdminLayout.tsx`: `print:hidden` no `<aside>` (sidebar) e `<header>` (topbar) pra
  impressão sair limpa em qualquer página admin.
- `crm/interfaces/PropostasPage.tsx`: botão "Ver documento" (`Link to={`/admin/propostas/${p.id}`}`)
  em cada card; `NovaPropostaModal` ganha campo de data + lista dinâmica de itens de escopo.
