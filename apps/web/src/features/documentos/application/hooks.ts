import { useMockDb } from "@/mocks/store";
import { useMemo } from "react";
import type { Documento, SolicitacaoAssinatura } from "../domain/types";

export function useDocumentosCliente(clienteId: string | undefined): Documento[] {
  const documentos = useMockDb((s) => s.documentos);
  return useMemo(
    () => (clienteId ? documentos.filter((d) => d.clienteId === clienteId) : []),
    [documentos, clienteId],
  );
}

export function useSolicitacoesAssinatura(documentoIds: string[]): SolicitacaoAssinatura[] {
  const solicitacoes = useMockDb((s) => s.solicitacoesAssinatura);
  return useMemo(
    () => solicitacoes.filter((sol) => documentoIds.includes(sol.documentoId)),
    [solicitacoes, documentoIds],
  );
}
