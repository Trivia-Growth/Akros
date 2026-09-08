import { getSupabase } from "@/shared/supabase/client";
import type {
  DecisaoGateAgendamento,
  EstadoCadencia,
  EstadoQualificacao,
  EstagioLead,
  Lead,
  LeadRepository,
  NovoLead,
  OrigemCampoPerfil,
  PerfilLead,
} from "./lead";

/**
 * Adapter real de `crm.leads` (E13-S09). Mesma forma do `SupabaseClienteRepository` (E13-S08).
 *
 * `crm.leads` é admin-only por RLS — lead não tem login. Um cliente autenticado consultando esta
 * tabela recebe `[]`, não erro, o que não vaza nem a existência dela. O adapter não precisa saber
 * disso: quem decide é a policy.
 */
export interface LinhaLeadSupabase {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  origem: string;
  tipo_visto_interesse: string;
  area_profissao: string | null;
  mensagem: string | null;
  estagio: EstagioLead;
  nao_contatar: boolean;
  notas: string[] | null;
  perfil: PerfilLead | null;
  perfil_origem: Partial<Record<keyof PerfilLead, OrigemCampoPerfil>> | null;
  qualificacao: EstadoQualificacao | null;
  cadencia: EstadoCadencia | null;
  gate_agendamento: DecisaoGateAgendamento | null;
  created_at: string;
}

export function paraDominio(linha: LinhaLeadSupabase): Lead {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    telefone: linha.telefone,
    origem: linha.origem,
    tipoVistoInteresse: linha.tipo_visto_interesse,
    areaProfissao: linha.area_profissao ?? undefined,
    mensagem: linha.mensagem ?? undefined,
    estagio: linha.estagio,
    criadoEm: linha.created_at,
    // `notas` nasce com DEFAULT '[]' no banco; o `?? []` cobre linha antiga ou coluna nula.
    notas: linha.notas ?? [],
    perfil: linha.perfil ?? undefined,
    perfilOrigem: linha.perfil_origem ?? undefined,
    qualificacao: linha.qualificacao ?? undefined,
    cadencia: linha.cadencia ?? undefined,
    gateAgendamento: linha.gate_agendamento ?? undefined,
    naoContatar: linha.nao_contatar,
  };
}

/**
 * Mapeamento de entrada→coluna. Não é mais usado pelo `criar()` (que passa pela function), mas
 * continua sendo o contrato de forma da tabela — e o teste dele é o que pega coluna esquecida,
 * porque o retorno é `Record<string, unknown>` e o TypeScript não ajuda.
 */
export function paraColunas(input: NovoLead): Record<string, unknown> {
  return {
    nome: input.nome,
    email: input.email,
    telefone: input.telefone,
    origem: input.origem,
    tipo_visto_interesse: input.tipoVistoInteresse,
    area_profissao: input.areaProfissao ?? null,
    mensagem: input.mensagem ?? null,
    perfil: input.perfil ?? null,
    perfil_origem: input.perfilOrigem ?? null,
    qualificacao: input.qualificacao ?? null,
    cadencia: input.cadencia ?? null,
    gate_agendamento: input.gateAgendamento ?? null,
    nao_contatar: input.naoContatar ?? false,
  };
}

const tabela = () => getSupabase().schema("crm").from("leads");

export class SupabaseLeadRepository implements LeadRepository {
  async listar(): Promise<Lead[]> {
    const { data, error } = await tabela().select().is("deleted_at", null);
    if (error) throw error;
    return (data as LinhaLeadSupabase[]).map(paraDominio);
  }

  async obter(id: string): Promise<Lead | null> {
    const { data, error } = await tabela().select().eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? paraDominio(data as LinhaLeadSupabase) : null;
  }

