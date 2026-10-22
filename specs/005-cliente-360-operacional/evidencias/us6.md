# Evidências — User Story 6 (Caso com vários participantes e documento restrito)

**Fecha a fase 4 (US6) — tasks T042–T053.** Para cada cenário de aceite de `spec.md` (User
Story 6), uma frase de como foi verificado nesta entrega ou nas tasks anteriores já aprovadas
(T042–T048). Não repete prova que já existe — referencia.

## Cenário 1

> **Given** um programa que define aplicante organização e beneficiário pessoa, **When** a equipe
> prepara o caso e convida cada participante, **Then** cada um entra no portal com seu papel e o
> histórico registra quem convidou, quando e com que papel.

**Verificado**: `crm.convidar_participante` (migration 0024) grava `convidado_por`/`convidado_em`
na mesma transação do INSERT — provado contra Postgres real (teste `06` abaixo, que já existia
desde a fase 2 e continua passando depois de todas as migrations novas desta fase). Nesta
entrega, `ParticipantesPainel.tsx` (T050) expõe o convite pela UI (`useParticipantesComandos` →
`SupabaseCasoComandos.convidarParticipante` → Edge Function `caso-comandos`, ação
`convidar_participante`) e mostra "Convidado por {{author}} em {{date}}" por participante (chave
`participants.invitedBy`). O papel entra como um dos 4 valores fixos do domínio
(`PapelParticipante`) — a validação de que esse papel existe na versão congelada do programa do
caso é feita pela RPC (`crm.convidar_participante`, FR-017/FR-019), não pela UI.

## Cenário 2

> **Given** requisito marcado como restrito a um papel pelo programa, **When** participante de
> outro papel lista documentos, consulta por ID ou tenta baixar o arquivo por chamada direta,
> **Then** o requisito não aparece e a operação é recusada, sem revelar nome, tamanho ou
> metadados.

**Verificado (RLS, prova real contra Postgres)**: teste `07-rls-documentos-papel_test.sql`
(migration 0019) — participante de outro papel que tenta `SELECT` direto (não pela UI) na linha
restrita recebe conjunto vazio, nunca a linha com nome/metadados. Rodado nesta entrega contra um
banco recriado do zero com as 24 migrations (`00` + `0001`–`0024`), `EXIT:0`, notice "RLS de
documentos/jornada por papel + deny-by-default de crm.notas_internas: todas as asserções
passaram" (ver seção "Prova SQL" abaixo).

**T051 (frontend) — investigado, SEM mudança de código**: `SupabaseDocumentosConsulta.ts`
(`carregarCliente()`) faz um `.select()` sem nenhum filtro de papel em JavaScript — a
visibilidade inteira vem da policy `participante_ve_documento_do_caso_no_seu_papel` (migration
0019), com `FORCE ROW LEVEL SECURITY` e nenhum caminho de `service_role`/bypass neste arquivo. Um
filtro de papel duplicado no cliente seria uma segunda fonte de verdade que diverge da RLS com o
tempo — por isso não foi adicionado. Documentado em comentário no próprio arquivo e em teste
dedicado (`SupabaseDocumentosConsulta.test.ts`, describe "invariante de visibilidade por papel")
que prova que `paraDocumento` não enxerga nem decide nada sobre `restrito_ao_papel`/
`papel_dirigido` — essas colunas de controle da RLS nem chegam ao DTO do portal.

**Gap honesto**: "download recusado por chamada direta" não tem prova de ponta a ponta nesta
entrega — não existe ainda armazenamento de arquivo real servido por URL assinada nesta fase do
protótipo (`urlMock`), então não há um endpoint de download real para testar a recusa contra.
`08-rls-arquivos_test.sql` prova a parte que existe hoje: RLS de `arquivos.*` e da policy de
INSERT em `storage.objects` (bucket `envios`) — mesmo critério de papel, mas não é literalmente
"baixar o arquivo". Registrado como lacuna conhecida (ver seção final).

## Cenário 3

> **Given** solicitação dirigida a um papel, **When** participante de outro papel tenta enviar,
> **Then** a ação é recusada; quando o programa marca o requisito como de envio conjunto,
> qualquer participante autorizado envia e a autoria do envio fica registrada.

**Fora do escopo de T049–T053** — este cenário depende do fluxo de envio de documento pelo
participante (upload), que é FASE 5 desta feature (ainda não implementada). `solicitar_documento`
(T048, Edge Function) já existe e copia `papel_dirigido`/`restrito_ao_papel`/`envio_conjunto` do
catálogo do programa (nunca do corpo da requisição — `caso-comandos.test.ts`, Deno, 126 testes,
rodados nesta entrega: `ok | 126 passed | 0 failed`), mas o lado "participante tenta enviar e é
recusado" depende de uma Edge Function de envio que ainda não existe. Gap conhecido, não desta
entrega.

