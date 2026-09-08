import { getSupabase } from "@/shared/supabase/client";
import type { DashboardAdminConsulta } from "../application/ports";
import type { Cliente } from "../domain/types";

const ESTAGIOS = [
  "lead",
  "qualificado",
  "reuniao_agendada",
  "em_negociacao",
  "fechado",
  "descartado",
] as const;

interface LinhaLead {
  estagio: string;
}
interface LinhaCliente {
  saude: Cliente["saude"];
}
interface LinhaJornada {
  fase_atual_id: string | null;
}
interface LinhaFase {
  id: string;
  titulo: string;
}
interface LinhaPagamento {
  valor: number | string;
  moeda: "BRL" | "USD";
  status: string;
}
interface LinhaReuniao {
  id: string;
  titulo: string;
  inicio: string;
  status: string;
}
interface LinhaEvento {
  id: string;
  conteudo: string;
}

export function calcularDashboardAdmin({
  leads,
  clientes,
  jornadas,
  fases,
  pagamentos,
  reunioes,
  eventos,
  pendencias,
}: {
  leads: LinhaLead[];
  clientes: LinhaCliente[];
  jornadas: LinhaJornada[];
  fases: LinhaFase[];
  pagamentos: LinhaPagamento[];
  reunioes: LinhaReuniao[];
  eventos: LinhaEvento[];
  pendencias: number;
}) {
  const fasesPorId = new Map(fases.map((fase) => [fase.id, fase.titulo]));
  const fasesContadas = new Map<string, number>();
  for (const jornada of jornadas) {
    const titulo =
      (jornada.fase_atual_id && fasesPorId.get(jornada.fase_atual_id)) ?? "Sem fase ativa";
    fasesContadas.set(titulo, (fasesContadas.get(titulo) ?? 0) + 1);
  }

  const receitaPorMoeda = new Map<
    "BRL" | "USD",
    { pago: number; pendente: number; atrasado: number }
  >();
  for (const pagamento of pagamentos) {
    const valores = receitaPorMoeda.get(pagamento.moeda) ?? { pago: 0, pendente: 0, atrasado: 0 };
    if (pagamento.status === "pago") valores.pago += Number(pagamento.valor);
    if (pagamento.status === "pendente") valores.pendente += Number(pagamento.valor);
    if (pagamento.status === "atrasado") valores.atrasado += Number(pagamento.valor);
    receitaPorMoeda.set(pagamento.moeda, valores);
  }

  return {
    funil: ESTAGIOS.map((estagio) => ({
      estagio,
      quantidade: leads.filter((lead) => lead.estagio === estagio).length,
    })),
    clientesPorFase: [...fasesContadas].map(([fase, quantidade]) => ({ fase, quantidade })),
    saude: {
      emDia: clientes.filter((cliente) => cliente.saude === "em_dia").length,
      atencao: clientes.filter((cliente) => cliente.saude === "atencao").length,
      atrasado: clientes.filter((cliente) => cliente.saude === "atrasado").length,
    },
    receita: [...receitaPorMoeda].map(([moeda, valores]) => ({ moeda, ...valores })),
    proximasReunioes: reunioes
      .filter((reuniao) => reuniao.status === "agendada")
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .slice(0, 5),
    atividadeRecente: eventos.slice(0, 6),
    pendencias,
  };
}

/** Dashboard administrativo: dados agregados a partir das fontes reais sem escrever no browser. */
export class SupabaseDashboardAdminConsulta implements DashboardAdminConsulta {
  async carregarAdmin() {
    const [leads, clientes, jornadas, fases, pagamentos, reunioes, eventos, documentos] =
      await Promise.all([
        getSupabase().schema("crm").from("leads").select("estagio").is("deleted_at", null),
        getSupabase().schema("crm").from("clientes").select("saude"),
        getSupabase().schema("jornada").from("jornadas").select("fase_atual_id"),
        getSupabase().schema("jornada").from("fases").select("id,titulo"),
        getSupabase().schema("pagamentos").from("pagamentos").select("valor,moeda,status"),
        getSupabase().schema("agenda").from("reunioes").select("id,titulo,inicio,status"),
        getSupabase()
          .schema("comunicacao")
          .from("eventos")
          .select("id,conteudo")
          .eq("canal", "sistema")
          .order("ocorrido_em", { ascending: false }),
        getSupabase()
          .schema("documentos")
          .from("documentos")
          .select("id", { count: "exact", head: true })
          .eq("status", "em_analise"),
      ]);
    if (leads.error) throw leads.error;
    if (clientes.error) throw clientes.error;
    if (jornadas.error) throw jornadas.error;
    if (fases.error) throw fases.error;
    if (pagamentos.error) throw pagamentos.error;
    if (reunioes.error) throw reunioes.error;
    if (eventos.error) throw eventos.error;
    if (documentos.error) throw documentos.error;

    return calcularDashboardAdmin({
      leads: leads.data as LinhaLead[],
      clientes: clientes.data as LinhaCliente[],
      jornadas: jornadas.data as LinhaJornada[],
      fases: fases.data as LinhaFase[],
      pagamentos: pagamentos.data as LinhaPagamento[],
      reunioes: reunioes.data as LinhaReuniao[],
      eventos: eventos.data as LinhaEvento[],
      pendencias: documentos.count ?? 0,
    });
  }
}
