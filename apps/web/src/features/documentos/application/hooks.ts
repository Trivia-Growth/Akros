import { useMockDb } from "@/mocks/store";
import type { Documento, SolicitacaoAssinatura } from "../domain/types";

export function useDocumentosCliente(clienteId: string | undefined): Documento[] {
  return useMockDb((s) => (clienteId ? s.documentos.filter((d) => d.clienteId === clienteId) : []));
}

export function useSolicitacoesAssinatura(documentoIds: string[]): SolicitacaoAssinatura[] {
  return useMockDb((s) =>
    s.solicitacoesAssinatura.filter((sol) => documentoIds.includes(sol.documentoId)),
  );
}