## Cenário 4

> **Given** dois participantes ativos, **When** o acesso de um é revogado, **Then** ele perde
> envio, consulta, download e retomada, e o outro continua operando normalmente.

**Verificado (RLS + RPC, prova real contra Postgres)**: `crm.revogar_participante` (migration
0024) faz `UPDATE ... WHERE id = p_participante_id` — só a linha alvo, nenhum outro predicado
(nenhuma atualização em massa por `cliente_id`/papel). `crm.meus_casos()`/`crm.tenho_papel()`
(migration 0017) leem `estado = 'ativo'` — participante revogado para de aparecer em
`crm.meus_casos()` imediatamente após o `UPDATE` (mesma transação, sem cache), perdendo acesso a
toda consulta que dependa dessas funções (`documentos.documentos`, `jornada.fases`,
`jornada.etapas`). `07-rls-documentos-papel_test.sql` tem cenário dedicado de revogação no meio
do próprio teste (participante revogado no cenário 5 do arquivo) provando exatamente isto.

Nesta entrega, `ParticipantesPainel.tsx` (T050) expõe a revogação pela UI
(`useParticipantesComandos.revogar` → `SupabaseCasoComandos.revogarParticipante` → Edge Function
`caso-comandos`, ação `revogar_participante`), com confirmação (`window.confirm`,
`participants.revokeConfirm`) e `idempotencyKey` gerada por clique (nunca reusada entre cliques).

## Cenário 5

> **Given** caso EB-2 NIW com cônjuge incluído como apoio, **When** o cônjuge abre o portal,
> **Then** vê apenas o que o papel de apoio permite e nenhuma ação de aprovação lhe é oferecida
> nem aceita.

**Verificado (domínio)**: `papelConcedeAutoridadeDeEquipe(_papel: PapelParticipante): boolean`
(`crm/domain/participante.ts`, T042-045) sempre retorna `false` para qualquer papel — nenhum
participante, de nenhum papel, tem autoridade de aprovar/concluir/liberar/conciliar (só a equipe/
admin, ver comentário do próprio arquivo). `participante.test.ts` cobre esta função. A ausência de
qualquer botão de aprovação no portal do cliente (`DocumentosRealPage.tsx`,
`DashboardPage.tsx`) é estrutural: nenhuma dessas telas chama uma ação de aprovação a partir de
participante — só a fila admin (`FilaRevisaoPage`/equivalente) tem esse botão, e ela exige sessão
admin (`RequireRole`, ADR-0008/0009, provado em `auth-matrix.spec.ts` AC-2/AC-3).

## Cenário 6

> **Given** a versão do programa do caso congelada, **When** a equipe altera papéis ou restrições
> no catálogo do programa, **Then** os casos em andamento mantêm as regras da versão escolhida.

**Verificado**: `crm.convidar_participante` resolve `programa_id`/`programa_versao` a partir da
JORNADA (se já instanciada) ou do CONTRATO ativo do caso — nunca do catálogo "atual" solto
(migration 0024, `SELECT j.programa_id, j.programa_versao FROM jornada.jornadas ...`). A versão
congelada (ADR-0004/0014) é a mesma usada por `crm.preparar_caso` (T031/T032, já aprovado). Um
caso em andamento continua referenciando a mesma `(programa_id, programa_versao)` mesmo que o
catálogo (`programas.programas`) ganhe uma linha nova para uma versão mais recente — a FK/leitura
usa o par exato gravado no caso, não "a versão mais recente".

## Prova SQL (T053) — rodada nesta entrega, banco recriado do zero

Banco `crm_test` (Postgres 17 local, `psql -h /tmp -p 5432 -U lucasazevedo`) recriado do zero
(`DROP DATABASE IF EXISTS` + `CREATE DATABASE`), depois:

```
psql -f supabase/tests/00-shim-supabase.sql                           -> EXIT:0
psql -f <concat de 0001_...sql até 0024_...sql, em ordem numérica>     -> EXIT:0 (24/24 sem erro)
```

Testes `01` a `09`, cada um rodado individualmente em sequência (mesma ordem do job `db-tests` da
CI), contra o MESMO banco já migrado, cada um com `EXIT:0`:

```
01: seguranca.consumir_cota: todas as asserções passaram
02: RLS de crm.leads: todas as asserções passaram
03: E13-S10: constraints, RLS e auditoria passaram
04: E13-S11: INSERT de programas respeita RLS
05: E13-S12/S13: cofre, telefone e deduplicação multicanal passaram
06: RLS de crm.participantes/contratos/contrato_condicoes/organizacoes: todas as asserções passaram
07: RLS de documentos/jornada por papel + deny-by-default de crm.notas_internas: todas as asserções passaram
08: RLS de arquivos.* e da policy de INSERT em storage.objects (bucket envios): todas as asserções passaram
09: A-02: nenhum papel escreve documentos/pagamentos/etapas por UPDATE direto — todas as asserções passaram
```

