---
name: DESIGN
description: Quatro invariantes que elevam a esteira do Akros a template do Padrão OS — gate executável, custo de retrofit e recomendação de adoção. E00-S06.
story: E00-S06
alwaysApply: false
---

# design.md — E00-S06 Invariantes do Padrão OS

**Tier:** arquitetural. Define regras que passam a valer para todo projeto que herdar este
template — mudar depois significa mudar em todos.

## O problema que justifica o documento

A auditoria de 2026-08-30 achou dois gates verdes que não verificavam nada: o filtro de pasta de
spec (`/^\d{4}-/`) não casava com o formato real (`E01-S01-*`), e por isso `eval:spec` avaliava
zero specs e a checagem "toda feature tem `spec.md`" varria lista vazia. Meses de confiança falsa.

Num repositório único isso é um bug. **Num template replicado, é um bug que se multiplica em
silêncio e cada projeto herda a mesma falsa confiança.** Os invariantes abaixo existem para que a
próxima cópia deste padrão não possa repetir a mesma classe de erro.

Cada invariante traz três coisas, porque sem as três a regra é aspiração: **comando do gate**,
**onde entra no `lefthook.yml`**, e **custo de aplicar retroativamente no Akros**.

---

## Invariante 1 — Todo script de `scripts/` tem teste que prova que ele falha

**Regra.** Todo `scripts/<nome>.mjs` tem `scripts/<nome>.test.mjs` ao lado, com pelo menos um caso
que monta uma entrada inválida e afirma **saída não-zero**. Teste que só prova o caminho feliz não
satisfaz o invariante: o modo de falha perigoso de um gate é passar, não quebrar.

Referência de forma: `scripts/check-edge-functions.test.mjs` — fixture em `mkdtemp`, `execFileSync`
com captura de `exit code`, um `test()` por modo de falha. Já estava certo antes desta auditoria.

**Gate.**
```bash
node --test scripts/         # roda todos os *.test.mjs
node scripts/check-gate-coverage.mjs   # a escrever: falha se um .mjs não tem .test.mjs par
```

**Onde entra no `lefthook.yml`.** Dentro dos gates que já existem, não como comando novo — é o
padrão que `check:edge-functions` já usa (`node --test <teste> && node <script>`). Aplicado hoje em
`audit:esteira` e `eval:spec`. O `check-gate-coverage.mjs` entra como comando próprio em
`pre-push`, ao lado de `esteira`.

**Custo de retrofit no Akros.** Baixo. 11 scripts, 3 já cobertos (`check-edge-functions`,
`audit-esteira`, `eval-spec-fidelity`). Faltam 8, dos quais 3 são triviais (`prepare-hooks`,
`remind-impeccable`, `nova-story` — geram arquivo, não decidem nada) e 2 valem de verdade
(`lint-migrations`, que tem a regra RLS-GRANT e é o mais perigoso de estar errado; e
`check-story`). Estimativa: 1 dia.

**Recomendação: adotar integralmente.** É o invariante que teria evitado o achado que motivou o
documento, e é o mais barato dos quatro.

---

## Invariante 2 — Toda porta do ADR-0002 tem suíte de contrato que roda contra mock e adapter real

**Regra.** Para cada porta, **uma** suíte de comportamento, executada duas vezes: contra o
`Mock*` e contra o adapter real. O que ela afirma é o contrato — ordenação, o que acontece quando
não existe, o que acontece quando já existe, o que é rejeitado.

Sem isso, "portas e adapters" é vocabulário: nada garante que `MockLeadRepository` e
`SupabaseLeadRepository` se comportem igual, e quem descobre a divergência é a produção.

**Gate.**
```bash
pnpm test                                    # variante mock, sempre
CONTRATO=real pnpm test -- contrato          # variante real, só onde há credencial
```

**Onde entra no `lefthook.yml`.** A variante mock em `testes` (já existe). A variante real **não
entra no `pre-push`** — depende de rede e banco, mesma categoria de `db-tests` e do Playwright. Vai
para o job `db-tests` da CI (`.github/workflows/ci.yml`).

**Custo de retrofit no Akros.** Alto, e por um motivo que não é preguiça: **os adapters reais quase
não existem ainda.** Hoje só `sessao` tem infraestrutura real; E13 está escrevendo o schema neste
momento. Escrever suíte de contrato agora significa escrever contra um lado que ainda não nasceu.

