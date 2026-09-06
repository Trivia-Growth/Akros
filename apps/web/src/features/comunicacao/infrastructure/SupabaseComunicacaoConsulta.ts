import { getSupabase } from "@/shared/supabase/client";
import type { ComunicacaoConsulta } from "../application/ports";
import type { AnexoEvento, CanalEvento, DirecaoEvento, EventoComunicacao } from "../domain/types";

interface LinhaEvento {
  id: string;
  cliente_id: string | null;
  canal: CanalEvento;
  direcao: DirecaoEvento;
  autor: string;
  conteudo: string;
  anexos: unknown;
  ocorrido_em: string;
  origem_id: string | null;
  pendente_de_canal: boolean | null;
}

function paraAnexos(valor: unknown): AnexoEvento[] | undefined {
  if (!Array.isArray(valor)) return undefined;

  const anexos = valor.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const anexo = item as Record<string, unknown>;
    if (typeof anexo.nome !== "string") return [];
    return [
      {
        nome: anexo.nome,
        ...(typeof anexo.documentoId === "string" ? { documentoId: anexo.documentoId } : {}),
      },
    ];
  });

  return anexos.length > 0 ? anexos : undefined;
}

/** Converte a linha PostgREST sem trocar UUID real por id de fixture. */
export function paraEvento(linha: LinhaEvento): EventoComunicacao | null {
  // Evento de lead não convertido não pertence a nenhum portal de cliente.
  if (!linha.cliente_id) return null;
  const anexos = paraAnexos(linha.anexos);

  return {
    id: linha.id,
    clienteOuLeadId: linha.cliente_id,
    canal: linha.canal,
    direcao: linha.direcao,
    autor: linha.autor,
    conteudo: linha.conteudo,
    ...(anexos ? { anexos } : {}),
    ocorridoEm: linha.ocorrido_em,
    ...(linha.origem_id ? { origemId: linha.origem_id } : {}),
    ...(linha.pendente_de_canal ? { pendenteDeCanal: true } : {}),
  };
}

/** Histórico do portal via RLS; sem filtro por id legado de cliente. */
export class SupabaseComunicacaoConsulta implements ComunicacaoConsulta {
  async carregarCliente(): Promise<EventoComunicacao[]> {
    const resposta = await getSupabase()
      .schema("comunicacao")
      .from("eventos")
      .select()
      .order("ocorrido_em", { ascending: true });
    if (resposta.error) throw resposta.error;
    return (resposta.data as LinhaEvento[])
      .map(paraEvento)
      .filter((evento): evento is EventoComunicacao => evento !== null);
  }
}
