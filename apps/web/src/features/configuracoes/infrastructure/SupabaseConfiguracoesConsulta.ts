import { getSupabase } from "@/shared/supabase/client";
import type { ConfiguracoesConsulta } from "../application/ports";
import type {
  AgenteIAIntegracao,
  CategoriaIntegracao,
  ContaCanalConectada,
  ContaConectada,
  EscopoConta,
  IntegracaoExterna,
  ProvedorAgenda,
  ProvedorCanal,
  UsuarioAkros,
} from "../domain/types";

type JsonObjeto = Record<string, unknown>;

interface LinhaEquipe {
  id: string;
  nome: string;
  cargo: string;
  avatar_url: string | null;
}

interface LinhaIntegracao {
  id: string;
  codigo: string;
  nome: string;
  fornecedor: string;
  categoria: CategoriaIntegracao;
  descricao: string;
  ativa: boolean;
  segredo_configurado: boolean;
  atualizado_em: string | null;
}

interface LinhaContaAgenda {
  id: string;
  provedor: ProvedorAgenda;
  nome_exibicao: string;
  ativa: boolean;
  conectado_em: string;
  escopos: EscopoConta[];
  dono_id: string;
  email_endereco: string | null;
  pasta_raiz: string | null;
  credenciais_configuradas: boolean;
  metadados_publicos: unknown;
}

interface LinhaCompartilhamento {
  conta_id: string;
  membro_id: string;
}

interface LinhaContaCanal {
  id: string;
  provedor: ProvedorCanal;
  nome_exibicao: string;
  identificador: string;
  ativa: boolean;
  conectado_em: string;
  credenciais_configuradas: boolean;
  metadados_publicos: unknown;
}

interface LinhaAgenteIA {
  id: string;
  ativo: boolean;
  nome_agente: string;
  funcao: string;
  alma: string;
  saudacao: string;
  mensagem_handoff: string;
  llm: unknown;
}

function objeto(valor: unknown): JsonObjeto {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as JsonObjeto)
    : {};
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function paraEquipe(linha: LinhaEquipe): UsuarioAkros {
  return {
    id: linha.id,
    nome: linha.nome,
    cargo: linha.cargo,
    ...(linha.avatar_url ? { avatarUrl: linha.avatar_url } : {}),
  };
}

function paraIntegracao(linha: LinhaIntegracao): IntegracaoExterna {
  return {
    id: linha.codigo,
    nome: linha.nome,
    fornecedor: linha.fornecedor,
    categoria: linha.categoria,
    descricao: linha.descricao,
    ativa: linha.ativa,
    segredoConfigurado: linha.segredo_configurado,
    ...(linha.atualizado_em ? { atualizadoEm: linha.atualizado_em } : {}),
  };
}

function paraCredenciais(linha: LinhaContaAgenda): ContaConectada["credenciais"] {
  const metadados = objeto(linha.metadados_publicos);
  const configuradas = linha.credenciais_configuradas;
  if (linha.provedor === "google") {
    return {
      provedor: "google",
      dados: {
        clientId: texto(metadados.clientId),
        clientSecretConfigurado: configuradas,
        refreshTokenConfigurado: configuradas,
        calendarId: texto(metadados.calendarId),
      },
    };
  }
  if (linha.provedor === "microsoft") {
    return {
      provedor: "microsoft",
      dados: {
        clientId: texto(metadados.clientId),
        clientSecretConfigurado: configuradas,
        tenantId: texto(metadados.tenantId),
        refreshTokenConfigurado: configuradas,
      },
    };
  }
  return {
    provedor: "calendly",
    dados: {
      personalAccessTokenConfigurado: configuradas,
      organizationUri: texto(metadados.organizationUri),
      eventTypeUri: texto(metadados.eventTypeUri),
    },
  };
}

