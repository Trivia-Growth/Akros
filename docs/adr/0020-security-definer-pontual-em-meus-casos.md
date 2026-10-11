---
name: adr-0020-security-definer-pontual-em-meus-casos
description: Exceção pontual ao ADR-0018 — crm.meus_casos() usa um helper interno SECURITY DEFINER, com search_path fixo e escopo travado ao próprio auth.uid(), para evitar autorreferência de RLS em crm.participantes.
alwaysApply: false
---

# ADR-0020 — SECURITY DEFINER pontual em `crm.meus_casos()`

> **ADRs são imutáveis.** Não edite este arquivo; se a decisão mudar, crie um ADR que o substitua.

**Status:** Aceito
**Data:** 2026-10-11
**Decisores:** Lucas Azevedo (Akros/Trívia Studio), a partir de revisão adversarial de subagente
**Relacionados:** ADR-0018 (participantes por papel), `audit.registrar_mudanca()` (0008, precedente
de SECURITY DEFINER no projeto), `supabase/migrations/0017_E03-S07_participantes_contratos.sql`

## Contexto

O ADR-0018 e `design-tecnico.md` §1.1 exigiram que `crm.meus_casos()`, `crm.meus_papeis()`,
`crm.tenho_papel()` e `crm.participo_do_caso()` **não** usassem `SECURITY DEFINER` — mesmo
critério de `crm.meu_cliente_id()` (0003), que roda com o privilégio de quem chama porque a RLS
da tabela consultada já decide o que a função enxerga, sem precisar de privilégio novo.

Esse critério presume que a tabela consultada **não** tem, ela mesma, uma policy que chama de
volta a mesma função — ou seja, presume ausência de autorreferência. Para `crm.clientes`
(consultada por `crm.meu_cliente_id()`), isso é verdade: a policy de `crm.clientes` é um predicado
direto (`auth_user_id = auth.uid()`), sem chamar função nenhuma.

Para `crm.participantes`, isso **não é verdade**. `crm.meus_casos()` consulta
`crm.participantes WHERE auth_user_id = auth.uid()`; e `crm.participantes` tem a policy
`participante_ve_participantes_do_caso`, que chama `crm.participo_do_caso()` → `crm.meus_casos()`
de volta. Uma revisão adversarial (subagente, 2026-10-11) apontou que a mitigação inicialmente
tentada — adicionar uma policy direta `participante_ve_a_propria_linha` como disjunto não-
recursivo, na esperança de que o Postgres resolva esse disjunto antes de precisar reavaliar o
disjunto recursivo — **não é garantida**: a detecção de "infinite recursion detected in policy for
relation" do Postgres acontece na fase de **rewrite/planejamento** da consulta (expansão estrutural
de RLS), não na avaliação de linha em tempo de execução — não há garantia documentada de que o
curto-circuito do `OR` entre policies permissivas evite essa expansão estrutural antes dela
disparar. A policy direta continua correta e necessária (é exigência própria do desenho: o
participante precisa ver a própria linha), mas **não** é prova suficiente de que a recursão nunca
ocorre.

Sem acesso a um Postgres real nesta sessão (sem Docker), a dúvida não pode ser resolvida
empiricamente agora — e todas as migrations seguintes (`0018`+) dependem de `crm.meus_casos()`
funcionar sem lançar erro na primeira consulta real.

## Decisão

**`crm.meus_casos()` passa a resolver a parte "minhas participações ativas em `crm.participantes`"
através de um helper interno, `SECURITY DEFINER`, com `SET search_path` fixo — mesmo padrão já
aceito neste projeto em `audit.registrar_mudanca()` (0008).**

```sql
-- Helper interno, nao GRANT a authenticated: so crm.meus_casos() chama. SECURITY DEFINER aqui
-- nao concede privilegio novo -- o WHERE auth_user_id = auth.uid() ja restringe ao proprio
-- chamador, exatamente o que a policy direta "participante_ve_a_propria_linha" tambem permite.
-- Existe so para quebrar a autorreferencia estrutural de RLS (crm.participantes -> policy ->
-- crm.participo_do_caso() -> crm.meus_casos() -> crm.participantes de novo): dentro de uma
-- funcao SECURITY DEFINER cujo dono tem BYPASSRLS, esta consulta NAO reentra na RLS de
-- crm.participantes, rompendo o ciclo de forma estrutural, nao por ordem de avaliacao de OR.
CREATE FUNCTION crm._minhas_participacoes_ativas()
RETURNS setof uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = crm, pg_temp
AS $$
  SELECT cliente_id FROM crm.participantes
  WHERE auth_user_id = auth.uid() AND estado = 'ativo';
$$;

CREATE FUNCTION crm.meus_casos()
RETURNS setof uuid
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM crm._minhas_participacoes_ativas()
  UNION
  SELECT crm.meu_cliente_id() WHERE crm.meu_cliente_id() IS NOT NULL;
$$;
```

