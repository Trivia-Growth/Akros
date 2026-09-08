import { getSupabase } from "@/shared/supabase/client";
import type { PerfilClienteConsulta } from "../application/ports";
import { paraCliente } from "./SupabaseClienteRepository";

/** Perfil do portal: sem ID de claim; RLS limita `crm.clientes` à linha de `auth.uid()`. */
export class SupabasePerfilClienteConsulta implements PerfilClienteConsulta {
  async carregar() {
    const { data, error } = await getSupabase()
      .schema("crm")
      .from("clientes")
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? paraCliente(data) : null;
  }
}
