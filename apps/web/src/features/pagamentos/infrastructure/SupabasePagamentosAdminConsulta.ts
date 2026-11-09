import { getSupabase } from "@/shared/supabase/client";
import type { PagamentosAdminConsulta } from "../application/ports";
import type { Pagamento } from "../domain/types";
import { paraPagamento } from "./SupabasePagamentosConsulta";

interface LinhaCliente {
  id: string;
  nome: string;
}

/** Fila admin somente leitura: decisão exige RPC auditada (`conciliar_pagamento`), não UPDATE
 *  direto — mesmo critério de `SupabaseDocumentosAdminConsulta`. */
export class SupabasePagamentosAdminConsulta implements PagamentosAdminConsulta {
  async carregarAdmin() {
    const [pagamentos, clientes] = await Promise.all([
      getSupabase()
        .schema("pagamentos")
        .from("pagamentos")
        .select()
        .order("vencimento", { ascending: true }),
      getSupabase().schema("crm").from("clientes").select("id,nome"),
    ]);
    if (pagamentos.error) throw pagamentos.error;
    if (clientes.error) throw clientes.error;
    return {
      pagamentos: (pagamentos.data as Parameters<typeof paraPagamento>[0][]).map(paraPagamento),
      nomesClientes: Object.fromEntries(
        (clientes.data as LinhaCliente[]).map((cliente) => [cliente.id, cliente.nome]),
      ),
    } satisfies { pagamentos: Pagamento[]; nomesClientes: Record<string, string> };
  }
}
