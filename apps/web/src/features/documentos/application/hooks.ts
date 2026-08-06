import { container } from "@/app/di";
// SPEC_DEVIATION (E07-S01): documentos/application conhece programas para resolver o requisito
// (tipoEsperado/objetivo) que a análise de IA usa — mesma exceção documentada para jornada→programas
// no design de E06-S01. dependency-cruiser não proíbe (só bloqueia domain/application→infra/borda).
import type { RequisitoDocumento } from "@/features/programas/domain/types";
import { catalogoProgramas } from "@/mocks/programas";
import { useMockDb } from "@/mocks/store";
import { useMemo } from "react";
import type { Documento, SolicitacaoAssinatura, TipoDocumento } from "../domain/types";

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

/** E06-S01 — resolve o requisito do catálogo do programa que originou o documento. */
export function requisitoDoDocumento(documento: Documento): RequisitoDocumento | undefined {
  if (!documento.requisitoId) return undefined;
  for (const programa of catalogoProgramas) {
    const requisito = programa.documentosExigidos.find((r) => r.id === documento.requisitoId);
    if (requisito) return requisito;
  }
  return undefined;
}

/**
 * E07-S02 AC-1 — upload dispara a análise imediatamente. Retorna o parecer para a UI decidir
 * o que mostrar; quem persiste é o próprio use case (registrarEnvio + salvarAnaliseDocumento).
 */
export async function enviarEAnalisarDocumento(documento: Documento, urlMock: string) {
  await container.documentos.registrarEnvio(documento.id, urlMock);
  const requisito = requisitoDoDocumento(documento);
  const analise = await container.analiseDocumento.analisar({
    documentoId: documento.id,
    tipoEsperado: (requisito?.tipo as TipoDocumento | undefined) ?? documento.tipo,
    objetivoRequisito: requisito?.objetivo ?? "",
  });
  useMockDb.getState().salvarAnaliseDocumento(documento.id, analise);
  return analise;
}
