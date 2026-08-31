import { supabase } from "@/shared/supabase/client";
import type { ClienteRepository } from "../application/ports";
import type { Cliente, PerfilImigratorio } from "../domain/types";

/**
 * SPEC_DEVIATION (E13-S08, ver design.md): `crm.clientes.id` é uuid real, mas
 * jornada/documentos/pagamentos/comunicacao (E13-S09+, ainda mock) continuam referenciando
 * clientes pelos ids string do mock (`"cliente-carlos"`). Este mapa confina a tradução aqui
 * dentro — nenhum outro arquivo sabe que o uuid existe. Fecha (mapa deletado, não substituído)
 * quando E13-S09 migrar aquelas features pra Supabase real e todo mundo passar a usar uuid.
 */
const MAPA_ID_REAL_PARA_MOCK: Record<string, string> = {
  "760facdf-37fa-4f41-8cef-9a79d673a2cf": "cliente-carlos",
  "8c360c7b-b645-4345-8f1b-0b7643c906ab": "cliente-renata",
};

const MAPA_ID_MOCK_PARA_REAL: Record<string, string> = Object.fromEntries(
  Object.entries(MAPA_ID_REAL_PARA_MOCK).map(([uuid, mockId]) => [mockId, uuid]),
);

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

function paraDominio(linha: LinhaClienteSupabase): Cliente {
  return {
    id: MAPA_ID_REAL_PARA_MOCK[linha.id] ?? linha.id,
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
    const { data, error } = await supabase.schema("crm").from("clientes").select();
    if (error) throw error;
    return (data as LinhaClienteSupabase[]).map(paraDominio);
  }

  async obter(id: string): Promise<Cliente | null> {
    const idReal = MAPA_ID_MOCK_PARA_REAL[id] ?? id;
    const { data, error } = await supabase
      .schema("crm")
      .from("clientes")
      .select()
      .eq("id", idReal)
      .maybeSingle();
    if (error) throw error;
    return data ? paraDominio(data as LinhaClienteSupabase) : null;
  }

  async criarAPartirDeLead(): Promise<Cliente> {
    // Fora de escopo (E13-S08, ver design.md): conversão de lead real depende de `crm.leads`,
    // que ainda não existe. Fluxo de criação de cliente continua exclusivamente no mock.
    throw new Error("criarAPartirDeLead ainda não suportado pelo adapter Supabase (ver E13-S09).");
  }

  async atualizar(id: string, patch: Partial<Cliente>): Promise<void> {
    const idReal = MAPA_ID_MOCK_PARA_REAL[id] ?? id;
    const { error } = await supabase
      .schema("crm")
      .from("clientes")
      .update(paraColunas(patch))
      .eq("id", idReal);
    if (error) throw error;
  }
}
