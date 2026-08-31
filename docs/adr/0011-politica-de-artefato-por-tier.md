---
name: adr-0011-politica-de-artefato-por-tier
description: Quais artefatos SDD são obrigatórios em cada tier, e o que fazer com o histórico que não os tem. Substitui a regra "nunca implemente sem spec.md e tasks.md" do CLAUDE.md.
alwaysApply: false
---

# ADR-0011 — Política de artefato por tier

**Status:** Aceito
**Data:** 2026-08-31
**Decisores:** Lucas Azevedo
**Relacionados:** ADR-0002 (portas/adapters), `CLAUDE.md`, `Definition-of-Done.md`,
`ANTI-PADROES.md`, `specs/E00-S06-invariantes-padrao-os/`

## Contexto

O `CLAUDE.md` dizia, sem qualificação: *"Nunca implemente sem `spec.md` e `tasks.md` existirem"*,
e o mapa de artefatos do `AGENTS.md` marcava `product.md` como obrigatório em "tier pequeno+".

A auditoria de 2026-08-30 mediu o cumprimento real. Contagem em 2026-08-31, sobre 81 specs:

| Artefato | Presente | Ausente |
|---|---|---|
| `spec.md` | 81 | 0 |
| `tasks.md` | 22 | **59** |
| `product.md` | 4 | **77** |

Uma regra violada por 73% (`tasks.md`) e por 95% (`product.md`) do repositório não governa nada.
Pior: ela ensina todo agente que chega que as **outras** regras do `CLAUDE.md` também são
opcionais. O custo de manter a regra como estava não é a cerimônia que ela pede — é a autoridade
que ela derruba.

Três fatos moldaram a decisão:

1. **O gate que deveria ter cobrado isso estava morto.** `eval-spec-fidelity` filtrava pastas por
   `/^\d{4}-/` contra o formato real `E01-S01-*`: avaliava zero specs e reportava sucesso. A regra
   nunca foi exigida por máquina, só por leitura.
2. **A disciplina melhorou sozinha nas stories recentes.** As 12 stories de E12 e E13 têm
   `spec.md` + `tasks.md`, e 10 delas têm `design.md`. O problema é histórico, não corrente.
3. **`product.md` é o artefato que ninguém escreve.** 4 em 81. Ou ele é dispensável na maior
   parte dos casos, ou o passo do `@pm` está sendo pulado sistematicamente. As duas leituras
   pedem mudança — de regra ou de prática —, não silêncio.

## Decisão

### 1. O tier passa a ser declarado, não inferido

`tier` é campo **obrigatório** no frontmatter de `spec.md`, com valor `trivial`, `pequeno` ou
`arquitetural`. Verificado por `audit-esteira`. Sem tier declarado, nenhum gate consegue exigir a
coisa certa — era a lacuna que sustentava todas as outras.

### 2. Artefato obrigatório por tier

| Tier | `spec.md` | `tasks.md` | `product.md` | `design.md` |
|---|---|---|---|---|
| **trivial** (≤3 arquivos, sem decisão) | opcional | não | não | não |
| **pequeno** (feature isolada) | **sim** | **sim** | não | não |
| **arquitetural** (novo bounded context, integração externa, decisão irreversível, schema com dado em produção) | **sim** | **sim** | **sim** | **sim** |

### 3. `tasks.md` exige rastreabilidade, não cardinalidade

Cai a regra "1 task por AC". O invariante passa a ser: **todo AC da spec é citado por alguma
task**. Uma task pode cobrir vários AC quando eles são a mesma mudança — forçar a divisão produz
task de cerimônia, que é o anti-padrão que o `ANTI-PADROES.md` já proíbe em outros contextos.

O que **não** muda: toda task continua tendo gate executável, e task só está feita quando o gate
passa por comando.

### 4. Histórico: dívida nomeada, nunca regularizada em massa

Nenhum `tasks.md` ou `product.md` é gerado retroativamente. Gerar 59 arquivos de cerimônia para
um número ficar verde produziria documentação que ninguém escreveu e ninguém lê.

A dívida vive em `specs/_debt-baseline.json`, com duas seções — AC sem task e artefato ausente.
O arquivo é um **ratchet**: item listado passa, item novo falha na hora, e item que já foi pago
**também falha** enquanto continuar listado (obriga a apagar a linha). A dívida só encolhe.

Story antiga que for tocada de novo paga a parte dela. É o único caminho que reduz a dívida sem
parar o trabalho e sem inventar conteúdo.

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| **A (escolhida): obrigatoriedade por tier + baseline** | Regra passa a ser cumprível e verificável; dívida visível e decrescente | Baseline é um arquivo a mais para manter | Alinha a regra à prática sem baixar a barra para o trabalho novo |
| B: manter a regra e gerar os 59 `tasks.md` | Número fica verde de imediato | 59 arquivos escritos por máquina para stories já fechadas; documentação falsa é pior que ausente | Descartada pelo dono do produto |
| C: abandonar `tasks.md` como obrigatório | Zero dívida por definição | Perde-se a ligação AC→gate executável, que é o coração do padrão | Descartada — é o que o padrão tem de mais valioso |
| D: `product.md` obrigatório **por épico**, não por story | Reduz repetição real: o "por quê" de `E13-S02` é o mesmo de `E13-S01` | Épico não é entidade com pasta própria; exigiria inventar uma | Não escolhida agora — ver "Em aberto" |

## Consequências

**Positivas**
- A regra do `CLAUDE.md` passa a ser verdadeira, e por isso volta a ter autoridade.
- `eval:spec` exige o artefato certo por tier e falha para trabalho novo fora da regra.
- A dívida deixa de ser invisível: um número no gate, que só desce.

**Negativas / trade-offs aceitos**
- `specs/_debt-baseline.json` é dívida técnica assumida. Ele é a memória de uma regra que não foi
  cumprida; some quando a lista zerar.
- Declarar `tier` em spec antiga é trabalho manual (11 specs no momento desta decisão, derivadas
  pela presença de `design.md`).
- Marcar os 18 arquiteturais expõe **15 stories sem `product.md`**. Isso não é regressão — é a
  medição aparecendo pela primeira vez.

**Em aberto (não bloqueia esta decisão)**
- A alternativa D merece revisão depois de um épico inteiro sob esta regra. Se `product.md` por
  story de schema continuar parecendo cerimônia, um ADR novo substitui este com a regra por
  épico. Registrado aqui para não se perder.
