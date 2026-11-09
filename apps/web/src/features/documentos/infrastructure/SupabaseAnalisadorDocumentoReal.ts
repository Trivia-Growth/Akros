import { getSupabase } from "@/shared/supabase/client";
import type {
  AnalisadorDocumentoPort,
  PreAnaliseDocumento,
  RascunhoResposta,
} from "../application/ports";
import type { AnaliseDocumento, TipoDocumento } from "../domain/types";
import { paraDocumento } from "./SupabaseDocumentosConsulta";

const CABECALHO_CSRF = { "x-akros-csrf": "1" };

interface LinhaPreAnalise {
  versao_id: string;
  pagina_completa: boolean;
  resolucao_suficiente: boolean;
  tipo_conteudo: PreAnaliseDocumento["tipoConteudo"];
  motivo_problema: string | null;
  calculado_em: string;
}

interface LinhaRascunho {
  id: string;
  documento_id: string;
  texto: string;
  prazo_resposta_dias_uteis_usado: number;
  prioridade_usada: RascunhoResposta["prioridadeUsada"];
  gerado_em: string;
}

/** E07-S05 — adapter real da análise de documento. `analisar`/`rascunharResposta` disparam Edge
 *  Functions que fazem o trabalho sensível (OCR, mascaramento, chamada a OpenRouter); este
 *  arquivo nunca lê arquivo nem monta prompt — só invoca e devolve o resultado gravado. */
export class SupabaseAnalisadorDocumentoReal implements AnalisadorDocumentoPort {
  async analisar(input: {
    documentoId: string;
    tipoEsperado: TipoDocumento;
    objetivoRequisito: string;
    skillAnalise?: string;
    arquivoReferenciaId?: string;
  }): Promise<AnaliseDocumento> {
    const { data, error } = await getSupabase().functions.invoke("documento-ocr-cruzamento", {
      headers: CABECALHO_CSRF,
      body: { documentoId: input.documentoId },
    });
    if (error) {
      const status = (error as { context?: Response }).context?.status ?? 500;
      throw new Error(`analise_falhou_${status}`);
    }
    const documento = paraDocumento(data as Parameters<typeof paraDocumento>[0]);
    if (!documento.analise) throw new Error("analise_indisponivel");
    return documento.analise;
  }

  async obterPreAnalise(versaoId: string): Promise<PreAnaliseDocumento | null> {
    const { data, error } = await getSupabase()
      .schema("documentos")
      .from("pre_analises")
      .select()
      .eq("versao_id", versaoId)
      .maybeSingle<LinhaPreAnalise>();
    if (error) throw error;
    if (!data) return null;
    return {
      versaoId: data.versao_id,
      paginaCompleta: data.pagina_completa,
      resolucaoSuficiente: data.resolucao_suficiente,
      tipoConteudo: data.tipo_conteudo,
      ...(data.motivo_problema ? { motivoProblema: data.motivo_problema } : {}),
      calculadoEm: data.calculado_em,
    };
  }

  async rascunharResposta(documentoId: string): Promise<RascunhoResposta> {
    const { data, error } = await getSupabase().functions.invoke("documento-rascunho-resposta", {
      headers: CABECALHO_CSRF,
      body: { documentoId },
    });
    if (error) {
      const status = (error as { context?: Response }).context?.status ?? 500;
      throw new Error(`rascunho_falhou_${status}`);
    }
    const linha = data as LinhaRascunho;
    return {
      id: linha.id,
      documentoId: linha.documento_id,
      texto: linha.texto,
      prazoRespostaDiasUteisUsado: linha.prazo_resposta_dias_uteis_usado,
      prioridadeUsada: linha.prioridade_usada,
      geradoEm: linha.gerado_em,
    };
  }
}
