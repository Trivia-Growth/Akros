import type {
  Conversa,
  EmailThread,
  EventoComunicacao,
  FonteConhecimento,
  Mensagem,
  RegraAtendimentoIA,
} from "../domain/types";

export interface ConversaRepository {
  listarTodas(): Promise<Conversa[]>;
  obterPorCliente(clienteId: string): Promise<Conversa | null>;
  enviarMensagem(conversaId: string, texto: string): Promise<void>;
  enviarMensagemRica(
    conversaId: string,
    mensagem: Pick<Mensagem, "tipo" | "midiaNome" | "duracaoSegundos"> & { texto?: string },
  ): Promise<void>;
  transcreverMensagem(conversaId: string, mensagemId: string): Promise<void>;
}

/** E04-S12 — inbox de e-mail unificado (thread própria, funde na timeline só na leitura). */
export interface EmailRepository {
  marcarComoLido(threadId: string): Promise<void>;
  responder(threadId: string, corpo: string): Promise<void>;
}

/** E04-S10 — catálogo de fontes de conhecimento compartilhado entre agentes. */
export interface BaseConhecimentoRepository {
  salvar(fonte: Omit<FonteConhecimento, "id"> & { id?: string }): Promise<FonteConhecimento>;
}

/** Timeline unificada (E08-S01 / ADR-0006). Absorve o antigo ClienteRepository.historico. */
export interface TimelineRepository {
  listarPorCliente(clienteOuLeadId: string): Promise<EventoComunicacao[]>;
  registrar(evento: Omit<EventoComunicacao, "id">): Promise<EventoComunicacao>;
  resolverPendenciaDeCanal(eventoId: string): Promise<void>;
}

/** Leitura do histórico do cliente autenticado. RLS define o vínculo, não ids de fixtures. */
export interface ComunicacaoConsulta {
  carregarCliente(): Promise<EventoComunicacao[]>;
}

export interface ResumoAgenteIA {
  id: string;
  nome: string;
  funcao: string;
  ativo: boolean;
}

export interface ComunicacaoAdminConsulta {
  carregarAdmin(): Promise<{
    conversas: Conversa[];
    emails: EmailThread[];
    eventos: EventoComunicacao[];
    agentes: ResumoAgenteIA[];
    fontes: FonteConhecimento[];
  }>;
}

export interface AgenteService {
  obterConfig(): Promise<RegraAtendimentoIA>;
  atualizarConfig(patch: Partial<RegraAtendimentoIA>): Promise<void>;
  simularResposta(pergunta: string): Promise<{ resposta: string; handoff: boolean }>;
  /** E04-S09+ — upsert de um agente na lista `agentesIA` (multiagente). */
  salvarAgente(agente: RegraAtendimentoIA): Promise<void>;
}
