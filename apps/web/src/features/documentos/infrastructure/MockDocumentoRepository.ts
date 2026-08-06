import { comLatencia, useMockDb } from "@/mocks/store";
import type { AssinaturaService, DocumentoRepository } from "../application/ports";
import type { Documento, SolicitacaoAssinatura } from "../domain/types";

export class MockDocumentoRepository implements DocumentoRepository {
  async listarPorCliente(clienteId: string): Promise<Documento[]> {
    const docs = useMockDb.getState().documentos.filter((d) => d.clienteId === clienteId);
    return comLatencia(docs);
  }

  async obter(id: string): Promise<Documento | null> {
    const doc = useMockDb.getState().documentos.find((d) => d.id === id) ?? null;
    return comLatencia(doc);
  }

  async registrarEnvio(id: string, urlMock: string): Promise<void> {
    useMockDb.getState().registrarEnvioDocumento(id, urlMock);
    return comLatencia(undefined);
  }

  async confirmarEnvioApesarDoAlerta(id: string): Promise<void> {
    useMockDb.getState().confirmarEnvioApesarDoAlerta(id);
    return comLatencia(undefined);
  }

  async decidir(
    id: string,
    decisao: "aprovado" | "ajustes",
    autor: string,
    motivoAjuste?: string,
  ): Promise<void> {
    useMockDb.getState().decidirDocumento(id, decisao, autor, motivoAjuste);
    return comLatencia(undefined);
  }
}

export class MockAssinaturaService implements AssinaturaService {
  async listarPorCliente(clienteId: string): Promise<SolicitacaoAssinatura[]> {
    const docsDoCliente = new Set(
      useMockDb
        .getState()
        .documentos.filter((d) => d.clienteId === clienteId)
        .map((d) => d.id),
    );
    const solicitacoes = useMockDb
      .getState()
      .solicitacoesAssinatura.filter((s) => docsDoCliente.has(s.documentoId));
    return comLatencia(solicitacoes);
  }

  async assinar(id: string, nomeAssinante: string): Promise<void> {
    useMockDb.getState().assinarSolicitacao(id, nomeAssinante);
    return comLatencia(undefined);
  }
}
