import type { Reuniao } from "@/features/agenda/domain/types";
import { paraReuniao } from "@/features/agenda/infrastructure/SupabaseAgendaConsulta";
import type { Conversa, EmailThread, EventoComunicacao } from "@/features/comunicacao/domain/types";
import {
  paraConversa,
  paraEmail,
} from "@/features/comunicacao/infrastructure/SupabaseComunicacaoAdminConsulta";
import { paraEvento } from "@/features/comunicacao/infrastructure/SupabaseComunicacaoConsulta";
import type { Documento } from "@/features/documentos/domain/types";
import { paraDocumento } from "@/features/documentos/infrastructure/SupabaseDocumentosConsulta";
import type { Jornada } from "@/features/jornada/domain/types";
import { paraJornada } from "@/features/jornada/infrastructure/SupabaseJornadaConsulta";
import type { Pagamento } from "@/features/pagamentos/domain/types";
import { paraPagamento } from "@/features/pagamentos/infrastructure/SupabasePagamentosConsulta";
import { getSupabase } from "@/shared/supabase/client";
import type { Cliente360AdminConsulta } from "../application/ports";
import type { Cliente, PerfilImigratorio } from "../domain/types";

interface LinhaCliente {
  id: string;
  lead_origem_id: string | null;
  nome: string;
  email: string;
  telefone: string;
  tipo_visto: string;
  case_manager: string;
  saude: Cliente["saude"];
  programa_id: string | null;
  programa_versao: string | null;
  pasta_drive_nome: string | null;
  perfil_imigratorio: PerfilImigratorio | null;
  created_at: string;
}

/** Mantém UUID remoto. Não importa nem conhece mapa temporário de IDs mock. */
export function paraCliente360(linha: LinhaCliente): Cliente {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    telefone: linha.telefone,
    tipoVisto: linha.tipo_visto,
    caseManager: linha.case_manager,
    criadoEm: linha.created_at,
    saude: linha.saude,
    ...(linha.lead_origem_id ? { leadOrigemId: linha.lead_origem_id } : {}),
    ...(linha.programa_id ? { programaId: linha.programa_id } : {}),
    ...(linha.programa_versao ? { programaVersao: linha.programa_versao } : {}),
    ...(linha.pasta_drive_nome ? { pastaDriveNome: linha.pasta_drive_nome } : {}),
    ...(linha.perfil_imigratorio ? { perfilImigratorio: linha.perfil_imigratorio } : {}),
  };
}

export function recomporJornadasAdmin({
  jornadas,
  fases,
  etapas,
}: {
  jornadas: Parameters<typeof paraJornada>[0][];
  fases: Parameters<typeof paraJornada>[1];
  etapas: Parameters<typeof paraJornada>[2];
}): Jornada[] {
  return jornadas.map((jornada) =>
    paraJornada(
      jornada,
      fases.filter((fase) => fase.jornada_id === jornada.id),
      etapas.filter((etapa) =>
        fases.some((fase) => fase.id === etapa.fase_id && fase.jornada_id === jornada.id),
      ),
    ),
  );
}

/** Cliente 360 admin: leitura paralela de todas fontes normalizadas, limitada pelo RLS. */
export class SupabaseCliente360AdminConsulta implements Cliente360AdminConsulta {
  async carregarAdmin() {
    const [
      clientes,
      jornadas,
      fases,
      etapas,
      documentos,
      pagamentos,
      reunioes,
      conversas,
      emails,
      eventos,
    ] = await Promise.all([
      getSupabase().schema("crm").from("clientes").select(),
      getSupabase().schema("jornada").from("jornadas").select(),
      getSupabase().schema("jornada").from("fases").select().order("ordem"),
      getSupabase().schema("jornada").from("etapas").select().order("created_at"),
      getSupabase().schema("documentos").from("documentos").select().order("created_at"),
      getSupabase().schema("pagamentos").from("pagamentos").select().order("vencimento"),
      getSupabase()
        .schema("agenda")
        .from("reunioes")
        .select()
        .order("inicio", { ascending: false }),
      getSupabase()
        .schema("comunicacao")
        .from("conversas")
        .select()
        .order("updated_at", { ascending: false }),
      getSupabase()
        .schema("comunicacao")
        .from("email_threads")
        .select()
        .order("updated_at", { ascending: false }),
      getSupabase()
        .schema("comunicacao")
        .from("eventos")
        .select()
        .order("ocorrido_em", { ascending: false }),
    ]);
    for (const resposta of [
      clientes,
      jornadas,
      fases,
      etapas,
      documentos,
      pagamentos,
      reunioes,
      conversas,
      emails,
      eventos,
    ]) {
      if (resposta.error) throw resposta.error;
    }

    return {
      clientes: (clientes.data as LinhaCliente[]).map(paraCliente360),
      jornadas: recomporJornadasAdmin({
        jornadas: jornadas.data as Parameters<typeof paraJornada>[0][],
        fases: fases.data as Parameters<typeof paraJornada>[1],
        etapas: etapas.data as Parameters<typeof paraJornada>[2],
      }),
      documentos: (documentos.data as Parameters<typeof paraDocumento>[0][]).map(paraDocumento),
      pagamentos: (pagamentos.data as Parameters<typeof paraPagamento>[0][]).map(paraPagamento),
      reunioes: (reunioes.data as Parameters<typeof paraReuniao>[0][]).map(paraReuniao),
      conversas: (conversas.data as Parameters<typeof paraConversa>[0][]).map(paraConversa),
      emails: (emails.data as Parameters<typeof paraEmail>[0][]).map(paraEmail),
      eventos: (eventos.data as Parameters<typeof paraEvento>[0][])
        .map(paraEvento)
        .filter((evento): evento is EventoComunicacao => evento !== null),
    } satisfies {
      clientes: Cliente[];
      jornadas: Jornada[];
      documentos: Documento[];
      pagamentos: Pagamento[];
      reunioes: Reuniao[];
      conversas: Conversa[];
      emails: EmailThread[];
      eventos: EventoComunicacao[];
    };
  }
}
