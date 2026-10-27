import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { IOCasoComandos } from "./caso-comandos.ts";

export const executarCasoRpc = (cliente: SupabaseClient): IOCasoComandos["rpc"] =>
  async (nome, params) =>
    await cliente.schema(nome === "vincular_pasta" ? "arquivos" : "crm").rpc(nome, params);
