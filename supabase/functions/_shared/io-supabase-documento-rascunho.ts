import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clienteServico, escopoOpenRouter, obterSegredo } from "./integracoes.ts";
import type { SegredoOpenRouter } from "./segredos.ts";
import type { ContratoDoCaso, DocumentoComParecer, IODocumentoRascunho } from "./documento-rascunho.ts";

const ESCOPO_IA_APOIO = "ia-apoio-processo";

export function criarIODocumentoRascunho(clienteOverride?: SupabaseClient): IODocumentoRascunho {
  const sb = () => clienteOverride ?? clienteServico();

  return {
    async carregarDocumentoComParecer(documentoId): Promise<DocumentoComParecer | null> {
      const { data, error } = await sb()
        .schema("documentos")
        .from("documentos")
        .select("cliente_id,analise")
        .eq("id", documentoId)
        .maybeSingle<{ cliente_id: string; analise: DocumentoComParecer["analise"] }>();
      if (error) throw error;
      if (!data) return null;
      return { clienteId: data.cliente_id, analise: data.analise };
    },

    async carregarContratoAtivo(clienteId): Promise<ContratoDoCaso | null> {
      const { data, error } = await sb()
        .schema("crm")
        .from("contratos")
        .select("prazo_resposta_dias_uteis,prioridade")
        .eq("cliente_id", clienteId)
        .eq("ativo", true)
        .maybeSingle<{ prazo_resposta_dias_uteis: number; prioridade: "padrao" | "prioritaria" }>();
      if (error) throw error;
      if (!data) return null;
      return { prazoRespostaDiasUteis: data.prazo_resposta_dias_uteis, prioridade: data.prioridade };
    },

    async obterChaveOpenRouter() {
      const segredo = await obterSegredo<SegredoOpenRouter & { modelo?: string }>(
        sb(),
        escopoOpenRouter(ESCOPO_IA_APOIO),
      );
      if (!segredo?.apiKey) return null;
      return { apiKey: segredo.apiKey, modelo: segredo.modelo || "openai/gpt-4.1-mini" };
    },

    async gravarRascunho({ documentoId, texto, prazoRespostaDiasUteisUsado, prioridadeUsada }) {
      const { data, error } = await sb()
        .schema("documentos")
        .from("rascunhos_resposta")
        .insert({
          documento_id: documentoId,
          texto,
          prazo_resposta_dias_uteis_usado: prazoRespostaDiasUteisUsado,
          prioridade_usada: prioridadeUsada,
        })
        .select("id,gerado_em")
        .single<{ id: string; gerado_em: string }>();
      if (error) throw error;
      return { id: data.id, geradoEm: data.gerado_em };
    },

    async registrarChamadaIaDoDocumento(documentoId: string) {
      const { data: versao } = await sb()
        .schema("arquivos")
        .from("versoes")
        .select("id")
        .eq("documento_id", documentoId)
        .eq("estado_recebimento", "recebida")
        .order("numero_versao", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();
      if (!versao) return; // melhor esforço — não bloqueia o rascunho por falta de versão para auditar.
      const { error } = await sb().schema("documentos").from("chamadas_ia").insert({
        versao_id: versao.id,
        provedor: "openrouter",
        finalidade: "rascunho_resposta",
        enviado_por_processo: "documento-rascunho-resposta",
      });
      if (error) throw error;
    },
  };
}
