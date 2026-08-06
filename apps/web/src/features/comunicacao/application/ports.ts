import type { Conversa, RegraAtendimentoIA } from "../domain/types";

export interface ConversaRepository {
  listarTodas(): Promise<Conversa[]>;
  obterPorCliente(clienteId: string): Promise<Conversa | null>;
  enviarMensagem(conversaId: string, texto: string): Promise<void>;
}

export interface AgenteService {
  obterConfig(): Promise<RegraAtendimentoIA>;
  atualizarConfig(patch: Partial<RegraAtendimentoIA>): Promise<void>;
  simularResposta(pergunta: string): Promise<{ resposta: string; handoff: boolean }>;
}
