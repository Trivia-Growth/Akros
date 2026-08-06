import { comLatencia, useMockDb } from "@/mocks/store";
import type { AgenteService, ConversaRepository } from "../application/ports";
import type { Conversa, RegraAtendimentoIA } from "../domain/types";

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
}
