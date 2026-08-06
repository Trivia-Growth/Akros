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
}

export interface Transcricao {
  id: string;
  reuniaoId: string;
  texto: string;
  resumo: string;
  actionItems: string[];
  criadoEm: string;
}
