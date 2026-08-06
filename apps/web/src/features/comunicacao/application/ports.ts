import type { Conversa, EventoComunicacao, RegraAtendimentoIA } from "../domain/types";

export interface ConversaRepository {
  listarTodas(): Promise<Conversa[]>;
  obterPorCliente(clienteId: string): Promise<Conversa | null>;
  enviarMensagem(conversaId: string, texto: string): Promise<void>;
}

/** Timeline unificada (E08-S01 / ADR-0006). Absorve o antigo ClienteRepository.historico. */
export interface TimelineRepository {
  listarPorCliente(clienteOuLeadId: string): Promise<EventoComunicacao[]>;
  registrar(evento: Omit<EventoComunicacao, "id">): Promise<EventoComunicacao>;
  resolverPendenciaDeCanal(eventoId: string): Promise<void>;
}

export interface AgenteService {
  obterConfig(): Promise<RegraAtendimentoIA>;
  atualizarConfig(patch: Partial<RegraAtendimentoIA>): Promise<void>;
  simularResposta(pergunta: string): Promise<{ resposta: string; handoff: boolean }>;
}
