import { getSupabase } from "@/shared/supabase/client";
import type { ComunicacaoAdminConsulta, ResumoAgenteIA } from "../application/ports";
import type {
  AnexoMensagem,
  CanalComunicacao,
  Conversa,
  EmailMensagem,
  EmailThread,
  FonteConhecimento,
  Mensagem,
} from "../domain/types";
import { paraEvento } from "./SupabaseComunicacaoConsulta";

interface LinhaConversa {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  canal: CanalComunicacao;
  mensagens: unknown;
  atendido_por_ia: boolean;
  custo_ia: number | string | null;
  identificacao?: string | null;
}

interface LinhaEmail {
  id: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  conta_email_id: string | null;
  assunto: string;
  mensagens: unknown;
}

interface LinhaEvento {
  id: string;
  cliente_id: string | null;
  canal: "whatsapp" | "instagram" | "email" | "chat_portal" | "reuniao" | "sistema";
  direcao: "entrada" | "saida" | "interno";
  autor: string;
  conteudo: string;
  anexos: unknown;
  ocorrido_em: string;
  origem_id: string | null;
  pendente_de_canal: boolean | null;
}

interface LinhaAgente {
  id: string;
  ativo: boolean;
  nome_agente: string;
  funcao: string;
}

interface LinhaFonte {
  id: string;
  nome: string;
  tipo: FonteConhecimento["tipo"];
  status: FonteConhecimento["status"];
  itens: number;
}

function paraMensagens(valor: unknown): Mensagem[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const mensagem = item as Record<string, unknown>;
    if (
      typeof mensagem.id !== "string" ||
      (mensagem.autor !== "cliente" &&
        mensagem.autor !== "agente_ia" &&
        mensagem.autor !== "humano") ||
      typeof mensagem.texto !== "string" ||
      typeof mensagem.enviadoEm !== "string" ||
      typeof mensagem.lida !== "boolean"
    )
      return [];
    return [
      {
        id: mensagem.id,
        autor: mensagem.autor,
        texto: mensagem.texto,
        enviadoEm: mensagem.enviadoEm,
        lida: mensagem.lida,
        ...(mensagem.tipo === "imagem" ||
        mensagem.tipo === "audio" ||
        mensagem.tipo === "arquivo" ||
        mensagem.tipo === "video"
          ? { tipo: mensagem.tipo }
          : {}),
        ...paraAnexo(mensagem.anexo),
        ...(typeof mensagem.midiaNome === "string" ? { midiaNome: mensagem.midiaNome } : {}),
        ...(typeof mensagem.duracaoSegundos === "number"
          ? { duracaoSegundos: mensagem.duracaoSegundos }
          : {}),
        ...(typeof mensagem.transcricao === "string" ? { transcricao: mensagem.transcricao } : {}),
      },
    ];
  });
}

function paraAnexo(valor: unknown): { anexo?: AnexoMensagem } {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const a = valor as Record<string, unknown>;
  if (typeof a.mime !== "string" || typeof a.baixado !== "boolean") return {};
  const motivo =
    a.motivo === "tamanho" || a.motivo === "tipo" || a.motivo === "download" ? a.motivo : undefined;
  return {
    anexo: {
      mime: a.mime,
      baixado: a.baixado,
      tamanhoBytes: typeof a.tamanhoBytes === "number" ? a.tamanhoBytes : null,
      // O caminho só vale se o arquivo foi guardado; nunca de um anexo "não baixado".
      ...(a.baixado && typeof a.caminho === "string" ? { caminho: a.caminho } : {}),
      ...(motivo ? { motivo } : {}),
      ...paraTranscricao(a.transcricao),
    },
  };
}

function paraTranscricao(valor: unknown): {
  transcricao?: NonNullable<AnexoMensagem["transcricao"]>;
} {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const t = valor as Record<string, unknown>;
  if (t.estado !== "concluida" && t.estado !== "falhou") return {};
  return {
    transcricao: {
      estado: t.estado,
      ...(t.estado === "falhou" && typeof t.motivo === "string" ? { motivo: t.motivo } : {}),
    },
  };
}

