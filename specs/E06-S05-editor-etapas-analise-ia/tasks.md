---
name: TASKS
description: Decomposição AC→task→gate de E06-S05 (editor de requisitos com análise por IA configurável).
story: E06-S05
alwaysApply: false
---

# tasks.md — E06-S05 Editor de etapas com análise de documento por IA

> Pré-requisito atendido antes da implementação: **ADR-0013** (exceção pontual ao ADR-0004 para
> `RequisitoDocumento`, escopo mínimo). Ver `docs/adr/0013-requisito-editavel-excecao-adr-0004.md`.
> Contratos de domínio/porta/UI em `design.md` — este arquivo só decompõe.

## Task 1 — Domínio, porta e adapter mock de RequisitoDocumento (AC-1, AC-2, AC-6)

`AnaliseIAConfig`, `RequisitoDocumento` (com `analiseIA?`) e `ArquivoReferencia` em
`features/programas/domain/types.ts`; `RequisitoDocumentoRepository` em
`features/programas/application/ports.ts`; `MockRequisitoDocumentoRepository` escrevendo no
`useMockDb` (ações `criarRequisito`, `atualizarRequisito`, `removerRequisito`,
`salvarArquivoReferencia` — a última registrando histórico de troca: quem/quando, sem sobrescrever
silenciosamente). Validação: `analiseIA.habilitada = true` exige `skill` não-vazia (AC-3, camada
de domínio/aplicação, não só formulário); remoção com `Documento.requisitoId` apontando para o
requisito é recusada com erro que a UI traduz em "desativar" (AC-2).

**Gate:** testes unitários novos verdes — requisito sem IA analisa igual ao E07-S01 (regressão
AC-5 na camada de dados), validação de skill vazia falha, remoção com dependência falha,
substituição de arquivo de referência preserva histórico (AC-6). `pnpm test` verde.

## Task 2 — Analisador reflete skill; invariante ADR-0005 intacta (AC-4, AC-5)

Estender `AnalisadorDocumentoPort` com `skillAnalise?` e `arquivoReferenciaId?` opcionais
(`features/documentos/application/ports.ts`); o use case que monta o input passa a ler
`requisito.analiseIA` quando presente; `MockAnalisadorDocumento` passa a **citar** skill e
referência em `sugestoes`/`lacunas` das fixtures quando presentes — o "defeito" continua vindo da
fixture, não de comparação real de conteúdo (adapter LLM é fora desta rodada, nota do E07-S01).
Escrever os testes de AC-4/AC-5 **antes** do código, mesma disciplina do E07-S01 AC-3: parecer
muda de conteúdo com skill ligada; `Documento.status` nunca muda sozinho em nenhum cenário.

**Gate:** `pnpm test` verde com os novos casos de invariante.

## Task 3 — UI do editor (AC-1, AC-2, AC-3, AC-7)

Formulário de requisito a partir do detalhe do programa em `/admin/programas` (modal ou rota —
seguir o padrão das telas admin existentes): campos do requisito (tipo, título, objetivo,
obrigatoriedade, emitidoPor, aceitaSubstituto) + seção "Análise por IA" renderizada só com o
toggle ligado (textarea de skill + upload de arquivo de referência opcional). Salvar com toggle
ligado e skill vazia é bloqueado na UI com mensagem (AC-3). Remoção bloqueada explica o motivo e
oferece desativar (AC-2). Rótulos e validações via i18n (AC-7); `skill` é conteúdo do admin, não
copy — mesma exceção já registrada para conteúdo de programa.

**Gate:** teste de render do formulário (campos, seção condicional, bloqueio de salvamento)
verde; `pnpm test` e biome verdes.

## Task 4 — Direção de dependências (AC-8)

Confirmar por `pnpm run ci:local` (arch:check) que: escrita de `RequisitoDocumento` vive em
`programas/application` + `programas/infrastructure`; a extensão do `AnalisadorDocumentoPort` não
cria import de `programas → documentos` nem inverte a direção `documentos/application → programas`
(SPEC_DEVIATION existente do E06-S01, registrada). Se a direção quebrar, corrigir o código, não
o gate.

**Gate:** `pnpm run arch:check` verde; revisão do diff confirma que nenhuma tela nova edita
`Programa.versao`/`sujeito`/`categoria` (escopo do ADR-0013).

## Task 5 — Fechamento

Atualizar ROADMAP (status 🟩, data), `docs/STATE.md` e este arquivo com o andamento. Commit
`feat(E06-S05): ...` + `docs(E06-S05): ...` em separado.

---

## Andamento (2026-09-08) — Tasks 1-4 implementadas, gates verdes

**Task 1** — `AnaliseIAConfig`/`RequisitoDocumento`(+`ativo?`, `historicoArquivosReferencia?`)/
`ArquivoReferencia` no domínio; `RequisitoDocumentoRepository` na aplicação;
`MockRequisitoDocumentoRepository` (remoção com vínculo lança `RemocaoRequisitoBloqueada`; troca de
referência migra o anterior ao histórico com autor — AC-6) e `SupabaseRequisitoDocumentoRepository`
(count de vínculos via `documentos.documentos`). Validação "skill obrigatória se habilitada" em
`application/validacao.ts` (AC-3 na camada de aplicação, não só no formulário). 5 testes.

**Task 2** — `AnalisadorDocumentoPort` estendido com `skillAnalise?`/`arquivoReferenciaId?`;
`enviarEAnalisarDocumento` lê `requisito.analiseIA`; mock cita skill/referência em sugestões.
Testes de AC-4/AC-5 escritos antes do código (invariante ADR-0005 intacta com skill ligada).

**Task 3** — `ProgramaEditor` (detalhe do programa em `/admin/programas`): seção "Análise por IA"
condicional ao toggle, salvamento bloqueado sem skill, remoção bloqueada explicando e oferecendo
"desativar", histórico de referências visível, upload desabilitado para requisito novo sem id
persistido. **Desvio registrado (AC-7)**: a feature `programas` é PT literal desde E06-S01
(SPEC_DEVIATION prévia em `types.ts`) — seguiu o padrão em vez de meio-i18n.

**Task 4** — `arch:check` verde; nenhuma tela nova edita `Programa.versao`/`sujeito`/`categoria`.

**Achado fora do escopo, resolvido em 2026-09-08:** um `ProgramaEditor` que edita fases e salva
o `Programa` inteiro **já existia em HEAD** (prévio a esta story) e, com o INSERT admin liberado
por `0015`, a escrita de programa inteiro já era possível fora do demo — a invariante
"só-leitura" do ADR-0004 já não valia na prática, sem ADR que a suspendesse. O dono do produto
decidiu em 2026-09-08: **admin edita o Programa inteiro**. Zona cinzenta fechada pelo
**ADR-0014**, que estende a exceção do ADR-0013 a todo o catálogo mantendo o congelamento por
`programaVersao` dos casos instanciados.

163 testes unitários (+8), biome, arch, build e audit:esteira verdes.
