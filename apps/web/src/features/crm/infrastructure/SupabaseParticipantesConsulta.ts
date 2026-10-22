// E03-S07 (T049) — leitura de `crm.participantes` do caso para o painel admin
// (`ParticipantesPainel.tsx`). Mesmo critério de `SupabaseDocumentosConsulta.ts`: `.select()`
// sem filtro de papel explícito — RLS decide o recorte
// (`admin_ve_todos_participantes`/`participante_ve_participantes_do_caso`, migration 0017). Só o
// `.eq("cliente_id", ...)` é nosso: reduz o round-trip ao caso aberto, não é controle de acesso
// (quem não tem RLS pra enxergar a linha recebe [] mesmo sem este filtro).
//
// `paraParticipante`/`LinhaParticipanteSupabase` também são usados por `SupabaseCasoComandos.ts`
// (convidar/revogar devolvem a MESMA linha de `crm.participantes`) — única função de mapeamento
// para esta tabela, para não ter duas fontes de verdade sobre o shape da linha.
import { getSupabase } from "@/shared/supabase/client";
import type { ParticipantesConsulta } from "../application/ports";
import type {
  EstadoParticipante,
  PapelParticipante,
  Participante,
  SujeitoTipo,
} from "../domain/participante";

export interface LinhaParticipanteSupabase {
  id: string;
  cliente_id: string;
  papel: PapelParticipante;
  sujeito_tipo: SujeitoTipo;
  familiar_id: string | null;
  organizacao_id: string | null;
  nome_exibicao: string;
  email: string | null;
  auth_user_id: string | null;
  estado: EstadoParticipante;
  convidado_por: string | null;
  convidado_em: string | null;
  revogado_por: string | null;
  revogado_em: string | null;
}

export function paraParticipante(linha: LinhaParticipanteSupabase): Participante {
  return {
    id: linha.id,
    clienteId: linha.cliente_id,
    papel: linha.papel,
    sujeitoTipo: linha.sujeito_tipo,
    ...(linha.familiar_id ? { familiarId: linha.familiar_id } : {}),
    ...(linha.organizacao_id ? { organizacaoId: linha.organizacao_id } : {}),
    nomeExibicao: linha.nome_exibicao,
    ...(linha.email ? { email: linha.email } : {}),
    ...(linha.auth_user_id ? { authUserId: linha.auth_user_id } : {}),
    estado: linha.estado,
    ...(linha.convidado_por ? { convidadoPor: linha.convidado_por } : {}),
    ...(linha.convidado_em ? { convidadoEm: linha.convidado_em } : {}),
    ...(linha.revogado_por ? { revogadoPor: linha.revogado_por } : {}),
    ...(linha.revogado_em ? { revogadoEm: linha.revogado_em } : {}),
  };
}

export class SupabaseParticipantesConsulta implements ParticipantesConsulta {
  async carregar(clienteId: string): Promise<Participante[]> {
    const { data, error } = await getSupabase()
      .schema("crm")
      .from("participantes")
      .select()
      .eq("cliente_id", clienteId)
      .order("created_at");
    if (error) throw error;
    return (data as LinhaParticipanteSupabase[]).map(paraParticipante);
  }
}
