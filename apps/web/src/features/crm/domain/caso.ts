/**
 * E03-S07 (US1) — domínio puro de situação do caso. Campos espelham o que
 * `crm.resumo_caso` (design-tecnico.md §1.6, ainda não implementada) precisa expor.
 * Ver spec.md FR-001, FR-002, FR-013, FR-022.
 */

import type { Contrato } from "./contrato";

export type LevantamentoEstado = "incompleto" | "conferido";

export interface SituacaoCaso {
  clienteId: string;
  contrato?: Contrato; // ausente = cadastro incompleto (FR-022)
  levantamentoEstado: LevantamentoEstado;
  faseAtualTitulo?: string;
  responsavel?: string;
  proximaAcao?: string;
  pendenciasCliente: number;
  pendenciasAkros: number;
  pendenciasTerceiro: number;
}

export interface ProximaAcao {
  texto: string;
  responsavel: "cliente" | "akros" | "terceiro";
}

/**
 * FR-001/FR-002/FR-013/FR-022 — próxima ação do caso, na ordem:
 * 1. Sem contrato → cadastro incompleto, registrar contrato (responsável Akros).
 * 2. Com contrato mas levantamento inicial "incompleto" → concluir levantamento
 *    (responsável Akros). SEMPRE retorna esta ação aqui, mesmo que as três pendências
 *    estejam zeradas — FR-013 exige distinguir ausência de dado de ausência de pendência;
 *    cadastro incompleto nunca pode parecer "tudo em dia".
 * 3. Pendência de cliente > 0 → responsável é o cliente.
 * 4. Pendência de Akros > 0 → responsável é a equipe Akros.
 * 5. Pendência de terceiro > 0 → responsável é o terceiro.
 * 6. Nenhuma pendência → `undefined` (nada pendente de verdade, não "não sabemos").
 */
export function calcularProximaAcao(situacao: SituacaoCaso): ProximaAcao | undefined {
  if (!situacao.contrato) {
    return { texto: "Registrar contrato do caso", responsavel: "akros" };
  }

  if (situacao.levantamentoEstado === "incompleto") {
    return { texto: "Concluir levantamento inicial", responsavel: "akros" };
  }

  if (situacao.pendenciasCliente > 0) {
    return { texto: "Aguardando o cliente", responsavel: "cliente" };
  }

  if (situacao.pendenciasAkros > 0) {
    return { texto: "Aguardando a equipe Akros", responsavel: "akros" };
  }

  if (situacao.pendenciasTerceiro > 0) {
    return { texto: "Aguardando terceiro", responsavel: "terceiro" };
  }

  return undefined;
}

/**
 * Contrato de forma: repassa os três contadores já estruturados de `SituacaoCaso`.
 * A contagem real a partir de documentos/pagamentos/etapas é dado que vem de fora
 * (servidor ou outra camada) — mantém o nome estável para quem vier substituir por
 * lógica real.
 */
export function contarPendenciasPorResponsavel(situacao: SituacaoCaso): {
  cliente: number;
  akros: number;
  terceiro: number;
} {
  return {
    cliente: situacao.pendenciasCliente,
    akros: situacao.pendenciasAkros,
    terceiro: situacao.pendenciasTerceiro,
  };
}
