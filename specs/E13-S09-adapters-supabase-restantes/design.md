---
name: DESIGN
description: Ordem de migração, o que crm.leads destrava e como o mapa de id temporário morre — E13-S09.
story: E13-S09
alwaysApply: false
---

# design.md — E13-S09 Sair do mock: os 4 contextos restantes

**Tier:** arquitetural. Mesma classe de E13-S08 e fecha dois `P0`.

## O nó: `crm.leads` não existe

E13-S08 deixou 6 telas do admin em mock não por escopo, mas por dependência: `KanbanPage`,
`ProgramasPage`, `ConciliacaoPage`, `FilaRevisaoPage`, `AdminAgendaPage` e `AdminDashboardPage`
dependem de `criarClienteAPartirDeLead`, e não há tabela de lead. O adapter Supabase lança
`Error("criarAPartirDeLead ainda não suportado")` de propósito.

Ou seja: **`crm.leads` vem primeiro**, senão a migração para nas mesmas 6 telas de novo.

## O mapa de id: quando ele morre

`SupabaseClienteRepository` tem `MAPA_ID_REAL_PARA_MOCK`, `SPEC_DEVIATION` documentada. Ele existe
porque `crm.clientes.id` é uuid real enquanto jornada/documentos/pagamentos/comunicação ainda
falam os ids string do mock (`"cliente-carlos"`).

**Ele deve ser deletado, não substituído.** No instante em que os 4 contextos passarem a ler do
banco, todo mundo fala uuid e o mapa vira código morto. Um mapa que sobrevive à migração é o começo
de uma camada de tradução permanente — o custo que essa story existe para evitar.

## Ordem

```
1. crm.leads (schema + RLS + adapter)   ← destrava as 6 telas presas
2. jornada        ← maior volume de tela; DashboardPage e JornadaPage
3. documentos     ← depende de jornada (requisito por fase)
4. pagamentos     ← independente
5. comunicacao    ← maior volume de dado (JSONB de thread)
6. deletar MAPA_ID_REAL_PARA_MOCK e as 5 personas de mocks/personas.ts do caminho fora-demo
```

Uma story-filha por contexto, como foi de E13-S01 a S05 — o padrão já provou que funciona e mantém
cada passo reversível.

## A store, e por que ela não pode só ser filtrada

A tentação é filtrar `useMockDb` por `cliente_id`. Não resolve: o dado já está na memória quando o
filtro roda. O que fecha o `P0` é **não carregar** — fora do modo demo, `useMockDb` não é
inicializada.

Isso vira invariante verificável: um teste que monta a aplicação com `VITE_DEMO_MODE=false` e
afirma que a store está vazia. Sem esse teste, a regressão volta na primeira tela que alguém
esquecer de migrar.

## Risco conhecido: a armadilha de hooks

E13-S08 encontrou um crash real ao migrar `useClienteAtivo`: com o dado vindo assíncrono, a
primeira renderização tinha `cliente === undefined` e o early return pulava dois hooks — "Rendered
more hooks than during the previous render", aplicação inteira caindo.

Toda tela migrada aqui corre o mesmo risco. Regra: **nenhum hook depois de early return** nas telas
tocadas, auditado tela a tela e não por amostragem. O `ErrorBoundary` de E15-S01 agora contém o
estrago, mas conter não é consertar.


---

## Revisão de 2026-08-31 — a decomposição por contexto está errada

O plano acima dizia "uma story-filha por contexto, como foi de E13-S01 a S05". Ao executar, medi o
acoplamento real de tela → entidade. Duas coisas quebram a premissa.

### 1. Cinco entidades usadas pelo admin não têm tabela nenhuma

| Entidade do mock | Tabela real |
|---|---|
| `propostas` | **não existe** |
| `integracoes` | **não existe** |
| `contasAgenda` | **não existe** |
| `contasCanal` | **não existe** |
| `equipeAkros` | **não existe** |

E13-S01..S07 criou 10 schemas, e nenhum cobre estas. Enquanto elas não existirem, o AC-3 ("a
store fictícia não é carregada fora do modo demo") é **inalcançável**: `ConfiguracoesPage` sozinha
depende de quatro delas. Migrar "os 4 contextos restantes" não fecha o `P0`, porque o `P0` não é
sobre 4 contextos — é sobre a store inteira sair do ar.

### 2. As telas não respeitam a fronteira de contexto

Medido por leitura de `useMockDb` em cada arquivo:

| Tela | Entidades que lê |
|---|---|
| `AdminDashboardPage` | clientes, documentos, eventosComunicacao, jornadas, leads, pagamentos, reunioes — **7** |
| `AdminAgendaPage` | clientes, integracoes, leads, reunioes, transcricoes — 5 |
| `ConfiguracoesPage` | contasAgenda, contasCanal, equipeAkros, integracoes — 4 |
| `PortalLayout` | documentos, eventosComunicacao, pagamentos, reunioes — 4 |

`AdminDashboardPage` é nó terminal: só migra quando **todas as sete** forem reais. Nenhuma story
"de contexto" a alcança, porque ela não pertence a um contexto — ela cruza sete.

E a ligação é por id, não por import: `crm.clientes.id` é uuid e `mocks` fala `"cliente-carlos"`.
Enquanto uma ponta for real e a outra mock, o join simplesmente não casa. É por isso que ligar o
`di.ts` de uma entidade isolada produz **estado partido**, verificado ao vivo com `leads`.

### Decomposição correta

Não é por bounded context. É por **onda**, ordenada por dependência de id:

```
Onda 0 — tabelas que faltam (bloqueia tudo)
  crm.propostas · configuracoes.integracoes · configuracoes.contas_agenda
  configuracoes.contas_canal · configuracoes.equipe

Onda 1 — entidades-folha, que ninguém referencia por id
  programas · integracoes · contas_* · equipe · transcricoes

Onda 2 — entidades ancoradas em cliente_id
  jornadas · documentos · pagamentos · reunioes · conversas · eventos · propostas
  (a ponte de id só pode cair quando TODAS estiverem reais)

Onda 3 — telas que cruzam contexto
  AdminDashboardPage · AdminAgendaPage · PortalLayout · Cliente360 · OperacaoPage

Onda 4 — desligar a store e deletar MAPA_ID_REAL_PARA_MOCK
```

Dentro de cada onda a regra continua sendo a do achado anterior: **adapter + hooks + telas na
mesma entrega**, nunca o `di.ts` sozinho.
