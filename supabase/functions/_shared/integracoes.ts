// Helpers de integração: valores de Vault só vivem dentro de Edge Functions com service_role.
// As formas dos segredos e os helpers puros estão em `segredos.ts` (reexportados aqui).
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HttpError, getSupabaseServiceKey } from "./auth.ts";

export * from "./segredos.ts";

export function clienteServico(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  if (!url) throw new HttpError(500, "Ambiente Supabase incompleto");
  return createClient(url, getSupabaseServiceKey());
}

export async function obterSegredo<T>(supabase: SupabaseClient, escopo: string): Promise<T | null> {
  const { data, error } = await supabase.schema("configuracoes").rpc("obter_segredo_integracao", {
    p_escopo: escopo,
  });
  if (error) throw new HttpError(500, "Não foi possível acessar configuração segura");
  if (typeof data !== "string" || !data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    throw new HttpError(500, "Configuração segura inválida");
  }
}

export async function salvarSegredo(
  supabase: SupabaseClient,
  escopo: string,
  segredo: Record<string, string>,
): Promise<void> {
  const { error } = await supabase.schema("configuracoes").rpc("salvar_segredo_integracao", {
    p_escopo: escopo,
    p_valor: JSON.stringify(segredo),
  });
  if (error) throw new HttpError(500, "Não foi possível salvar configuração segura");
}
