export type SaudeCaso = "em_dia" | "atencao" | "atrasado";

export interface Cliente {
  id: string;
  leadOrigemId?: string;
  nome: string;
  email: string;
  telefone: string;
  tipoVisto: string;
  caseManager: string;
  criadoEm: string;
  saude: SaudeCaso;
  /** E06-S03: programa que originou a jornada deste cliente. Versão congelada — ADR-0004. */
  programaId?: string;
  programaVersao?: string;
}

// SPEC_DEVIATION (E08-S01): `Interacao`/`TipoInteracao` foram removidos — absorvidos por
// `EventoComunicacao` (features/comunicacao/domain/types.ts), ver ADR-0006.

export type PropostaStatus = "rascunho" | "enviada" | "aceita" | "recusada";

export interface Proposta {
  id: string;
  leadOuClienteId: string;
  escopo: string;
  tipoVisto: string;
  valor: number;
  moeda: "BRL" | "USD";
  condicoes: string;
  status: PropostaStatus;
  criadoEm: string;
}
