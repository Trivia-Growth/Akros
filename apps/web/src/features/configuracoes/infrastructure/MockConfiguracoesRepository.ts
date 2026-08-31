import { comLatencia, useMockDb } from "@/mocks/store";
import type { ConfiguracoesRepository } from "../application/ports";
import type {
  ContaCanalConectada,
  ContaConectada,
  CredenciaisContaAgenda,
  IntegracaoExterna,
  ProvedorAgenda,
  ProvedorCanal,
} from "../domain/types";

export class MockConfiguracoesRepository implements ConfiguracoesRepository {
  async atualizarIntegracao(
    integracaoId: string,
    patch: Pick<Partial<IntegracaoExterna>, "ativa"> & { apiKey?: string },
  ): Promise<void> {
    useMockDb.getState().atualizarIntegracao(integracaoId, patch);
    return comLatencia(undefined);
  }

  async atualizarCredenciaisMeta(
    integracaoId: string,
    patch: {
      ativa: boolean;
      appId: string;
      appSecret?: string;
      accessToken?: string;
      webhookVerifyToken: string;
      contaInstagramId: string;
    },
  ): Promise<void> {
    useMockDb.getState().atualizarCredenciaisMeta(integracaoId, patch);
    return comLatencia(undefined);
  }

  async conectarContaAgenda(input: {
    provedor: ProvedorAgenda;
    nomeExibicao: string;
    credenciais: CredenciaisContaAgenda;
    escopos: ContaConectada["escopos"];
    donoId: string;
    emailEndereco?: string;
    pastaRaiz?: string;
  }): Promise<ContaConectada> {
    const conta = useMockDb.getState().conectarContaAgenda(input);
    return comLatencia(conta);
  }

  async desconectarContaAgenda(contaId: string): Promise<void> {
    useMockDb.getState().desconectarContaAgenda(contaId);
    return comLatencia(undefined);
  }

  async atualizarContaConectada(contaId: string, patch: Partial<ContaConectada>): Promise<void> {
    useMockDb.getState().atualizarContaConectada(contaId, patch);
    return comLatencia(undefined);
  }

  async conectarContaCanal(input: {
    provedor: ProvedorCanal;
    nomeExibicao: string;
    identificador: string;
  }): Promise<ContaCanalConectada> {
    const conta = useMockDb.getState().conectarContaCanal(input);
    return comLatencia(conta);
  }

  async desconectarContaCanal(contaId: string): Promise<void> {
    useMockDb.getState().desconectarContaCanal(contaId);
    return comLatencia(undefined);
  }
}