export function paraContaAgenda(
  linha: LinhaContaAgenda,
  compartilhadoComIds: string[],
): ContaConectada {
  return {
    id: linha.id,
    provedor: linha.provedor,
    nomeExibicao: linha.nome_exibicao,
    ativa: linha.ativa,
    conectadoEm: linha.conectado_em,
    credenciais: paraCredenciais(linha),
    escopos: linha.escopos,
    donoId: linha.dono_id,
    ...(linha.email_endereco ? { emailEndereco: linha.email_endereco } : {}),
    ...(linha.pasta_raiz ? { pastaRaiz: linha.pasta_raiz } : {}),
    ...(compartilhadoComIds.length ? { compartilhadoComIds } : {}),
  };
}

function paraContaCanal(linha: LinhaContaCanal): ContaCanalConectada {
  const conta: ContaCanalConectada = {
    id: linha.id,
    provedor: linha.provedor,
    nomeExibicao: linha.nome_exibicao,
    identificador: linha.identificador,
    ativa: linha.ativa,
    conectadoEm: linha.conectado_em,
  };
  const metadados = objeto(linha.metadados_publicos);
  const baseUrl = texto(metadados.baseUrl);
  const instancia = texto(metadados.instancia);
  if (linha.provedor === "evolution" && baseUrl && instancia) {
    conta.evolution = {
      baseUrl,
      instancia,
      credenciaisConfiguradas: linha.credenciais_configuradas,
    };
  }
  return conta;
}

function paraAgenteIA(linha: LinhaAgenteIA): AgenteIAIntegracao {
  const llm = objeto(linha.llm);
  return {
    id: linha.id,
    nome: linha.nome_agente,
    funcao: linha.funcao,
    alma: linha.alma,
    saudacao: linha.saudacao,
    mensagemHandoff: linha.mensagem_handoff,
    modelo: texto(llm.modelo) || "",
    ativo: linha.ativo,
  };
}

/** E13-S11 AC-1: leitura admin de configurações sem misturar fixtures ou segredos. */
export class SupabaseConfiguracoesConsulta implements ConfiguracoesConsulta {
  async carregar() {
    const banco = getSupabase().schema("configuracoes");
    const [equipe, integracoes, contasAgenda, compartilhamentos, contasCanal, agentesIA] =
      await Promise.all([
        banco.from("equipe").select().is("deleted_at", null).order("nome"),
        banco.from("integracoes").select().is("deleted_at", null).order("nome"),
        banco.from("contas_agenda").select().is("deleted_at", null).order("conectado_em"),
        banco.from("contas_agenda_compartilhamentos").select("conta_id,membro_id"),
        banco.from("contas_canal").select().is("deleted_at", null).order("conectado_em"),
        getSupabase()
          .schema("comunicacao")
          .from("regras_atendimento_ia")
          .select("id,ativo,nome_agente,funcao,alma,saudacao,mensagem_handoff,llm")
          .order("nome_agente"),
      ]);
    const erro = [
      equipe,
      integracoes,
      contasAgenda,
      compartilhamentos,
      contasCanal,
      agentesIA,
    ].find((resultado) => resultado.error)?.error;
    if (erro) throw erro;

    const compartilhadosPorConta = new Map<string, string[]>();
    for (const compartilhamento of (compartilhamentos.data ?? []) as LinhaCompartilhamento[]) {
      const membros = compartilhadosPorConta.get(compartilhamento.conta_id) ?? [];
      membros.push(compartilhamento.membro_id);
      compartilhadosPorConta.set(compartilhamento.conta_id, membros);
    }

    return {
      equipe: ((equipe.data ?? []) as LinhaEquipe[]).map(paraEquipe),
      integracoes: ((integracoes.data ?? []) as LinhaIntegracao[]).map(paraIntegracao),
      contasAgenda: ((contasAgenda.data ?? []) as LinhaContaAgenda[]).map((conta) =>
        paraContaAgenda(conta, compartilhadosPorConta.get(conta.id) ?? []),
      ),
      contasCanal: ((contasCanal.data ?? []) as LinhaContaCanal[]).map(paraContaCanal),
      agentesIA: ((agentesIA.data ?? []) as LinhaAgenteIA[]).map(paraAgenteIA),
    };
  }
}
