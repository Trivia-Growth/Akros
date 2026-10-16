# Evidências — User Story 1 (Equipe prepara e acompanha um caso)

**Fecha a fase 3 (US1) — tasks T036–T041.** Para cada cenário de aceite de `spec.md` (User
Story 1), uma frase de como foi verificado nesta entrega ou nas tasks anteriores já aprovadas
(T027–T035). Não repete prova que já existe — referencia.

## Cenário 1

> **Given** um administrador autenticado, **When** prepara um caso e informa o programa,
> **Then** a jornada usa a versão escolhida do programa e o 360 mostra responsável, fase e
> próxima ação.

**Verificado**: a RPC `crm.preparar_caso` (migration 0022) congela `programa_id`/`programa_versao`
na jornada — provada contra Postgres real nas tasks T031/T032 (`caso-comandos.test.ts`, Deno). O
cálculo de responsável/fase/próxima ação a partir da situação do caso tem cobertura unitária em
`apps/web/src/features/crm/domain/caso.test.ts` (T027-030, já aprovado). Nesta entrega,
`Cliente360Real` (`Clientes360RealPage.tsx`) monta `SituacaoCaso` a partir dos dados carregados e
chama `calcularProximaAcao` para exibir os três campos no cabeçalho — renderização sem erro
exercitada pelo smoke test `cliente-360-operacional.smoke.test.tsx` (T040).

## Cenário 2

> **Given** um cliente em andamento, **When** a equipe registra situação inicial e vincula sua
> pasta, **Then** mantém os arquivos existentes e registra autor, data e origem dessa situação
> inicial.

**Parcialmente verificado — gap conhecido, fora do escopo de T036-041**: `crm.preparar_caso`
grava `conferido_por`/`conferido_em` (autor e data — provado em T031/T032) e `Jornada` agora
expõe esses campos ao frontend (`contratoId`, `levantamentoEstado`, `conferidoPor`, `conferidoEm`,
`origemSituacaoInicial` — mapeados nesta entrega em `SupabaseJornadaConsulta.ts`). Porém a RPC
hoje grava `origem_situacao_inicial` sempre como `'nascido_na_plataforma'` (migration 0022,
linha 283) — não há parâmetro ainda para distinguir histórico importado de caso novo, nem UI de
vínculo/preservação de pasta OneDrive (isso depende da integração OneDrive, fora desta fase). Este
cenário não está coberto de ponta a ponta; falta uma task futura para o parâmetro de origem e o
fluxo de importação de histórico.

## Cenário 3

> **Given** requisitos documentais e pagamentos cadastrados, **When** a equipe abre o 360,
> **Then** vê pendências separadas por tipo, responsável pela próxima ação e prazo quando
> definido.

**Verificado**: `cliente-360-operacional.smoke.test.tsx` (T040), teste "FR-002: documentos e
pagamentos pendentes aparecem separados por tipo na fila de atenção, não somados" — prova que a
fila "O que precisa de atenção" mostra contagem de documentos e de pagamentos em linhas distintas
(nunca uma soma única). Responsável pela próxima ação vem de `calcularProximaAcao` (mesma prova do
Cenário 1). **Lacuna conhecida, aceita pelo brief** (escopo desta fase, não desta story completa):
prazo por pendência individual não aparece item a item na fila — é aproximação intencional desta
entrega (contagem por tipo); exibição de prazo por item fica para quando a carteira ganhar critério
uniforme (fase 8/9, já apontado no brief como fora de escopo agora).

## Cenário 4

> **Given** um cadastro sem levantamento completo, **When** abre o resumo, **Then** vê "cadastro
> incompleto"; ausência de informações não significa ausência de pendências.

**Verificado (FR-013, na UI, não só no domínio)**: `cliente-360-operacional.smoke.test.tsx` (T040)
cobre os dois lados — "cliente sem contrato ativo mostra o selo de cadastro incompleto" e, o lado
oposto, "contrato ativo + levantamento conferido + zero pendências NÃO mostra o selo". O selo
(`data-testid="selo-cadastro-incompleto"`) fica no cabeçalho navy, sempre visível, nunca dentro de
uma aba — condição: `!contrato || levantamentoEstado === "incompleto"`, com
`levantamentoEstado = jornada?.levantamentoEstado ?? "incompleto"` (ausência de jornada também
conta como incompleto, nunca como "tudo em dia"). A regra em si (`calcularProximaAcao` sempre
retorna "Concluir levantamento inicial" quando `levantamentoEstado === "incompleto"`, mesmo com
as três pendências zeradas) tem teste unitário dedicado em `caso.test.ts` (T027-030).

## Cenário 5

> **Given** um contrato registrado com programa, participantes, condições financeiras e
> prioridade, **When** a equipe prepara o caso, **Then** cadastro, papéis, cobranças e prazos de
> resposta nascem desses dados, com origem registrada e campos faltantes apontados como cadastro
> incompleto.

**Parcialmente verificado**: a parte de programa/condições financeiras/prazo de resposta/
prioridade está coberta — `ContratoFormulario.tsx` (T037) escreve via `registrarContrato` +
`prepararCaso` (`useContratoComandos`, T035), com validação de formulário espelhando os CHECKs do
servidor (`prazoRespostaValido`, `condicoesValidas`, de `crm/domain/contrato.ts`, T027-030); a RPC
em si — contrato ativo, substituição sem reescrever cobrança conciliada, condição sem valor → 422 —
está provada contra Postgres real em T031/T032. **Participantes e papéis (ADR-0018) não fazem
parte desta entrega** — este formulário não tem campo de participante; é cenário de outra task da
feature, fora do escopo de T036-041.

## Cenário 6

> **Given** um caso sem contrato registrado, **When** abre o 360, **Then** vê o caso como
> cadastro incompleto; o sistema não deriva cobrança, prazo nem prioridade de dado ausente.

**Verificado**: `cliente-360-operacional.smoke.test.tsx` (T040), teste "FR-013: cliente sem
contrato ativo mostra o selo de cadastro incompleto". Estruturalmente, o sistema não tem como
derivar cobrança/prazo/prioridade de contrato ausente: `derivarCobrancas(contrato: Contrato)`
(`crm/domain/contrato.ts`) exige um `Contrato` não-opcional — não existe caminho de código que a
chame com `undefined` — e `calcularProximaAcao` retorna "Registrar contrato do caso" como primeira
checagem quando `!situacao.contrato`, antes de qualquer cálculo de pendência (coberto em
`caso.test.ts`, T027-030).

## Gates desta entrega (T041)

- `rtk pnpm run ci:local` — verde: lint (biome) ✔, typecheck (tsc) ✔, testes (vitest) ✔
  223/223 (50 arquivos de teste, incluindo o novo `cliente-360-operacional.smoke.test.tsx`).
- `rtk pnpm run arch:check` — verde: 7/7 testes de regra de arquitetura (`arch-rules.test.mjs`) +
  `depcruise` sem violação (247 módulos, 900 dependências cruzadas).

## Gaps conhecidos ao final da fase 3

1. Cenário 2 (situação inicial de cliente em andamento): falta parâmetro de origem na RPC
   `crm.preparar_caso` para distinguir histórico importado de caso nascido na plataforma, e falta
   UI de vínculo/preservação de pasta OneDrive (integração OneDrive é de fase futura).
2. Cenário 5: participantes e papéis (ADR-0018) não têm formulário nesta entrega — contrato hoje
   só registra programa/condições/prazo/prioridade, sem participante.
3. Prazo por pendência individual não aparece item a item na fila "O que precisa de atenção" —
   aproximação intencional desta fase (contagem por tipo), conforme o brief de T036-041.
