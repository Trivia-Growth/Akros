---
name: adr-0014-admin-edita-programa-inteiro
description: Ratifica a edição completa do Programa de visto pelo admin (nome, código, versão, fases, etapas, requisitos) — estende a exceção do ADR-0013 a todo o catálogo; a salvaguarda continua sendo o congelamento por versão dos casos instanciados.
alwaysApply: false
---

# ADR-0014 — Admin edita o Programa inteiro; versão congelada protege quem já está no processo

**Status:** Aceito
**Data:** 2026-09-08
**Decisores:** Akros (Bruno Luz) — decisão direta em conversa de operação
**Relacionados:** ADR-0004, ADR-0013, specs/E06-S05-editor-etapas-analise-ia/,
specs/E06-S04-catalogo-programas/

## Contexto
O ADR-0004 registrou o Programa como dado versionado com o admin **somente leitura** ("Editor de
programas no admin" como não-objetivo da rodada). O ADR-0013 (2026-09-07) abriu a exceção pontual
para `RequisitoDocumento`, assumindo que o restante do Programa continuaria imutável pela UI.

Ao implementar E06-S05, descobriu-se que a invariante já não valia na prática: um `ProgramaEditor`
que edita nome, código, versão, fases e etapas já existia no código anterior (sem ADR que o
autorizasse), e a migration `0015` já liberava INSERT/UPDATE admin em `programas` via PostgREST.
Ou seja, a plataforma **já permitia** edição ampla sem salvaguarda documentada — o que o
ADR-0004 proibia de jure acontecia de facto, numa zona cinzenta sem decisão registrada.

Em 2026-09-08, o Bruno decidiu explicitamente: **o admin pode editar o que quiser nos planos**.

## Decisão
1. **O catálogo de Programas é livremente editável pelo admin pela UI** — nome, código, versão,
   fases (criar/editar/reordenar/remover), etapas e requisitos de documento. Não há superfície do
   Programa reservada à equipe de desenvolvimento; ajuste operacional não exige deploy.
2. **A salvaguarda do ADR-0004 continua valendo pelo mecanismo de versão, não pela imutabilidade
   da UI:** a jornada já instanciada de um cliente referencia `programaVersao` e **não muda**
   quando o template é editado. Quem está no processo preserva o checklist e as fases com que
   começou; a edição afeta apenas novos casos (e a leitura do template corrente).
3. **Requisitos com vínculo seguem o ADR-0013:** remover um requisito que já tem `Documento` de
   cliente apontando continua bloqueado — desativa-se em vez de excluir. A liberdade de edição
   não se estende a apagar histórico de cliente.
4. **A invariante do ADR-0005 não se move:** análise por IA (skill/referência) muda o parecer,
   nunca o `Documento.status`.

## Alternativas consideradas
| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| Manter só a exceção do ADR-0013 e remover o `ProgramaEditor` pré-existente | volta ao escopo documentado | apaga funcionalidade que a operação já usa; o gargalo de deploy que motivou o pedido volta | o Bruno decidiu o oposto: liberdade total de edição |
| Edição livre sem congelamento por versão (edição propaga para casos em andamento) | modelo mais simples de dados | muda o checklist de cliente no meio do processo, sem consentimento — inaceitável para imigração | o congelamento por `programaVersao` é o mecanismo certo desde o ADR-0004 e se mantém |
| Versionamento automático com migração de casos (diff de template) | edição livre + histórico completo de versões | projeto grande, sem demanda atual | quando o histórico de versões do template virar necessidade, vira story própria |

## Consequências
- A zona cinzenta fecha: de jure acompanha de facto, agora com a salvaguarda documentada. O
  ADR-0013 permanece como o registro do **porquê** da exceção ter começado pontual; este ADR a
  amplia ao catálogo inteiro por decisão do dono do produto.
- Novos campos editáveis no futuro (ex.: `sujeito`, `categoria` — hoje fora do formulário) entram
  sem novo ADR: esta decisão cobre a superfície do Programa como um todo.
- Se um caso precisar re-gravar sua jornada para uma versão nova do template, é operação de
  suporte via banco, com trilha de auditoria — não feature de UI neste momento.
