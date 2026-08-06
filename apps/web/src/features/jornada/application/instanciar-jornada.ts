import type { Programa } from "@/features/programas/domain/types";
import type { Etapa, Fase, Jornada } from "../domain/types";

/**
 * E06-S01 — instancia uma Jornada a partir do template de um Programa. Pura, sem I/O.
 * `jornada` é quem conhece `programas` (não o inverso) — ver ADR-0004 e design de E06-S01.
 */
export function instanciarJornada(
  programa: Programa,
  clienteId: string,
  jornadaId: string,
): Jornada {
  const fases: Fase[] = programa.fasesTemplate
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((faseTemplate) => {
      const etapas: Etapa[] = faseTemplate.etapas.map((etapaTemplate) => ({
        id: etapaTemplate.id,
        titulo: etapaTemplate.titulo,
        descricao: etapaTemplate.descricao,
        status: "pendente",
        prazoMedioDiasUteis: etapaTemplate.prazoMedioDiasUteis,
        documentosRequeridos: etapaTemplate.documentosRequeridos,
        responsavel: etapaTemplate.responsavel,
        responsavelDetalhe: etapaTemplate.responsavelDetalhe,
      }));

      return {
        id: faseTemplate.id,
        ordem: faseTemplate.ordem,
        titulo: faseTemplate.titulo,
        descricao: faseTemplate.descricao,
        status: faseTemplate.ordem === 0 ? ("liberada" as const) : ("bloqueada" as const),
        etapas,
      };
    });

  return {
    id: jornadaId,
    clienteId,
    faseAtualId: fases[0]?.id ?? "",
    fases,
    programaId: programa.codigo,
    programaVersao: programa.versao,
  };
}
