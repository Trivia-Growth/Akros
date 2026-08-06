import type { ResponsavelEtapa } from "@/features/programas/domain/types";

export type FaseStatus = "bloqueada" | "liberada" | "em_andamento" | "concluida";
export type EtapaStatus = "pendente" | "concluida";

export interface Etapa {
  id: string;
  titulo: string;
  descricao: string;
  status: EtapaStatus;
  prazoMedioDiasUteis?: number;
  documentosRequeridos?: string[];
  /** E09-S01: de quem depende esta etapa agora. */
  responsavel: ResponsavelEtapa;
  responsavelDetalhe?: string;
  /** Desde quando a etapa está no status atual — base do tempo parado (E09-S01/S03). */
  desdeEm?: string;
  /** E09-S02 — datas reais para calcular o fator de ritmo. Fixture-only enquanto não há backend. */
  iniciadaEm?: string;
  concluidaRealEm?: string;
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
  /** E06-S01: programa que originou esta jornada. Versão congelada — ADR-0004. */
  programaId?: string;
  programaVersao?: string;
}
