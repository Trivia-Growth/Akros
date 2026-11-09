import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { IOCasoComandos } from "./caso-comandos.ts";

const SCHEMA_POR_ACAO: Record<string, string> = {
  vincular_pasta: "arquivos",
  vincular_pasta_advogado: "arquivos",
  marcar_compartilhavel_advogado: "documentos",
};

export const executarCasoRpc = (cliente: SupabaseClient): IOCasoComandos["rpc"] =>
  async (nome, params) => await cliente.schema(SCHEMA_POR_ACAO[nome] ?? "crm").rpc(nome, params);
