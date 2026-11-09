import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clienteServico, escopoOpenRouter, obterSegredo } from "./integracoes.ts";
import type { SegredoOpenRouter } from "./segredos.ts";
import type {
  DocumentoParaCruzamento,
  IODocumentoCruzamento,
  ParecerCruzamento,
  VersaoRecebida,
} from "./documento-cruzamento.ts";
import { baixarBytesDoGraph } from "./arquivo-baixar.ts";
import { criarIOGraphMicrosoft, type SegredoMicrosoftGraph } from "./graph-microsoft.ts";
import type { ValorConhecido } from "./mascaramento-pii.ts";

const ESCOPO_IA_APOIO = "ia-apoio-processo";

export function criarIODocumentoCruzamento(clienteOverride?: SupabaseClient): IODocumentoCruzamento {
  const sb = () => clienteOverride ?? clienteServico();
  const graph = criarIOGraphMicrosoft();

  return {
    async carregarDocumento(documentoId): Promise<DocumentoParaCruzamento | null> {
      const { data, error } = await sb()
        .schema("documentos")
        .from("documentos")
        .select("id,cliente_id,tipo,status")
        .eq("id", documentoId)
        .maybeSingle<{ id: string; cliente_id: string; tipo: string; status: string }>();
      if (error) throw error;
      if (!data) return null;
      const { data: cliente, error: erroCliente } = await sb()
        .schema("crm")
        .from("clientes")
        .select("ia_apoio_ativa")
        .eq("id", data.cliente_id)
        .maybeSingle<{ ia_apoio_ativa: boolean }>();
      if (erroCliente) throw erroCliente;
      return {
        id: data.id,
        clienteId: data.cliente_id,
        tipo: data.tipo,
        status: data.status,
        iaApoioAtiva: cliente?.ia_apoio_ativa ?? false,
      };
    },

    async carregarUltimaVersaoRecebida(documentoId): Promise<VersaoRecebida | null> {
      const { data: versao, error } = await sb()
        .schema("arquivos")
        .from("versoes")
        .select("id")
        .eq("documento_id", documentoId)
        .eq("estado_recebimento", "recebida")
        .order("numero_versao", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();
      if (error) throw error;
      if (!versao) return null;

      const { data: preAnalise, error: erroPre } = await sb()
        .schema("documentos")
        .from("pre_analises")
        .select("motivo_problema")
        .eq("versao_id", versao.id)
        .maybeSingle<{ motivo_problema: string | null }>();
      if (erroPre) throw erroPre;

      return { id: versao.id, motivoProblema: preAnalise?.motivo_problema ?? null };
    },

    async baixarBytes(versaoId) {
      const io = {
        carregarVersao: async (id: string) => {
          const { data, error } = await sb()
            .schema("arquivos")
            .from("versoes")
            .select("id,cliente_id,documento_id,pagamento_id,contrato_id,nome_original,drive_id,item_id,estado_armazenamento")
            .eq("id", id)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;
          return {
            id: data.id,
            clienteId: data.cliente_id,
            documentoId: data.documento_id,
            pagamentoId: data.pagamento_id,
            contratoId: data.contrato_id,
            nomeOriginal: data.nome_original,
            driveId: data.drive_id,
            itemId: data.item_id,
            estadoArmazenamento: data.estado_armazenamento,
          };
        },
        integracaoDoCliente: async (clienteId: string) => {
          const { data, error } = await sb()
            .schema("arquivos")
            .from("vinculos_pasta")
            .select("integracao_id,drive_id")
            .eq("cliente_id", clienteId)
            .maybeSingle<{ integracao_id: string; drive_id: string }>();
          if (error) throw error;
          return data ? { integracaoId: data.integracao_id, driveId: data.drive_id } : null;
        },
        obterSegredoVault: (escopo: string) => obterSegredo<SegredoMicrosoftGraph>(sb(), escopo),
        salvarSegredoVault: async (escopo: string, valor: Record<string, string>) => {
          const { salvarSegredo } = await import("./integracoes.ts");
          await salvarSegredo(sb(), escopo, valor);
        },
      };
      const resultado = await baixarBytesDoGraph(io, graph, versaoId);
      return resultado.bytes;
    },

    async valoresConhecidosDoCaso(clienteId): Promise<ValorConhecido[]> {
      const { data, error } = await sb()
        .schema("crm")
        .from("clientes")
        .select("nome,perfil_imigratorio")
        .eq("id", clienteId)
        .maybeSingle<{ nome: string; perfil_imigratorio: Record<string, unknown> | null }>();
      if (error) throw error;
      if (!data) return [];

      const conhecidos: ValorConhecido[] = [{ rotulo: "NOME_1", valor: data.nome }];
      const perfil = data.perfil_imigratorio;
      if (perfil && typeof perfil.nomeCompletoLegal === "string") {
        conhecidos.push({ rotulo: "NOME_1", valor: perfil.nomeCompletoLegal });
      }
      if (perfil && typeof perfil.numeroPassaporte === "string") {
        conhecidos.push({ rotulo: "PASSAPORTE", valor: perfil.numeroPassaporte });
      }
      const familiares = Array.isArray(perfil?.familiares) ? perfil!.familiares : [];
      familiares.forEach((f, i) => {
        const fam = f as Record<string, unknown>;
        if (typeof fam.nome === "string") {
          conhecidos.push({ rotulo: `NOME_FAMILIAR_${i + 1}`, valor: fam.nome });
        }
      });
      return conhecidos;
    },

    async obterChaveOpenRouter() {
      const segredo = await obterSegredo<SegredoOpenRouter & { modelo?: string }>(
        sb(),
        escopoOpenRouter(ESCOPO_IA_APOIO),
      );
      if (!segredo?.apiKey) return null;
      return { apiKey: segredo.apiKey, modelo: segredo.modelo || "openai/gpt-4.1-mini" };
    },

    async gravarParecer(documentoId: string, parecer: ParecerCruzamento) {
      const analise = {
        documentoId,
        tipoDetectado: undefined,
        tipoEsperado: undefined,
        aderencia: parecer.aderencia,
        confianca: parecer.confianca,
        lacunas: parecer.lacunas,
        sugestoes: parecer.sugestoes,
        analisadoEm: parecer.analisadoEm,
        motor: parecer.motor,
      };
      // Nunca toca `status` aqui — o parecer é só sugestão (ADR-0005); a transição de status
      // continua exclusivamente em `revisar_documento` (E03-S07 Fase 6).
      const { error } = await sb().schema("documentos").from("documentos").update({ analise }).eq("id", documentoId);
      if (error) throw error;
    },

    async registrarChamadaIa(versaoId: string) {
      const { error } = await sb().schema("documentos").from("chamadas_ia").insert({
        versao_id: versaoId,
        provedor: "openrouter",
        finalidade: "cruzamento_requisito",
        enviado_por_processo: "documento-ocr-cruzamento",
      });
      if (error) throw error;
    },
  };
}
