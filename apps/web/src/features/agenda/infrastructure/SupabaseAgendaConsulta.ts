import { getSupabase } from "@/shared/supabase/client";
import type { AgendaConsulta } from "../application/ports";
import type { Reuniao, ReuniaoCanal, ReuniaoStatus, Transcricao } from "../domain/types";

interface LinhaReuniao {
  id: string;
  cliente_id: string;
  titulo: string;
  inicio: string;
  fim: string;
  canal: ReuniaoCanal;
  status: ReuniaoStatus;
  criada_por: Reuniao["criadaPor"] | null;
}

interface LinhaTranscricao {
  id: string;
  reuniao_id: string;
  texto: string;
  resumo: string;
  action_items: string[] | null;
  provedor: Transcricao["provedor"];
  created_at: string;
}

interface LinhaClienteNome {
  id: string;
  nome: string;
}

export function paraReuniao(linha: LinhaReuniao): Reuniao {
  return {
    id: linha.id,
    clienteId: linha.cliente_id,
    titulo: linha.titulo,
    inicio: linha.inicio,
    fim: linha.fim,
    canal: linha.canal,
    status: linha.status,
    ...(linha.criada_por ? { criadaPor: linha.criada_por } : {}),
  };
}

export function paraTranscricao(linha: LinhaTranscricao): Transcricao {
  return {
    id: linha.id,
    reuniaoId: linha.reuniao_id,
    texto: linha.texto,
    resumo: linha.resumo,
    actionItems: linha.action_items ?? [],
    provedor: linha.provedor,
    criadoEm: linha.created_at,
  };
}

/** Leitura da agenda já protegida por RLS, sem conversão de UUID para ID de fixture. */
export class SupabaseAgendaConsulta implements AgendaConsulta {
  async carregarCliente(): Promise<{ reunioes: Reuniao[]; transcricoes: Transcricao[] }> {
    const { data, error } = await getSupabase()
      .schema("agenda")
      .from("reunioes")
      .select()
      .order("inicio");
    if (error) throw error;
    const reunioes = (data as LinhaReuniao[]).map(paraReuniao);
    return {
      reunioes,
      transcricoes: await this.listarTranscricoes(reunioes.map((item) => item.id)),
    };
  }

  async carregarAdmin(): Promise<{
    reunioes: Reuniao[];
    transcricoes: Transcricao[];
    nomesClientes: Record<string, string>;
  }> {
    const [reunioesResposta, clientesResposta] = await Promise.all([
      getSupabase()
        .schema("agenda")
        .from("reunioes")
        .select()
        .order("inicio", { ascending: false }),
      getSupabase().schema("crm").from("clientes").select("id,nome"),
    ]);
    if (reunioesResposta.error) throw reunioesResposta.error;
    if (clientesResposta.error) throw clientesResposta.error;

    const reunioes = (reunioesResposta.data as LinhaReuniao[]).map(paraReuniao);
    const nomesClientes = Object.fromEntries(
      (clientesResposta.data as LinhaClienteNome[]).map((cliente) => [cliente.id, cliente.nome]),
    );
    return {
      reunioes,
      transcricoes: await this.listarTranscricoes(reunioes.map((item) => item.id)),
      nomesClientes,
    };
  }

  private async listarTranscricoes(reunioesIds: string[]): Promise<Transcricao[]> {
    if (reunioesIds.length === 0) return [];
    const { data, error } = await getSupabase()
      .schema("agenda")
      .from("transcricoes")
      .select()
      .in("reuniao_id", reunioesIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as LinhaTranscricao[]).map(paraTranscricao);
  }
}
