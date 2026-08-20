export type ReuniaoCanal = "calendly" | "gmail" | "outlook";
export type ReuniaoStatus = "agendada" | "realizada" | "cancelada";

export interface Reuniao {
  id: string;
  clienteId: string;
  titulo: string;
  inicio: string;
  fim: string;
  canal: ReuniaoCanal;
  status: ReuniaoStatus;
  transcricaoId?: string;
  /** Quem criou a reunião — agente_ia usa a ferramenta de agendamento (ADR-0007). */
  criadaPor?: "cliente" | "admin" | "agente_ia";
}

export type ProvedorTranscricao = "fireflies" | "microsoft_teams";

export interface Transcricao {
  id: string;
  reuniaoId: string;
  texto: string;
  resumo: string;
  actionItems: string[];
  criadoEm: string;
  provedor: ProvedorTranscricao;
}
