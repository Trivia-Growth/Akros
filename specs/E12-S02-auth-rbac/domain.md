---
name: DOMAIN
description: Linguagem ubíqua e tipos do bounded context sessao (identidade/autenticação).
story: E12-S02
alwaysApply: false
---

# domain.md — `sessao` (identidade e autenticação)

Novo bounded context — não é dado de negócio de imigração, é a fundação de identidade que os
outros 8 contextos (`ARCHITECTURE.md`) passam a depender para saber "quem está pedindo isso". Termos
adicionados a `docs/glossary.md`.

## Linguagem ubíqua

- **Papel:** `"cliente" | "admin"`. Nunca "role" em código novo — já existe `Papel` como tipo em
  `features/demo/application/useDemoSession.ts` (`PapelAtivo`); este contexto reaproveita o nome
  `Papel`, sem sinônimo novo.
- **Sessão:** o par (access token em memória + dados do usuário autenticado). Não confundir com
  `DemoSessionState` (`useDemoSession`) — aquele é estado de impersonação do modo demo, sem nenhuma
  autenticação real por trás; este é a sessão de verdade.
- **Usuário (sessão):** não confundir com `UsuarioAkros` (`features/configuracoes/domain/types.ts`,
  time interno pra dono de conta conectada — Google/Microsoft) nem com `Cliente`
  (`features/crm/domain/types.ts`, o cliente de imigração). `UsuarioSessao` é a identidade que logou;
  se o papel for `cliente`, ela aponta pra um `Cliente` via `clienteId`.

## Agregados / tipos

```ts
type Papel = "cliente" | "admin";

interface UsuarioSessao {
  id: string;          // user id do Supabase Auth
  email: string;
  papel: Papel;         // app_metadata.role
  clienteId?: string;   // app_metadata.cliente_id — só quando papel === "cliente"
}

interface Sessao {
  accessToken: string;
  expiresAt: number;
  usuario: UsuarioSessao;
}
```

Nenhum dos dois é persistido além da memória do módulo (`application/store.ts`) — ver ADR-0008.
Não há agregado "Usuário" com CRUD nesta story: os dois usuários existentes são seed manual via
Management API (`product.md`), não há tela de cadastro nem tabela própria ainda (chega em E13).

## Fronteira com o resto do sistema

`sessao` não conhece `Cliente`, `Lead`, `Programa` nem nenhuma entidade de negócio — só devolve
`clienteId` como string opaca. Quem faz a ponte pra achar os dados daquele cliente no mock é
`features/demo/application/hooks.ts::useClienteAtivo()`, fora deste contexto. Isso preserva a regra
"features de domínios diferentes não se importam" — `sessao` não importa `crm`, e `crm`/`demo`
importam só o tipo `UsuarioSessao`/hook público de `sessao`, nunca `application/store.ts` interno.
