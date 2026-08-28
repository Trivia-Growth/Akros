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
/**
 * E04-S13 — caminho no OneDrive/Drive de um documento: pasta raiz corporativa (Configurações,
 * conta com escopo "arquivos") + pasta do cliente (editável, padrão = nome) + subpasta pela fase
 * em que o documento foi carregado.
 */
export function caminhoArquivoDrive(input: {
  pastaRaiz: string | undefined;
  pastaCliente: string;
  faseTitulo: string | undefined;
  documentoNome: string;
}): string | null {
  if (!input.pastaRaiz) return null;
  const segmentos = [input.pastaRaiz, input.pastaCliente, input.faseTitulo, input.documentoNome];
  return segmentos.filter(Boolean).join("/");
}

export function useContaArquivosAtiva() {
  return useMockDb((s) => s.contasAgenda.find((c) => c.ativa && c.escopos.includes("arquivos")));
}

export function useCaminhoArquivoDrive(documento: Documento): string | null {
  const conta = useContaArquivosAtiva();
  const cliente = useMockDb((s) => s.clientes.find((c) => c.id === documento.clienteId));
  const jornada = useMockDb((s) => s.jornadas.find((j) => j.clienteId === documento.clienteId));
  const faseTitulo = jornada?.fases.find((f) => f.id === documento.faseId)?.titulo;
  if (!cliente) return null;
  return caminhoArquivoDrive({
    pastaRaiz: conta?.pastaRaiz,
    pastaCliente: cliente.pastaDriveNome || cliente.nome,
    faseTitulo,
    documentoNome: documento.nome,
  });
}

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
