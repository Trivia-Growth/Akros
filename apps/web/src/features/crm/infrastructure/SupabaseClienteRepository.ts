import { getSupabase } from "@/shared/supabase/client";
import type { ClienteRepository } from "../application/ports";
import type { Cliente, PerfilImigratorio } from "../domain/types";

interface LinhaClienteSupabase {
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

export function paraCliente(linha: LinhaClienteSupabase): Cliente {
  return {
    id: linha.id,
    leadOrigemId: linha.lead_origem_id ?? undefined,
    nome: linha.nome,
    email: linha.email,
    telefone: linha.telefone,
    tipoVisto: linha.tipo_visto,
    caseManager: linha.case_manager,
    criadoEm: linha.created_at,
    saude: linha.saude,
    programaId: linha.programa_id ?? undefined,
    programaVersao: linha.programa_versao ?? undefined,
    pastaDriveNome: linha.pasta_drive_nome ?? undefined,
    perfilImigratorio: linha.perfil_imigratorio ?? undefined,
  };
}

function paraColunas(patch: Partial<Cliente>): Record<string, unknown> {
  const colunas: Record<string, unknown> = {};
  if (patch.nome !== undefined) colunas.nome = patch.nome;
  if (patch.email !== undefined) colunas.email = patch.email;
  if (patch.telefone !== undefined) colunas.telefone = patch.telefone;
  if (patch.tipoVisto !== undefined) colunas.tipo_visto = patch.tipoVisto;
  if (patch.caseManager !== undefined) colunas.case_manager = patch.caseManager;
  if (patch.saude !== undefined) colunas.saude = patch.saude;
  if (patch.programaId !== undefined) colunas.programa_id = patch.programaId;
  if (patch.programaVersao !== undefined) colunas.programa_versao = patch.programaVersao;
  if (patch.pastaDriveNome !== undefined) colunas.pasta_drive_nome = patch.pastaDriveNome;
  if (patch.perfilImigratorio !== undefined) colunas.perfil_imigratorio = patch.perfilImigratorio;
  return colunas;
}

export class SupabaseClienteRepository implements ClienteRepository {
  async listar(): Promise<Cliente[]> {
    const { data, error } = await getSupabase().schema("crm").from("clientes").select();
    if (error) throw error;
    return (data as LinhaClienteSupabase[]).map(paraCliente);
  }

  async obter(id: string): Promise<Cliente | null> {
    const { data, error } = await getSupabase()
      .schema("crm")
      .from("clientes")
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? paraCliente(data as LinhaClienteSupabase) : null;
  }

  async criarAPartirDeLead(leadId: string, programaCodigo?: string): Promise<Cliente> {
    const { data, error } = await getSupabase()
      .schema("crm")
      .rpc("criar_cliente_a_partir_de_lead", {
        p_lead_id: leadId,
        p_programa_codigo: programaCodigo ?? null,
      });
    if (error) throw error;
    const linha = Array.isArray(data) ? data[0] : data;
    if (!linha) throw new Error(`Lead ${leadId} não encontrado ou já convertido`);
    return paraCliente(linha as LinhaClienteSupabase);
  }

  async atualizar(id: string, patch: Partial<Cliente>): Promise<void> {
    const { error } = await getSupabase()
      .schema("crm")
      .from("clientes")
      .update(paraColunas(patch))
      .eq("id", id);
    if (error) throw error;
  }
}
