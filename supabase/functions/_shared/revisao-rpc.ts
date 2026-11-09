import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { IORevisaoComandos } from "./revisao-comandos.ts";

const SCHEMA_POR_ACAO = {
  revisar_documento: "documentos",
  decidir_etapa: "jornada",
  liberar_fase: "jornada",
  conciliar_pagamento: "pagamentos",
} as const;

export const executarRevisaoRpc = (cliente: SupabaseClient): IORevisaoComandos["rpc"] =>
  async (nome, params) => await cliente.schema(SCHEMA_POR_ACAO[nome]).rpc(nome, params);
