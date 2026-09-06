import { getSupabase } from "@/shared/supabase/client";
import type { DocumentosConsulta } from "../application/ports";
import type {
  AnaliseDocumento,
  DecisaoRevisao,
  Documento,
  SolicitacaoAssinatura,
  TipoDocumento,
} from "../domain/types";

type JsonObjeto = Record<string, unknown>;

interface LinhaDocumento {
  id: string;
  cliente_id: string;
  fase_id: string | null;
  nome: string;
  tipo: TipoDocumento;
  status: Documento["status"];
  url_mock: string | null;
  enviado_em: string | null;
  requisito_id: string | null;
  analise: unknown;
  enviado_apesar_do_alerta: boolean | null;
  decisao: unknown;
}

interface LinhaAssinatura {
  id: string;
  documento_id: string;
  status: SolicitacaoAssinatura["status"];
  assinado_por: string | null;
  assinado_em: string | null;
}

function ehObjeto(valor: unknown): valor is JsonObjeto {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor : undefined;
}

function paraAnalise(valor: unknown, documentoId: string): AnaliseDocumento | undefined {
  if (!ehObjeto(valor)) return undefined;
  const aderencia = valor.aderencia;
  if (
    aderencia !== "atende" &&
    aderencia !== "atende_com_ressalva" &&
    aderencia !== "nao_atende" &&
    aderencia !== "tipo_incorreto"
  ) {
    return undefined;
  }
  const tipoDetectado = texto(valor.tipoDetectado);
  const tipoEsperado = texto(valor.tipoEsperado);
  if (!tipoDetectado || !tipoEsperado) return undefined;
  const lacunas = Array.isArray(valor.lacunas)
    ? valor.lacunas.flatMap((lacuna, indice) => {
        if (!ehObjeto(lacuna)) return [];
        const descricao = texto(lacuna.descricao);
        const gravidade = lacuna.gravidade;
        if (!descricao || (gravidade !== "impeditiva" && gravidade !== "recomendada")) return [];
        return [
          {
            id: texto(lacuna.id) ?? `${documentoId}-lacuna-${indice + 1}`,
            descricao,
            gravidade: gravidade as "impeditiva" | "recomendada",
          },
        ];
      })
    : [];
  return {
    documentoId,
    tipoDetectado: tipoDetectado as TipoDocumento,
    tipoEsperado: tipoEsperado as TipoDocumento,
    aderencia,
    confianca: typeof valor.confianca === "number" ? valor.confianca : 0,
    lacunas,
    sugestoes: Array.isArray(valor.sugestoes)
      ? valor.sugestoes.filter((sugestao): sugestao is string => typeof sugestao === "string")
      : [],
    analisadoEm: texto(valor.analisadoEm) ?? "",
    motor: texto(valor.motor) ?? "",
  };
}

function paraDecisao(valor: unknown): DecisaoRevisao | undefined {
  if (!ehObjeto(valor) || (valor.decisao !== "aprovado" && valor.decisao !== "ajustes")) {
    return undefined;
  }
  const autor = texto(valor.autor);
  const decididoEm = texto(valor.decididoEm);
  if (!autor || !decididoEm || typeof valor.concordouComIA !== "boolean") return undefined;
  return {
    decisao: valor.decisao,
    autor,
    decididoEm,
    concordouComIA: valor.concordouComIA,
    ...(texto(valor.motivoAjuste) ? { motivoAjuste: texto(valor.motivoAjuste) } : {}),
  };
}

export function paraDocumento(linha: LinhaDocumento): Documento {
  const analise = paraAnalise(linha.analise, linha.id);
  const decisao = paraDecisao(linha.decisao);
  return {
    id: linha.id,
    clienteId: linha.cliente_id,
    nome: linha.nome,
    tipo: linha.tipo,
    status: linha.status,
    ...(linha.fase_id ? { faseId: linha.fase_id } : {}),
    ...(linha.url_mock ? { urlMock: linha.url_mock } : {}),
    ...(linha.enviado_em ? { enviadoEm: linha.enviado_em } : {}),
    ...(linha.requisito_id ? { requisitoId: linha.requisito_id } : {}),
    ...(analise ? { analise } : {}),
    ...(linha.enviado_apesar_do_alerta ? { enviadoApesarDoAlerta: true } : {}),
    ...(decisao ? { decisao } : {}),
  };
}

export function paraSolicitacaoAssinatura(linha: LinhaAssinatura): SolicitacaoAssinatura {
  return {
    id: linha.id,
    documentoId: linha.documento_id,
    status: linha.status,
    ...(linha.assinado_por ? { assinadoPor: linha.assinado_por } : {}),
    ...(linha.assinado_em ? { assinadoEm: linha.assinado_em } : {}),
  };
}

/** Leitura do portal sem ID de fixture; RLS define documentos e assinaturas acessíveis. */
export class SupabaseDocumentosConsulta implements DocumentosConsulta {
  async carregarCliente() {
    const { data, error } = await getSupabase()
      .schema("documentos")
      .from("documentos")
      .select()
      .order("created_at");
    if (error) throw error;
    const documentos = (data as LinhaDocumento[]).map(paraDocumento);
    const documentosIds = documentos.map((documento) => documento.id);
    if (documentosIds.length === 0) return { documentos, solicitacoes: [] };

    const { data: assinaturas, error: erroAssinaturas } = await getSupabase()
      .schema("documentos")
      .from("solicitacoes_assinatura")
      .select()
      .in("documento_id", documentosIds)
      .order("created_at");
    if (erroAssinaturas) throw erroAssinaturas;
    return {
      documentos,
      solicitacoes: (assinaturas as LinhaAssinatura[]).map(paraSolicitacaoAssinatura),
    };
  }
}