Os três diretamente relevantes a esta US (`06`, `07`, `08`) continuam passando depois de todas as
migrations novas da fase 4 (`0022`–`0024`), confirmando que `convidar_participante`/
`revogar_participante`/`solicitar_documento` e a coluna `programas.programas.papeis` não quebraram
nenhuma garantia de RLS já provada nas fases anteriores.

## Prova de Edge Function

`supabase/functions/caso-comandos/caso-comandos.test.ts` (Deno test, fakes — nenhum teste toca
Postgres real, a prova contra Postgres real é a seção acima): `pnpm run test:functions` rodado
nesta entrega, resultado real:

```
ok | 126 passed | 0 failed (336ms)
```

Cobre as 5 ações (`registrar_contrato`, `preparar_caso`, `convidar_participante`,
`revogar_participante`, `solicitar_documento`), inclusive o fixture de requisito duplicado por
`tipo` (visto R: "passaporte" genérico + "passaporte" da organização restrito) que provou a
correção de `solicitar_documento` localizar por `requisitoId` em vez de `tipo` (revisão
adversarial de 2026-10-16, já aprovada antes desta task).

## e2e (T052) — honestamente, NÃO rodado nesta entrega

`apps/web/e2e/papel-visibilidade.spec.ts` foi escrito (cenários 2 e 4: visibilidade por papel +
perda de acesso na revogação, via Playwright autenticado), mas **não foi executado** nesta
sessão:

- Não existe `apps/web/.env.test.local` neste worktree (verificado: arquivo ausente) — sem ele,
  não há projeto Supabase de teste alcançável nem credenciais de nenhuma persona.
- Mesmo com credenciais, o cenário exige um FIXTURE que não existe por padrão em nenhum projeto
  Supabase novo: um caso com dois participantes ativos de papéis diferentes e um documento
  restrito a um dos dois papéis, semeado à mão. O arquivo documenta, no comentário do topo, quais
  variáveis de ambiente e qual fixture são necessários (`E2E_PARTICIPANTE_A_*`/
  `E2E_PARTICIPANTE_B_*`/`E2E_DOCUMENTO_RESTRITO_ID`/`E2E_PARTICIPANTE_B_ID`), e usa
  `test.skip(FIXTURE_AUSENTE, ...)` em vez de falhar — mesmo padrão já usado em
  `auth-matrix.spec.ts` (AC-6) para um fixture opcional.
- `docs/STATE.md` confirma "E2E só local: autentica contra Supabase real; não roda na CI" — e
  nenhuma sessão anterior desta feature deixou esse ambiente configurado neste worktree.

Portanto: o arquivo existe, compila (passou por `typecheck`/`biome` do `ci:local`), e está pronto
para rodar quando alguém configurar `.env.test.local` + semear o fixture descrito — mas a
cobertura real do cenário 2/4 nesta entrega vem inteiramente da prova SQL (`07`/`08` acima), não
do e2e.

## Gates desta entrega

- `rtk pnpm run ci:local` — verde: lint (biome) ✔, typecheck (tsc) ✔, testes (vitest) ✔
  256/256 (53 arquivos de teste, incluindo `SupabaseParticipantesConsulta.test.ts` novo e as
  extensões de `SupabaseCasoComandos.test.ts`/`SupabaseDocumentosConsulta.test.ts`).
- `rtk pnpm run arch:check` — verde: 7/7 testes de regra de arquitetura (`arch-rules.test.mjs`) +
  `depcruise` sem violação (252 módulos, 924 dependências cruzadas).
- `pnpm run test:functions` (Deno) — verde: `126 passed | 0 failed`.
- Testes SQL `01`–`09` contra Postgres 17 local — verde, 9/9 (ver seção acima).

## Gaps conhecidos ao final da fase 4

1. Cenário 2: "download recusado por chamada direta" não tem prova de ponta a ponta — ainda não
   existe download de arquivo real nesta fase do protótipo (`urlMock`); `08-rls-arquivos_test.sql`
   prova a RLS de `arquivos.*`/`storage.objects`, que é a peça que existe hoje.
2. Cenário 3 (envio dirigido/conjunto): depende do fluxo de upload pelo participante, que é fase 5
   (ainda não implementada) — fora do escopo de T049–T053.
3. e2e (T052): escrito, não executado nesta sessão (ambiente/fixture ausentes, ver seção acima).
