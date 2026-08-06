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
}

export type TipoInteracao = "email" | "whatsapp" | "reuniao" | "mudanca_fase" | "nota";

export interface Interacao {
  id: string;
  clienteId: string;
  tipo: TipoInteracao;
  descricao: string;
  ocorridoEm: string;
}

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
