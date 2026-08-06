import type { Documento, SolicitacaoAssinatura } from "../domain/types";

export interface DocumentoRepository {
  listarPorCliente(clienteId: string): Promise<Documento[]>;
  obter(id: string): Promise<Documento | null>;
  registrarEnvio(id: string, urlMock: string): Promise<void>;
}

export interface AssinaturaService {
  listarPorCliente(clienteId: string): Promise<SolicitacaoAssinatura[]>;
  assinar(id: string, nomeAssinante: string): Promise<void>;
}
