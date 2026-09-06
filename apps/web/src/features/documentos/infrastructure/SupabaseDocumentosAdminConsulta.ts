import { getSupabase } from "@/shared/supabase/client";
import type { DocumentosAdminConsulta } from "../application/ports";
import type { Documento } from "../domain/types";
import { paraDocumento } from "./SupabaseDocumentosConsulta";

interface LinhaCliente {
  id: string;
  nome: string;
}

/** Fila admin somente leitura: decisão exige RPC auditada, não UPDATE direto. */
export class SupabaseDocumentosAdminConsulta implements DocumentosAdminConsulta {
  async carregarAdmin() {
    const [documentos, clientes] = await Promise.all([
      getSupabase()
        .schema("documentos")
        .from("documentos")
        .select()
        .order("enviado_em", { ascending: true }),
      getSupabase().schema("crm").from("clientes").select("id,nome"),
    ]);
    if (documentos.error) throw documentos.error;
    if (clientes.error) throw clientes.error;
    return {
      documentos: (documentos.data as Parameters<typeof paraDocumento>[0][]).map(paraDocumento),
      nomesClientes: Object.fromEntries(
        (clientes.data as LinhaCliente[]).map((cliente) => [cliente.id, cliente.nome]),
      ),
    } satisfies { documentos: Documento[]; nomesClientes: Record<string, string> };
  }
}