`crm.meus_casos()`, `crm.meus_papeis()`, `crm.tenho_papel()` e `crm.participo_do_caso()`
continuam **sem** `SECURITY DEFINER` — a exceção é só do helper interno de uma linha, nunca
exposto via `GRANT EXECUTE` a `authenticated`, e cujo corpo é auditável em uma inspeção de
segundos: um único `SELECT` com `WHERE auth_user_id = auth.uid()`, sem parâmetro vindo do
chamador, sem possibilidade de devolver linha de outro usuário.

A policy direta `participante_ve_a_propria_linha` em `crm.participantes` permanece — ela não é
mais necessária para romper a recursão (o helper já rompe), mas continua sendo exigência própria
do desenho (participante vê a própria linha) e serve como defesa em profundidade.

**Pendência declarada**: isto resolve o risco por raciocínio e por precedente (mesmo padrão aceito
de `audit.registrar_mudanca()`), não por prova empírica — ninguém rodou isto contra um Postgres
real ainda. **Gate**: a primeira aplicação real desta migration (CI `db-tests`, ambiente @devops,
ou sessão com Docker disponível) precisa confirmar que `SELECT * FROM crm.participantes` como
usuário autenticado não lança "infinite recursion" antes de qualquer migration `0018`+ ser
considerada validada em produção.

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| **A — Helper interno SECURITY DEFINER (escolhida)** | Rompe a recursão estruturalmente, não depende de ordem de avaliação de `OR`; precedente já aceito no projeto (`audit.registrar_mudanca()`); escopo mínimo, auditável | `SECURITY DEFINER` é superfície que merece atenção redobrada em toda revisão futura | Única opção que resolve o problema por mecanismo, não por esperança sobre o planejador |
| **B — Só a policy direta (`OR`), sem DEFINER** | Zero `SECURITY DEFINER` em qualquer função desta feature | Correção não garantida — depende de comportamento do rewriter/planejador do Postgres não documentado para este caso | Rejeitada depois da revisão adversarial: "parece funcionar" não é padrão aceitável para RLS |
| **C — Mover "ver outros participantes do caso" para fora de RLS direta** (RPC/Edge Function dedicada em vez de `SELECT` direto em `crm.participantes`) | Evita o problema por desenho, sem tocar em `SECURITY DEFINER` | Muda o contrato de leitura já especificado (`contracts/operacoes.md`), a forma do adapter (`SupabaseParticipantesConsulta.ts`) e tarefas já descritas (T049/T050) — redesenho maior do que o problema exige agora | Fica registrada como alternativa válida para uma故 revisão futura se o padrão A se provar insuficiente em produção |
| **D — Reescrever a policy sem subquery, só com `EXISTS` correlacionado direto** | Sem função nenhuma de permeio | Ainda referencia `crm.participantes` dentro da policy de `crm.participantes` — mesma classe de autorreferência, só sem a função como intermediária | Rejeitada: não resolve a causa, só muda a sintaxe |

## Consequências

**Positivas**
- Resolve o risco crítico apontado em revisão adversarial sem reabrir o desenho de participantes.
- Usa um padrão já aceito e revisado neste projeto (`SECURITY DEFINER` + `search_path` fixo), não
  uma técnica nova.
- Escopo do `SECURITY DEFINER` é o menor possível: uma função interna, uma linha de SQL, sem
  parâmetro, sem `GRANT` a `authenticated`.

**Negativas / trade-offs aceitos**
- `crm.meus_casos()`/`tenho_papel()`/`participo_do_caso()` deixam de ser 100% "sem SECURITY
  DEFINER em toda a cadeia" — são sem DEFINER na superfície pública, mas delegam para um helper que
  é. Qualquer revisão futura precisa saber disso e não assumir "sem DEFINER" como verdade transitiva.
- A correção segue sem confirmação empírica contra Postgres real até a primeira aplicação em
  CI/staging — dívida explícita, não dívida silenciosa.
- Se o padrão C (RPC dedicada) vier a ser necessário por outro motivo no futuro (ex.: mascarar
  e-mail do participante, limitação já registrada em `tasks.md`), ele pode substituir este ADR;
  até lá, A é o suficiente.