  /**
   * E13-S09 AC-7 — passa pela Edge Function `lead-capturar`, não por `INSERT` direto.
   *
   * Quem chama isto é o formulário público de `/contatos`, com visitante **anônimo**. `crm.leads`
   * é admin-only por RLS, então o `INSERT` direto devolve `401` (verificado contra o banco real).
   * Dar `INSERT` para `anon` resolveria o erro e abriria escrita pública no CRM — spam direto na
   * base de pré-venda. A function valida, aplica rate limit e escreve com `service_role`.
   *
   * A function devolve só o `id`; o resto do lead é remontado da entrada, porque o visitante não
   * precisa (nem deve) receber a linha inteira de volta.
   */
  async criar(input: NovoLead): Promise<Lead> {
    const resposta = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: input.nome,
        email: input.email,
        telefone: input.telefone,
        tipoVistoInteresse: input.tipoVistoInteresse,
        areaProfissao: input.areaProfissao,
        mensagem: input.mensagem,
        origem: input.origem,
      }),
    });
    if (!resposta.ok) {
      throw new Error(
        resposta.status === 429
          ? "Muitas tentativas. Tente de novo em alguns minutos."
          : "Não foi possível enviar seu contato agora. Tente de novo.",
      );
    }
    const { id } = (await resposta.json()) as { id: string };
    return {
      ...input,
      id,
      estagio: "lead",
      criadoEm: new Date().toISOString(),
      notas: [],
    };
  }

  async moverEstagio(id: string, estagio: EstagioLead): Promise<void> {
    const { error } = await tabela().update({ estagio }).eq("id", id);
    if (error) throw error;
  }

  /**
   * Nota é append em `jsonb`. Feito com leitura seguida de escrita: é uma corrida teórica (dois
   * admins anotando o mesmo lead no mesmo instante perderiam uma nota), e fica registrada aqui em
   * vez de escondida. Resolver exigiria `jsonb_insert` numa função do banco — desproporcional
   * enquanto a operação é de um punhado de pessoas no mesmo escritório.
   */
  async adicionarNota(id: string, nota: string): Promise<void> {
    const atual = await this.obter(id);
    if (!atual) throw new Error(`Lead ${id} não encontrado`);
    const { error } = await tabela()
      .update({ notas: [...atual.notas, nota] })
      .eq("id", id);
    if (error) throw error;
  }

  async atualizarPerfil(
    id: string,
    patch: Partial<PerfilLead>,
    origem: OrigemCampoPerfil,
  ): Promise<void> {
    const atual = await this.obter(id);
    if (!atual) throw new Error(`Lead ${id} não encontrado`);
    const perfil = { ...(atual.perfil ?? {}), ...patch };
    const perfilOrigem = { ...(atual.perfilOrigem ?? {}) };
    for (const campo of Object.keys(patch) as Array<keyof PerfilLead>) {
      perfilOrigem[campo] = origem;
    }
    const { error } = await tabela().update({ perfil, perfil_origem: perfilOrigem }).eq("id", id);
    if (error) throw error;
  }

  async responderQualificacao(id: string, perguntaId: string, resposta: string): Promise<void> {
    const atual = await this.obter(id);
    if (!atual) throw new Error(`Lead ${id} não encontrado`);
    const anterior = atual.qualificacao ?? {
      status: "nao_iniciada" as const,
      perguntaAtualIndex: 0,
      respostas: {},
    };
    const qualificacao: EstadoQualificacao = {
      ...anterior,
      status: "em_andamento",
      perguntaAtualIndex: anterior.perguntaAtualIndex + 1,
      respostas: { ...anterior.respostas, [perguntaId]: resposta },
    };
    const { error } = await tabela().update({ qualificacao }).eq("id", id);
    if (error) throw error;
  }

  async decidirGateAgendamento(
    id: string,
    decisao: "aprovado" | "recusado",
    autor: string,
    motivoRecusa?: string,
  ): Promise<void> {
    const gate: DecisaoGateAgendamento = {
      status: decisao,
      autor,
      decididoEm: new Date().toISOString(),
      motivoRecusa,
    };
    const { error } = await tabela().update({ gate_agendamento: gate }).eq("id", id);
    if (error) throw error;
  }
}
