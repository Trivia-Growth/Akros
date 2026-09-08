import { getSupabase } from "@/shared/supabase/client";
import type { JornadaConsulta } from "../application/ports";
import type { Etapa, Fase, Jornada } from "../domain/types";

interface LinhaJornada {
  id: string;
  cliente_id: string;
  fase_atual_id: string | null;
  programa_id: string | null;
  programa_versao: string | null;
}

interface LinhaFase {
  id: string;
  jornada_id: string;
  ordem: number;
  titulo: string;
  descricao: string;
  status: Fase["status"];
}

interface LinhaEtapa {
  id: string;
  fase_id: string;
  titulo: string;
  descricao: string;
  status: Etapa["status"];
  prazo_medio_dias_uteis: number | null;
  documentos_requeridos: string[] | null;
  responsavel: Etapa["responsavel"];
  responsavel_detalhe: string | null;
  desde_em: string | null;
  iniciada_em: string | null;
  concluida_real_em: string | null;
}

export function paraJornada(
  jornada: LinhaJornada,
  fases: LinhaFase[],
  etapas: LinhaEtapa[],
): Jornada {
  return {
    id: jornada.id,
    clienteId: jornada.cliente_id,
    faseAtualId: jornada.fase_atual_id ?? "",
    fases: fases.map((fase) => ({
      id: fase.id,
      ordem: fase.ordem,
      titulo: fase.titulo,
      descricao: fase.descricao,
      status: fase.status,
      etapas: etapas
        .filter((etapa) => etapa.fase_id === fase.id)
        .map((etapa) => ({
          id: etapa.id,
          titulo: etapa.titulo,
          descricao: etapa.descricao,
          status: etapa.status,
          responsavel: etapa.responsavel,
          ...(etapa.prazo_medio_dias_uteis
            ? { prazoMedioDiasUteis: etapa.prazo_medio_dias_uteis }
            : {}),
          ...(etapa.documentos_requeridos?.length
            ? { documentosRequeridos: etapa.documentos_requeridos }
            : {}),
          ...(etapa.responsavel_detalhe ? { responsavelDetalhe: etapa.responsavel_detalhe } : {}),
          ...(etapa.desde_em ? { desdeEm: etapa.desde_em } : {}),
          ...(etapa.iniciada_em ? { iniciadaEm: etapa.iniciada_em } : {}),
          ...(etapa.concluida_real_em ? { concluidaRealEm: etapa.concluida_real_em } : {}),
        })),
    })),
    ...(jornada.programa_id ? { programaId: jornada.programa_id } : {}),
    ...(jornada.programa_versao ? { programaVersao: jornada.programa_versao } : {}),
  };
}

/** Leitura de jornada, fases e etapas pelo UUID permitido pelo RLS. */
export class SupabaseJornadaConsulta implements JornadaConsulta {
  async carregarCliente(): Promise<Jornada | null> {
    const { data: jornadas, error: erroJornadas } = await getSupabase()
      .schema("jornada")
      .from("jornadas")
      .select()
      .order("created_at", { ascending: false })
      .limit(1);
    if (erroJornadas) throw erroJornadas;

    const jornada = (jornadas as LinhaJornada[])[0];
    if (!jornada) return null;

    const { data: fases, error: erroFases } = await getSupabase()
      .schema("jornada")
      .from("fases")
      .select()
      .eq("jornada_id", jornada.id)
      .order("ordem");
    if (erroFases) throw erroFases;

    const fasesDaJornada = fases as LinhaFase[];
    const fasesIds = fasesDaJornada.map((fase) => fase.id);
    if (fasesIds.length === 0) return paraJornada(jornada, [], []);

    const { data: etapas, error: erroEtapas } = await getSupabase()
      .schema("jornada")
      .from("etapas")
      .select()
      .in("fase_id", fasesIds)
      .order("created_at");
    if (erroEtapas) throw erroEtapas;

    return paraJornada(jornada, fasesDaJornada, etapas as LinhaEtapa[]);
  }
}
