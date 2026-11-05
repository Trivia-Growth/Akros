import { getSupabase } from "@/shared/supabase/client";
import type { PrevisaoProtocolo, ProgressoCaso } from "../application/calcular-previsao";
import type { ProgressoConsulta } from "../application/ports";

interface LinhaProgresso {
  percentual: number | null;
  requisitos_total: number;
  requisitos_concluidos: number;
  etapas_total: number;
  etapas_concluidas: number;
  criterio: ProgressoCaso["criterio"];
  calculado_em: string;
}

interface LinhaPrevisao {
  data_estimada: string | null;
  motivo_sem_previsao: PrevisaoProtocolo["motivoSemPrevisao"];
  entregas_consideradas: number;
  ritmo_dias_por_requisito: number | null;
  calculado_em: string;
}

function paraProgresso(linha: LinhaProgresso): ProgressoCaso {
  return {
    percentual: linha.percentual,
    requisitosTotal: linha.requisitos_total,
    requisitosConcluidos: linha.requisitos_concluidos,
    etapasTotal: linha.etapas_total,
    etapasConcluidas: linha.etapas_concluidas,
    criterio: linha.criterio,
    calculadoEm: linha.calculado_em,
  };
}

function paraPrevisao(linha: LinhaPrevisao): PrevisaoProtocolo {
  return {
    dataEstimada: linha.data_estimada,
    motivoSemPrevisao: linha.motivo_sem_previsao,
    entregasConsideradas: linha.entregas_consideradas,
    ritmoDiasPorRequisito: linha.ritmo_dias_por_requisito,
    calculadoEm: linha.calculado_em,
  };
}

/** Leitura de progresso/previsão do próprio caso (portal), pelo UUID permitido pelo RLS. */
export class SupabaseProgressoConsulta implements ProgressoConsulta {
  async carregarCliente() {
    const [progresso, previsao] = await Promise.all([
      getSupabase().schema("jornada").rpc("progresso_caso", { p_cliente_id: null }),
      getSupabase().schema("jornada").rpc("previsao_protocolo", { p_cliente_id: null }),
    ]);
    if (progresso.error) throw progresso.error;
    if (previsao.error) throw previsao.error;

    const linhaProgresso = (progresso.data as LinhaProgresso[])[0];
    const linhaPrevisao = (previsao.data as LinhaPrevisao[])[0];
    if (!linhaProgresso || !linhaPrevisao) throw new Error("sem_dado_de_progresso");

    return { progresso: paraProgresso(linhaProgresso), previsao: paraPrevisao(linhaPrevisao) };
  }
}
