import { getSupabase } from "@/shared/supabase/client";
import type { VersoesConsulta } from "../application/ports";
import type { VersaoDocumento } from "../domain/types";

interface LinhaVersao {
  id: string;
  numero_versao: number;
  nome_original: string;
  estado_recebimento: VersaoDocumento["estadoRecebimento"];
  estado_armazenamento: VersaoDocumento["estadoArmazenamento"];
  recebido_em: string | null;
  created_at: string;
}

function paraVersao(linha: LinhaVersao): VersaoDocumento {
  return {
    id: linha.id,
    numeroVersao: linha.numero_versao,
    nomeOriginal: linha.nome_original,
    estadoRecebimento: linha.estado_recebimento,
    estadoArmazenamento: linha.estado_armazenamento,
    ...(linha.recebido_em ? { recebidoEm: linha.recebido_em } : {}),
    criadaEm: linha.created_at,
  };
}

export class SupabaseVersoesConsulta implements VersoesConsulta {
  async listarPorDocumento(documentoId: string): Promise<VersaoDocumento[]> {
    const { data, error } = await getSupabase()
      .schema("arquivos")
      .from("versoes")
      .select(
        "id,numero_versao,nome_original,estado_recebimento,estado_armazenamento,recebido_em,created_at",
      )
      .eq("documento_id", documentoId)
      .order("numero_versao", { ascending: false });
    if (error) throw error;
    return (data as LinhaVersao[]).map(paraVersao);
  }
}
