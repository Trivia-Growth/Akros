import { comLatencia, useMockDb } from "@/mocks/store";
import type {
  AgenteService,
  BaseConhecimentoRepository,
  ConversaRepository,
  EmailRepository,
  TimelineRepository,
} from "../application/ports";
import type {
  Conversa,
  EventoComunicacao,
  FonteConhecimento,
  Mensagem,
  RegraAtendimentoIA,
} from "../domain/types";

export class MockConversaRepository implements ConversaRepository {
  async listarTodas(): Promise<Conversa[]> {
    return comLatencia(useMockDb.getState().conversas);
  }

  async obterPorCliente(clienteId: string): Promise<Conversa | null> {
    const conversa = useMockDb.getState().conversas.find((c) => c.clienteId === clienteId) ?? null;
    return comLatencia(conversa);
  }

  async enviarMensagem(conversaId: string, texto: string): Promise<void> {
    useMockDb.getState().enviarMensagemConversa(conversaId, texto);
    return comLatencia(undefined);
  }

  async enviarMensagemRica(
    conversaId: string,
    mensagem: Pick<Mensagem, "tipo" | "midiaNome" | "duracaoSegundos"> & { texto?: string },
  ): Promise<void> {
    useMockDb.getState().enviarMensagemConversaRica(conversaId, mensagem);
    return comLatencia(undefined);
  }

  async transcreverMensagem(conversaId: string, mensagemId: string): Promise<void> {
    useMockDb.getState().transcreverMensagem(conversaId, mensagemId);
    return comLatencia(undefined);
  }
}

export class MockAgenteService implements AgenteService {
  async obterConfig(): Promise<RegraAtendimentoIA> {
    return comLatencia(useMockDb.getState().regraAtendimentoIA);
  }

  async atualizarConfig(patch: Partial<RegraAtendimentoIA>): Promise<void> {
    useMockDb.getState().atualizarConfigAgente(patch);
    return comLatencia(undefined);
  }

  async simularResposta(pergunta: string): Promise<{ resposta: string; handoff: boolean }> {
    const config = useMockDb.getState().regraAtendimentoIA;
    const perguntaNormalizada = pergunta.toLowerCase();
    const topico = config.topicos.find((t) => perguntaNormalizada.includes(t.pergunta));

    if (topico) {
      return comLatencia({ resposta: topico.resposta, handoff: false });
    }
    return comLatencia({ resposta: config.mensagemHandoff, handoff: true });
  }

  async salvarAgente(agente: RegraAtendimentoIA): Promise<void> {
    useMockDb.getState().salvarAgenteIA(agente);
    return comLatencia(undefined);
  }
}

export class MockEmailRepository implements EmailRepository {
  async marcarComoLido(threadId: string): Promise<void> {
    useMockDb.getState().marcarEmailThreadComoLida(threadId);
    return comLatencia(undefined);
  }

  async responder(threadId: string, corpo: string): Promise<void> {
    useMockDb.getState().enviarEmailThread(threadId, corpo);
    return comLatencia(undefined);
  }
}

export class MockBaseConhecimentoRepository implements BaseConhecimentoRepository {
  async salvar(fonte: Omit<FonteConhecimento, "id"> & { id?: string }): Promise<FonteConhecimento> {
    const criada = useMockDb.getState().salvarBaseConhecimento(fonte);
    return comLatencia(criada);
  }
}

export class MockTimelineRepository implements TimelineRepository {
  async listarPorCliente(clienteOuLeadId: string): Promise<EventoComunicacao[]> {
    const eventos = useMockDb
      .getState()
      .eventosComunicacao.filter((e) => e.clienteOuLeadId === clienteOuLeadId)
      .sort((a, b) => a.ocorridoEm.localeCompare(b.ocorridoEm));
    return comLatencia(eventos);
  }

  async registrar(evento: Omit<EventoComunicacao, "id">): Promise<EventoComunicacao> {
    const criado = useMockDb.getState().registrarEvento(evento);
    return comLatencia(criado);
  }

  async resolverPendenciaDeCanal(eventoId: string): Promise<void> {
    useMockDb.getState().resolverPendenciaDeCanal(eventoId);
    return comLatencia(undefined);
  }
}
