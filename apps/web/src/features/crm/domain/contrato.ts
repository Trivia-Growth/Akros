/**
 * E03-S07 (US1) — domínio puro de Contrato. Espelha as regras de `crm.contratos` e
 * `crm.contrato_condicoes` da migration 0017 (CHECKs de prazo e valor) para que a UI valide
 * antes de enviar ao servidor. O servidor valida de novo via CHECK — defesa em profundidade,
 * não confiança cega no cliente. Ver spec.md FR-023 e design-tecnico.md §1.1.
 */

export type Prioridade = "padrao" | "prioritaria";

export interface ContratoCondicao {
  id: string;
  descricao: string;
  tipo: "entrada" | "parcela" | "taxa_federal" | "outro";
  valor: number; // > 0, espelha CHECK de crm.contrato_condicoes (0017)
  moeda: "BRL" | "USD";
  vencimento: string; // ISO date
  ordem: number;
}

export interface Contrato {
  id: string;
  clienteId: string;
  programaId: string;
  programaVersao: string;
  assinadoEm?: string;
  /** 1 a 60, espelha CHECK de crm.contratos (0017). */
  prazoRespostaDiasUteis: number;
  prioridade: Prioridade;
  observacao?: string;
  condicoes: ContratoCondicao[];
  registradoPor: string;
  registradoEm: string;
  ativo: boolean;
}

const PRAZO_RESPOSTA_MIN_DIAS_UTEIS = 1;
const PRAZO_RESPOSTA_MAX_DIAS_UTEIS = 60;

/**
 * Espelha o CHECK de `crm.contratos` (0017): prazo de resposta entre 1 e 60 dias úteis
 * (limites inclusive).
 */
export function prazoRespostaValido(dias: number): boolean {
  return dias >= PRAZO_RESPOSTA_MIN_DIAS_UTEIS && dias <= PRAZO_RESPOSTA_MAX_DIAS_UTEIS;
}

/**
 * Espelha o CHECK de `crm.contrato_condicoes` (0017): cada condição precisa de valor > 0.
 * Lista vazia é válida — contrato pode ainda não ter condição financeira registrada
 * (cadastro incompleto é tratado em `caso.ts`, não aqui).
 */
export function condicoesValidas(condicoes: ContratoCondicao[]): boolean {
  return condicoes.every((condicao) => condicao.valor > 0);
}

/**
 * FR-023 — deriva as cobranças a partir das condições do contrato registrado. Hoje é
 * identidade; T092 (fase 7, futura) vai estendê-la para gerar `pagamentos.pagamentos`.
 */
export function derivarCobrancas(contrato: Contrato): ContratoCondicao[] {
  return contrato.condicoes;
}
