import { getSupabase } from "@/shared/supabase/client";

export interface MensagemNaoVista {
  clienteId: string;
  nomeCliente: string;
  ocorridoEm: string;
}

interface LinhaEvento {
  cliente_id: string | null;
  ocorrido_em: string;
}

/** `comunicacao.eventos` é append-only (0048): não dá pra marcar "lido" no evento. O cursor de
 *  leitura vive em `comunicacao.visto_admin`, uma linha por admin (0052, E08-S06). */
const SEM_CURSOR = "1970-01-01T00:00:00Z";

export class SupabaseNotificacoesConsulta {
  async naoVistas(): Promise<MensagemNaoVista[]> {
    const supabase = getSupabase();
    const { data: cursor, error: erroCursor } = await supabase
      .schema("comunicacao")
      .from("visto_admin")
      .select("visto_em")
      .maybeSingle<{ visto_em: string }>();
    if (erroCursor) throw erroCursor;

    const { data: eventos, error: erroEventos } = await supabase
      .schema("comunicacao")
      .from("eventos")
      .select("cliente_id, ocorrido_em")
      .eq("canal", "chat_portal")
      .eq("direcao", "entrada")
      .gt("ocorrido_em", cursor?.visto_em ?? SEM_CURSOR)
      .order("ocorrido_em", { ascending: false })
      .limit(50)
      .returns<LinhaEvento[]>();
    if (erroEventos) throw erroEventos;

    const maisRecentePorCliente = new Map<string, string>();
    for (const evento of eventos ?? []) {
      if (!evento.cliente_id) continue;
      if (!maisRecentePorCliente.has(evento.cliente_id)) {
        maisRecentePorCliente.set(evento.cliente_id, evento.ocorrido_em);
      }
    }
    if (maisRecentePorCliente.size === 0) return [];

    const { data: clientes, error: erroClientes } = await supabase
      .schema("crm")
      .from("clientes")
      .select("id, nome")
      .in("id", [...maisRecentePorCliente.keys()])
      .returns<{ id: string; nome: string }[]>();
    if (erroClientes) throw erroClientes;
    const nomePorId = new Map((clientes ?? []).map((cliente) => [cliente.id, cliente.nome]));

    return [...maisRecentePorCliente.entries()].map(([clienteId, ocorridoEm]) => ({
      clienteId,
      nomeCliente: nomePorId.get(clienteId) ?? "Cliente",
      ocorridoEm,
    }));
  }

  async marcarVisto(): Promise<void> {
    const supabase = getSupabase();
    const { data, error: erroUsuario } = await supabase.auth.getUser();
    if (erroUsuario) throw erroUsuario;
    const adminId = data.user?.id;
    if (!adminId) throw new Error("sem_sessao");
    const { error } = await supabase
      .schema("comunicacao")
      .from("visto_admin")
      .upsert({ admin_id: adminId, visto_em: new Date().toISOString() });
    if (error) throw error;
  }
}
