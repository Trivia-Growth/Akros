---
name: SPEC
description: Mutações que ainda pegavam ação direto do useMockDb passam a ir por porta/container.
story: E12-S01
alwaysApply: false
---

# spec.md — E12-S01 Contrato de portas em uso

## Contexto (revisado — a v1 desta spec estava errada, ver histórico)

A primeira versão desta spec partiu do handoff de 28/08/2026 (`docs/STATE.md`), que dizia
"`app/di.ts` só é importado por arquivos de teste". **Isso está desatualizado.** Auditoria no HEAD
atual mostrou 15 arquivos de produção já importando `@/app/di`, e um padrão consistente já
estabelecido em praticamente toda a aplicação:

- **Leitura:** direto via `useMockDb((s) => s.algumaCoisa)` — **de propósito**, pra manter
  reatividade do Zustand. Isso não é o bug. Trocar leitura reativa por chamada assíncrona de porta
  (`Promise`) quebraria a reatividade de toda tela da aplicação — não é isso que P0 nº1 pedia, e
  faria a AC-4 (zero regressão) falhar na certa.
- **Mutação:** via `container.<porta>.<metodo>()` — já é assim na maioria dos casos.

A regra de dependency-cruiser banindo import de `@/mocks/store` em `interfaces/**` (AC-1 da v1)
**foi removida desta spec**: baniria também a leitura (que é intencional) e o dependency-cruiser
não distingue, no mesmo import, "ler campo" de "pegar função de mutação" — não dava pra escrever a
regra certa com essa ferramenta mesmo tentando.

## O gap real

Uma auditoria linha a linha das 16 páginas encontrou **15 mutações** que ainda pegavam a ação
direto do `useMockDb` em vez de ir pelo `container`, concentradas em 3 arquivos — as outras 13
páginas já seguem o padrão correto:

| Arquivo | Mutações órfãs |
|---|---|
| `comunicacao/interfaces/ComunicacaoPage.tsx` | `transcreverMensagem`, `enviarMensagemConversaRica`, `marcarEmailThreadComoLida`, `enviarEmailThread`, `salvarAgenteIA`, `salvarBaseConhecimento` |
| `programas/interfaces/ProgramasPage.tsx` | `duplicarPrograma`, `salvarPrograma` |
| `configuracoes/interfaces/ConfiguracoesPage.tsx` | `atualizarContaConectada`, `desconectarContaAgenda`, `conectarContaAgenda`, `atualizarIntegracao`, `atualizarCredenciaisMeta`, `desconectarContaCanal`, `conectarContaCanal` |
| `crm/interfaces/Cliente360.tsx` | `enviarEmailThread`, `atualizarCliente`, `criarPagamento` |

`configuracoes` é o caso mais grave: o contexto inteiro não tinha `application/ports.ts` nem
`infrastructure/` — zero porta, zero container, todas as 7 mutações direto na store.

`Cliente360.tsx` não apareceu na varredura inicial porque essa foi feita com
`grep --include="*Page.tsx"` — o arquivo não segue esse padrão de nome. A varredura final que virou
o gate desta spec é por **nome de ação**, não por nome de arquivo, exatamente para não repetir esse
buraco (ver seção Gate).

**Exceção deliberada, fora do gate:** `demo/interfaces/DemoBar.tsx` pega `resetarDemo` e
`carregarCenario` direto da store. Ficam assim de propósito — mexem no dataset inteiro de uma vez
(reset total, troca de cenário), não são mutação de uma entidade dentro de um bounded context, e
não têm equivalente depois da migração pra Supabase (não existe "resetar o banco de produção" na
UI). `ARCHITECTURE.md` já não lista porta nenhuma para o contexto `demo` — não é uma omissão desta
spec, é consistente com o desenho existente.

## Fora de escopo

- Migrar qualquer leitura (`useMockDb((s) => s.x)`) para porta — não é o gap, é o padrão correto.
- Trocar o adapter mock por Supabase (E13+).
- Autenticação/RBAC (E12-S02).
- As 13 páginas que já seguiam o padrão corretamente (nada a fazer nelas).

## Acceptance Criteria

