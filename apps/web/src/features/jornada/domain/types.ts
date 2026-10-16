import type { ResponsavelEtapa } from "@/features/programas/domain/types";

export type FaseStatus = "bloqueada" | "liberada" | "em_andamento" | "concluida";
/**
 * E09-S05 — o cliente nunca conclui uma etapa sozinho. Ele envia (pendente → em_analise); só a
 * Akros aprova (em_analise → concluida) ou devolve pra ajuste (em_analise → pendente de novo).
 */
export type EtapaStatus = "pendente" | "em_analise" | "concluida";

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
  /** E03-S07/FR-022: contrato que originou esta jornada (`crm.contratos.id`). */
  contratoId?: string;
  /** E03-S07/FR-013: estado do levantamento inicial — "incompleto" nunca pode aparecer como
   * "tudo em dia" (cadastro incompleto é distinto de ausência de pendência). */
  levantamentoEstado?: "incompleto" | "conferido";
  conferidoPor?: string;
  conferidoEm?: string;
  /** E03-S07: origem da situação inicial quando o cliente entra em andamento (histórico
   * importado, distinto de evento novo). */
  origemSituacaoInicial?: string;
}
