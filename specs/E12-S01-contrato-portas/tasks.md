---
name: TASKS
description: Decomposição AC→task→gate de E12-S01 (escopo corrigido).
story: E12-S01
---

# tasks.md — E12-S01 Contrato de portas em uso

A v1 deste arquivo assumia um escopo de 16 páginas/8 contextos baseado numa premissa errada (ver
`spec.md`). O trabalho abaixo é o que foi de fato necessário, já executado nesta sessão.

## Task 1 — Auditoria por nome de ação (AC-1, AC-2)
Levantar todo `useMockDb((s) => s.<ação>)` que pega uma **mutação** (não leitura) em qualquer
arquivo de produção fora de `infrastructure/`, `mocks/` e testes. Feito por varredura de todos os
~48 nomes de ação do `MockDbState`, não por nome de arquivo (o primeiro corte, por
`*Page.tsx`, deixou passar `Cliente360.tsx`).

**Gate:** lista fechada, sem "TBD" pendente. ✅ concluída — achou 18 mutações órfãs em 4 arquivos.

## Task 2 — `comunicacao` (6 mutações em `ComunicacaoPage.tsx`)
Adicionados `enviarMensagemRica`, `transcreverMensagem` em `ConversaRepository`;
`marcarComoLido`/`responder` em `EmailRepository` (novo); `salvarAgente` em `AgenteService`;
`salvar` em `BaseConhecimentoRepository` (novo). Implementados em `MockConversaRepository.ts`,
registrados em `app/di.ts` (`email`, `baseConhecimento`). Página religada.

**Gate:** ✅ `pnpm run typecheck && pnpm test` verdes.

## Task 3 — `programas` (2 mutações em `ProgramasPage.tsx`)
Adicionados `salvar`/`duplicar` em `ProgramaRepository`, implementados em
`MockProgramaRepository.ts`. Página religada (`handleDuplicar` virou `async`).

**Gate:** ✅ `pnpm run typecheck && pnpm test` verdes.

## Task 4 — `configuracoes` (7 mutações em `ConfiguracoesPage.tsx`)
Contexto não tinha `application/` nem `infrastructure/` — criados do zero. `ConfiguracoesRepository`
novo com `atualizarIntegracao`, `atualizarCredenciaisMeta`, `conectarContaAgenda`,
`desconectarContaAgenda`, `atualizarContaConectada`, `conectarContaCanal`, `desconectarContaCanal`.
`MockConfiguracoesRepository.ts` implementa; registrado em `app/di.ts` (`configuracoes`). Página
religada — e o hack `useMockDb.getState().contasAgenda.at(-1)` em `ContaAgendaForm.salvar()` saiu:
o retorno de `conectarContaAgenda` agora é usado direto (AC-3).

**Gate:** ✅ `pnpm run typecheck && pnpm test` verdes.

## Task 5 — `crm` (3 mutações em `Cliente360.tsx`)
`atualizarCliente` religado pra `container.clientes.atualizar` (porta já existia).
`criarPagamento` precisou de método novo (`PagamentoRepository.criar`, implementado em
`MockPagamentoRepository.ts`). `enviarEmailThread` religado pro `EmailRepository` da Task 2.

**Gate:** ✅ `pnpm run typecheck && pnpm test` verdes.

## Task 6 — Verificação final (AC-4)
```
pnpm run typecheck   # ✅
pnpm test             # ✅ 82/82
pnpm run build        # ✅
biome check --write <arquivos editados>   # ✅ 0 erros após format
```
Gate por nome de ação (ver `spec.md`) rodado e vazio. ✅

**Pendente:** peer review visual das 4 telas tocadas (`pnpm dev` + barra de demo) — não feito nesta
sessão por falta de ferramenta de browser. Recomendado antes de considerar a story 🟩 fechada.

Ao terminar: `/validar`, atualizar `docs/STATE.md` e `docs/epics/ROADMAP.md` (E12-S01: 🟨 → 🟩,
condicionado ao peer review acima).
