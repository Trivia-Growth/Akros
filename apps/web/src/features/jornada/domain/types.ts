export type FaseStatus = "bloqueada" | "liberada" | "em_andamento" | "concluida";
export type EtapaStatus = "pendente" | "concluida";

export interface Etapa {
  id: string;
  titulo: string;
  descricao: string;
  status: EtapaStatus;
  prazoMedioDiasUteis?: number;
  documentosRequeridos?: string[];
}

export interface Fase {
  id: string;
  ordem: number; // 0 = Introdução, 1..5 = fases
  titulo: string;
  descricao: string;
  status: FaseStatus;
  etapas: Etapa[];
}

export interface Jornada {
  id: string;
  clienteId: string;
  faseAtualId: string;
  fases: Fase[];
}
