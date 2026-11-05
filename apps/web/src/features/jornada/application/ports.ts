import type { ResponsavelEtapa } from "@/features/programas/domain/types";
import type { Jornada } from "../domain/types";
import type { PrevisaoProtocolo, ProgressoCaso } from "./calcular-previsao";

/** Leitura do agregado já limitado por RLS ao cliente autenticado. */
export interface JornadaConsulta {
  carregarCliente(): Promise<Jornada | null>;
}

export interface JornadaRepository {
  obterPorCliente(clienteId: string): Promise<Jornada | null>;
  liberarFase(clienteId: string, faseId: string): Promise<void>;
  /** Cliente enviou (pendente → em_analise) — não conclui nada sozinho. */
  enviarEtapaParaAvaliacao(clienteId: string, etapaId: string): Promise<void>;
  /** Akros aprova (em_analise → concluida) — dispara notificação pro cliente. */
  aprovarEtapa(clienteId: string, etapaId: string): Promise<void>;
  /** Akros devolve (em_analise → pendente) — cliente reenvia. */
  devolverEtapaParaAjuste(clienteId: string, etapaId: string, motivo: string): Promise<void>;
}

/**
 * SPEC_DEVIATION (E00-S04, AC-1): a spec lista ProgressoRepository como porta separada de
 * JornadaRepository. O design.md desta story modela progresso como parte do agregado Jornada
 * (Fase/Etapa já carregam status). Para não duplicar estado, ProgressoRepository é uma view
 * read-only fina sobre o mesmo dado de JornadaRepository — satisfaz o AC sem duplicar fonte de verdade.
 */
export interface ProgressoRepository {
  calcularPercentual(clienteId: string): Promise<number>;
}

/** E03-S07 (Fase 6/US3) — admin decide etapa e libera fase, contra a Edge Function
 *  `revisao-comandos`. Substitui `JornadaRepository.liberarFase`/`aprovarEtapa`/
 *  `devolverEtapaParaAjuste` (mock) fora do modo demo. */
export interface JornadaComandos {
  decidirEtapa(input: {
    etapaId: string;
    decisao: "concluida" | "pendente";
    motivo?: string;
    revisaoEsperada: number;
  }): Promise<void>;
  liberarFase(input: { faseId: string; revisaoEsperada: number }): Promise<void>;
}

/** E03-S07 (Fase 9/US7) — progresso e previsão de protocolo, contra `jornada.progresso_caso` e
 *  `jornada.previsao_protocolo`. Sem parâmetro de cliente no portal — a RPC resolve o próprio
 *  caso via `crm.meu_cliente_id()` quando chamada sem admin. */
export interface ProgressoConsulta {
  carregarCliente(): Promise<{ progresso: ProgressoCaso; previsao: PrevisaoProtocolo }>;
}

/** Visão administrativa transversal. Agrega somente linhas já autorizadas por RLS. */
export interface OperacaoAdminConsulta {
  carregarAdmin(): Promise<{
    gargalos: {
      titulo: string;
      responsavel: ResponsavelEtapa;
      mediaDias: number;
      casos: number;
    }[];
    alertas: {
      clienteId: string;
      clienteNome: string;
      tipo: "inatividade" | "etapa_travada";
      dias: number;
      etapaTitulo?: string;
    }[];
  }>;
}
