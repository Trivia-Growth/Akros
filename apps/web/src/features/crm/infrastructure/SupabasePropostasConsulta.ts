import { getSupabase } from "@/shared/supabase/client";
import type { ContatoProposta, PropostasConsulta } from "../application/ports";
import type { Proposta } from "../domain/types";

interface LinhaProposta {
  id: string;
  lead_id: string | null;
  cliente_id: string | null;
  escopo: string;
  itens_escopo: unknown;
  tipo_visto: string;
  valor: number | string;
  moeda: Proposta["moeda"];
  condicoes: string;
  valido_ate: string;
  status: Proposta["status"];
  created_at: string;
}

interface LinhaContato {
  id: string;
  nome: string;
  email: string;
}

function paraItensEscopo(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === "string")
    : [];
}

/** `propostas_origem_exata` assegura um único vínculo, preservado como UUID de domínio. */
export function paraProposta(linha: LinhaProposta): Proposta {
  const leadOuClienteId = linha.lead_id ?? linha.cliente_id;
  if (!leadOuClienteId) throw new Error(`Proposta ${linha.id} sem lead ou cliente.`);

  return {
    id: linha.id,
    leadOuClienteId,
    escopo: linha.escopo,
    itensEscopo: paraItensEscopo(linha.itens_escopo),
    tipoVisto: linha.tipo_visto,
    valor: Number(linha.valor),
    moeda: linha.moeda,
    condicoes: linha.condicoes,
    validoAte: linha.valido_ate,
    status: linha.status,
    criadoEm: linha.created_at,
  };
}

/** Administração lê propostas e seus contatos reais; sem fallback para store de demo. */
export class SupabasePropostasConsulta implements PropostasConsulta {
  async carregarAdmin(): Promise<{ propostas: Proposta[]; contatos: ContatoProposta[] }> {
    const [propostasResposta, leadsResposta, clientesResposta] = await Promise.all([
      getSupabase()
        .schema("crm")
        .from("propostas")
        .select()
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      getSupabase().schema("crm").from("leads").select("id,nome,email").is("deleted_at", null),
      getSupabase().schema("crm").from("clientes").select("id,nome,email"),
    ]);
    if (propostasResposta.error) throw propostasResposta.error;
    if (leadsResposta.error) throw leadsResposta.error;
    if (clientesResposta.error) throw clientesResposta.error;

    const contatos = [
      ...(leadsResposta.data as LinhaContato[]),
      ...(clientesResposta.data as LinhaContato[]),
    ];
    return { propostas: (propostasResposta.data as LinhaProposta[]).map(paraProposta), contatos };
  }
}