### AC-1 — Toda porta necessária existe
**Given** as mutações órfãs listadas no contexto
**When** o código é revisado
**Then** cada uma tem um método de porta correspondente: `ConversaRepository`/`AgenteService`
(métodos novos), `EmailRepository` (novo), `BaseConhecimentoRepository` (novo) no contexto
`comunicacao`; `ProgramaRepository` (métodos novos) no contexto `programas`;
`ConfiguracoesRepository` (porta nova, contexto não tinha nenhuma) no contexto `configuracoes`;
`PagamentoRepository.criar` (método novo) no contexto `pagamentos` — cada um implementado por um
`Mock*Repository` e registrado no `container` (`app/di.ts`). `ClienteRepository.atualizar` já
existia e só precisou ser religado.

### AC-2 — As 4 páginas não pegam mais ação direto da store
**Given** `ComunicacaoPage.tsx`, `ProgramasPage.tsx`, `ConfiguracoesPage.tsx`, `Cliente360.tsx`
**When** o código é revisado
**Then** nenhuma das chamadas listadas sobrevive como `useMockDb((state) => state.<ação>)` — todas
viram `container.<porta>.<metodo>(...)`. Leituras (`useMockDb((s) => s.dado)`) continuam como
estavam.

### AC-3 — Bug lateral corrigido de graça: hack do `.at(-1)`
**Given** `ContaAgendaForm.salvar()` em `ConfiguracoesPage.tsx`, que descartava o retorno de
`conectarContaAgenda(...)` e recuperava a conta criada via `useMockDb.getState().contasAgenda.at(-1)`
**When** migrado pra `container.configuracoes.conectarContaAgenda(...)`
**Then** o retorno da porta (`Promise<ContaConectada>`) é usado diretamente — sem `.at(-1)`, que
é frágil (some se dois cadastros disputarem a mesma tick) e não sobrevive à troca por Supabase.

### AC-4 — Zero regressão
**Given** os gates existentes
**When** rodados depois da migração
**Then** `pnpm run typecheck`, `pnpm test` (82/82) e `pnpm run build` continuam verdes.

## Gate

```
pnpm run typecheck
pnpm test
pnpm run build

# varredura por NOME DE AÇÃO em todo apps/web/src (não por nome de arquivo — foi assim que
# Cliente360.tsx escapou da primeira auditoria). Deve retornar vazio; exclui infrastructure/,
# mocks/ e *.test.* (que legitimamente chamam a store direto).
ACTIONS="criarLead|moverEstagioLead|adicionarNotaLead|criarClienteAPartirDeLead|atualizarCliente|registrarEvento|resolverPendenciaDeCanal|liberarFase|enviarEtapaParaAvaliacao|aprovarEtapa|devolverEtapaParaAjuste|registrarEnvioDocumento|salvarAnaliseDocumento|confirmarEnvioApesarDoAlerta|decidirDocumento|assinarSolicitacao|criarPagamento|marcarPagamentoComoPago|anexarComprovantePagamento|confirmarPagamento|marcarDivergenciaPagamento|agendarReuniao|enviarMensagemConversa|enviarMensagemConversaRica|transcreverMensagem|atualizarConfigAgente|salvarAgenteIA|salvarPrograma|duplicarPrograma|atualizarIntegracao|atualizarCredenciaisMeta|conectarContaAgenda|desconectarContaAgenda|atualizarContaConectada|marcarEmailThreadComoLida|enviarEmailThread|conectarContaCanal|desconectarContaCanal|salvarBaseConhecimento|criarProposta|enviarProposta|marcarStatusProposta|atualizarPerfilLead|responderQualificacaoLead|registrarToqueCadencia|pausarCadencia|encerrarCadenciaManual|decidirGateAgendamento|marcarNaoContatar"
grep -rnE "useMockDb\((\(s(tate)?\) =>|s(tate)? =>)? ?s(tate)?\.($ACTIONS)\b" apps/web/src \
  --include="*.tsx" --include="*.ts" | grep -v "\.test\." | grep -v "/infrastructure/" | grep -v "/mocks/"
```

`resetarDemo`/`carregarCenario` ficam fora da lista de propósito (ver exceção do `demo` acima).