function paraEmails(valor: unknown): EmailMensagem[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const mensagem = item as Record<string, unknown>;
    if (
      typeof mensagem.id !== "string" ||
      typeof mensagem.de !== "string" ||
      typeof mensagem.corpo !== "string" ||
      typeof mensagem.recebidoEm !== "string" ||
      (mensagem.direcao !== "entrada" && mensagem.direcao !== "saida") ||
      typeof mensagem.lida !== "boolean"
    )
      return [];
    return [
      {
        id: mensagem.id,
        de: mensagem.de,
        corpo: mensagem.corpo,
        recebidoEm: mensagem.recebidoEm,
        direcao: mensagem.direcao,
        lida: mensagem.lida,
        ...(typeof mensagem.deNome === "string" ? { deNome: mensagem.deNome } : {}),
        ...(typeof mensagem.anexoNome === "string" ? { anexoNome: mensagem.anexoNome } : {}),
      },
    ];
  });
}

export function paraConversa(linha: LinhaConversa): Conversa {
  return {
    id: linha.id,
    ...(linha.cliente_id ? { clienteId: linha.cliente_id } : {}),
    clienteNome: linha.cliente_nome,
    canal: linha.canal,
    mensagens: paraMensagens(linha.mensagens),
    atendidoPorIA: linha.atendido_por_ia,
    identificacao: linha.identificacao === "nao_identificada" ? "nao_identificada" : "identificada",
    ...(linha.custo_ia === null ? {} : { custoIA: Number(linha.custo_ia) }),
  };
}

export function paraEmail(linha: LinhaEmail): EmailThread {
  return {
    id: linha.id,
    contaEmailId: linha.conta_email_id ?? "",
    assunto: linha.assunto,
    mensagens: paraEmails(linha.mensagens),
    ...(linha.cliente_id ? { clienteOuLeadId: linha.cliente_id } : {}),
    ...(linha.cliente_nome ? { clienteNome: linha.cliente_nome } : {}),
  };
}

/** Visão administrativa, toda definida por RLS; UI real não atualiza nenhuma dessas tabelas. */
export class SupabaseComunicacaoAdminConsulta implements ComunicacaoAdminConsulta {
  /** Link temporário (60 s) do anexo no bucket privado; só admin consegue (policy do bucket). */
  async urlDoAnexo(caminho: string): Promise<string> {
    const { data, error } = await getSupabase()
      .storage.from("comunicacao-anexos")
      .createSignedUrl(caminho, 60);
    if (error || !data?.signedUrl) throw new Error("Não foi possível abrir o anexo.");
    return data.signedUrl;
  }

  async carregarAdmin() {
    const [conversas, emails, eventos, agentes, fontes] = await Promise.all([
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
      getSupabase()
        .schema("comunicacao")
        .from("regras_atendimento_ia")
        .select("id,ativo,nome_agente,funcao"),
      getSupabase().schema("comunicacao").from("fontes_conhecimento").select(),
    ]);
    if (conversas.error) throw conversas.error;
    if (emails.error) throw emails.error;
    if (eventos.error) throw eventos.error;
    if (agentes.error) throw agentes.error;
    if (fontes.error) throw fontes.error;

    return {
      conversas: (conversas.data as LinhaConversa[]).map(paraConversa),
      emails: (emails.data as LinhaEmail[]).map(paraEmail),
      eventos: (eventos.data as LinhaEvento[])
        .map(paraEvento)
        .filter((evento): evento is NonNullable<typeof evento> => evento !== null),
      agentes: (agentes.data as LinhaAgente[]).map(
        (agente): ResumoAgenteIA => ({
          id: agente.id,
          nome: agente.nome_agente,
          funcao: agente.funcao,
          ativo: agente.ativo,
        }),
      ),
      fontes: (fontes.data as LinhaFonte[]).map((fonte) => ({
        id: fonte.id,
        nome: fonte.nome,
        tipo: fonte.tipo,
        status: fonte.status,
        itens: fonte.itens,
      })),
    };
  }
}
