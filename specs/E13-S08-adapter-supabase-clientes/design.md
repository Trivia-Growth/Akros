---
name: DESIGN
description: Primeira troca de adapter mock→Supabase real (crm.clientes), escopo deliberadamente estreito.
story: E13-S08
alwaysApply: false
---

# design.md — E13-S08 Adapter Supabase real pra `clientes`

## O problema que redesenha o escopo: IDs incompatíveis

`crm.clientes.id` (E13-S01) é `uuid` real, gerado pelo Postgres. O mock usa strings literais
(`"cliente-carlos"`, `"cliente-renata"`) **hardcoded em 20+ lugares** — `mocks/documentos.ts`,
`mocks/pagamentos.ts`, `mocks/conversas.ts`, `mocks/emails.ts`, `mocks/personas.ts`, e 4 arquivos
de teste (`admin-actions.test.ts`, `comunicacao-actions.test.ts`,
`configuracoes-actions.test.ts`, `portal-actions.test.ts`) — não é uma constante única
referenciada, é valor duplicado. Trocar `MockClienteRepository` por um adapter real faria
`crm.clientes` devolver `id` = uuid, mas `jornada`/`documentos`/`pagamentos`/`comunicacao`
**continuam mock** (E13-S09+, ainda não migrados) e continuam esperando `"cliente-carlos"` pra
casar `clienteId`. Sem reconciliar isso, toda tela que cruza cliente com jornada/documentos
quebra.

**Duas saídas consideradas:**
1. Trocar os 20+ literais mock pro uuid real. Rejeitada: toca 4 arquivos de teste que validam
   invariante de negócio (não tema desta story), diff grande e barulhento pra uma mudança que é
   só de "endereço", não de comportamento.
2. **Escolhida:** mapeamento id-real ↔ id-mock **confinado dentro do novo adapter**
   (`SupabaseClienteRepository`), não vazado pro resto do app. Zero mudança em mock/teste
   existente.

## Mapeamento (temporário, documentado — SPEC_DEVIATION)

```ts
const MAPA_ID_REAL_PARA_MOCK: Record<string, string> = {
  "760facdf-37fa-4f41-8cef-9a79d673a2cf": "cliente-carlos",
  "8c360c7b-b645-4345-8f1b-0b7643c906ab": "cliente-renata",
};
```

Leitura: linha vem do Postgres com `id` = uuid → adapter troca por `"cliente-carlos"` antes de
devolver ao app. Escrita (`atualizar(id, patch)`): app manda `id` = `"cliente-carlos"` → adapter
troca pelo uuid real antes do `UPDATE ... WHERE id = `. **Fecha** quando E13-S09+ migrar
jornada/documentos/pagamentos/comunicacao pra Supabase de verdade — nesse momento os dois lados
já usam uuid real e o mapa é deletado (não substituído por outra coisa).

## Escopo estreito de propósito

- **Migra:** `useClienteAtivo()` (portal, 1 cliente) e `Clientes360Page`/`Cliente360.tsx`
  (admin, lista + detalhe).
- **Não migra nesta story:** `KanbanPage`, `ProgramasPage`, `ConciliacaoPage`,
  `FilaRevisaoPage`, `AdminAgendaPage`, `AdminDashboardPage` — continuam lendo
  `useMockDb((s) => s.clientes)` mesmo fora do modo demo. Não é falha: `criarClienteAPartirDeLead`
  (conversão de lead) e `crm.leads` não existem no schema ainda (ROADMAP), então o fluxo de
  criação de cliente **tem** que continuar mock por enquanto — misturar um pedaço real com um
  fluxo de criação mock geraria inconsistência pior que manter tudo mock nessas 6 telas. Ficam
  como follow-up (E13-S09, junto da migração de jornada/documentos/pagamentos).
- **Sem Realtime:** lista de clientes é buscada uma vez (`useEffect` no mount) + `refetch()`
  manual depois de mutação própria. Suficiente pra um operador só (Lucas) testando; múltiplos
  admins editando ao mesmo tempo sem ver a mudança um do outro é limitação aceita, documentada.

## Cliente Supabase no front (`shared/supabase/client.ts`)

Primeira vez que `@supabase/supabase-js` entra no bundle do front (E12-S02 deliberadamente não
instalou — só Edge Functions via `fetch`). Config por ADR-0008: `persistSession: false`,
`autoRefreshToken: false`, `detectSessionInUrl: false`, `accessToken` como callback lendo o
token em memória do `useSessaoStore` (nunca `localStorage`).

## Fluxo de leitura/escrita

```
container.clientes.listar()          -- reactivo? não. fetch on-demand + refetch manual.
  └─ SupabaseClienteRepository (!isDemoMode)
       └─ supabase.from("clientes").select() [schema crm, RLS decide as linhas]
       └─ mapeia uuid → id mock antes de devolver

container.clientes.atualizar(id, patch)
  └─ mapeia id mock → uuid real
  └─ supabase.from("clientes").update(patch).eq("id", uuidReal)
```

## Fora de escopo
Realtime, `criarAPartirDeLead` de verdade (fica best-effort/não exercitado pela UI ainda),
migrar as 6 telas restantes (E13-S09), `crm.leads`.
