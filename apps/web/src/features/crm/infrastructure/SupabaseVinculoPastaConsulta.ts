import { getSupabase } from "@/shared/supabase/client";
import type { VinculoPastaConsulta } from "../application/ports";

export class SupabaseVinculoPastaConsulta implements VinculoPastaConsulta {
  async carregar(clienteId: string, jornadaId: string) {
    const { data, error } = await getSupabase()
      .schema("arquivos")
      .from("vinculos_pasta")
      .select("folder_item_id,estado")
      .eq("cliente_id", clienteId)
      .eq("jornada_id", jornadaId)
      .maybeSingle<{ folder_item_id: string; estado: string }>();
    if (error) throw error;
    return data ? { folderItemId: data.folder_item_id, estado: data.estado } : null;
  }
}