**Recomendação: adotar apenas para frente, não retroativamente.** A regra vale a partir de E13:
todo adapter real nasce com a suíte de contrato, e a suíte é gate de aceitação da story que o cria.
Retrofitar as portas mockadas antes de existir o par real produziria testes que só provam que o
mock concorda consigo mesmo.

---

## Invariante 3 — Frente não importa frente, e falha de uma não propaga

**Regra.** Duas metades. A estática: `features/site`, as rotas do portal e as do admin não se
importam — só compartilham via `shared/`. A dinâmica: existe teste que prova que uma exceção no
render de uma frente **não** desmonta a outra.

A metade estática sozinha não basta: ela impede o acoplamento de código, não o acoplamento de
destino. Sem `ErrorBoundary`, três frentes independentes ainda morrem juntas na mesma árvore React.

**Gate.**
```bash
pnpm run arch:check    # regra `frente-nao-importa-frente` em .dependency-cruiser.cjs
pnpm test              # teste de não-propagação (E15-S01, task 2)
```

**Onde entra no `lefthook.yml`.** Em `arquitetura` e `testes` — os dois comandos já existem, ganham
conteúdo novo. Nenhum gate novo.

**Custo de retrofit no Akros.** Baixo, e já orçado: é exatamente `specs/E15-S01-resiliencia-modulo/`,
tasks 2 e 5. A fronteira já existe no roteamento (`PublicLayout`, `PortalLayout`, `AdminLayout`);
falta materializá-la no bundle e prová-la em teste. Risco de a regra estática acusar violação real
hoje: existe, e descobrir isso é parte do valor.

**Recomendação: adotar integralmente**, junto com E15-S01.

---

## Invariante 4 — Toda integração externa declara comportamento degradado, com teste que o exercita

**Regra pretendida.** WhatsApp, Instagram/Meta, Google, Microsoft, Calendly, OpenRouter, Whisper,
Fireflies: cada uma declara no `design.md` o que a plataforma faz quando ela está fora — fila,
cache, aviso ao usuário ou bloqueio explícito — e tem teste que exercita esse caminho.

**Gate.**
```bash
node scripts/check-degraded-mode.mjs   # a escrever: toda integração declarada tem seção + teste
pnpm test
```

**Onde entra no `lefthook.yml`.** Comando próprio em `pre-push`, ao lado de `edge-functions`.

**Custo de retrofit no Akros.** Alto e, hoje, de retorno duvidoso — **as oito integrações são
mockadas**. Um teste de degradação contra um mock prova que o mock sabe devolver erro, não que a
plataforma sobrevive ao Google fora do ar. É cerimônia com aparência de rigor, que é exatamente o
que o `ANTI-PADROES.md` manda não fazer.

**Recomendação: adotar pela metade agora.** Fica valendo a **declaração** (toda integração descreve
seu modo degradado no `design.md`, verificável por script — barato e útil como documentação de
decisão) e fica **suspensa a exigência de teste** até a integração ter adapter real, quando ela
passa a ser gate de aceitação daquela story, igual ao invariante 2.

---

## Resumo da recomendação

| # | Invariante | Adotar agora | Custo | Por quê |
|---|-----------|--------------|-------|---------|
| 1 | Teste do próprio gate | **Sim, integral** | ~1 dia | Evita a classe de bug que motivou este documento; 3 de 11 scripts já cobertos |
| 2 | Contrato porta × adapter | **Só para frente (E13+)** | Alto | Os adapters reais ainda não existem; retrofit testaria o mock contra si mesmo |
| 3 | Frente isolada + não-propagação | **Sim, integral** | Baixo | Já orçado em E15-S01; fronteira já existe no roteamento |
| 4 | Modo degradado | **Metade** — declaração sim, teste depois | Alto | 8 integrações mockadas: teste de degradação contra mock não prova nada |

**Três invariantes reais, um adiado por honestidade.** O pedido era esse: preferir três que valem a
quatro que enfeitam. O invariante 4 não foi descartado — foi reduzido à parte que hoje tem valor
(declarar a decisão) e reagendado na parte que hoje não tem (testar um mock).
