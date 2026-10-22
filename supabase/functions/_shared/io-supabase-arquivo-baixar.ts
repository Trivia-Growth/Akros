// _shared/io-supabase-arquivo-baixar.ts — E/S real de `arquivo-baixar` (E03-S07, Fase 5/US2,
// ADR-0019). Mesma divisão de `io-supabase-caso.ts`: tudo que decide está em
// `arquivo-baixar.ts`; aqui só há encanamento com `service_role`. Lê SEM RLS de propósito (a
// autorização é reimplementada em código espelhando a mesma regra da policy, ver comentário no
// topo de `arquivo-baixar.ts`) — é o único jeito de dar 404 uniforme (RLS devolveria "sem
// linhas", mas ainda precisamos ler `documentos.documentos`/`jornada.fases` para decidir o
// motivo certo antes de responder).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clienteServico, obterSegredo, salvarSegredo } from "./integracoes.ts";
import type { IOArquivoBaixar, VersaoParaDownload, DocumentoDestino } from "./arquivo-baixar.ts";
import { criarIOCaso } from "./io-supabase-caso.ts";
import type { SegredoMicrosoftGraph } from "./graph-microsoft.ts";

let cliente: SupabaseClient | null = null;
const sb = () => (cliente ??= clienteServico());

export function criarIOArquivoBaixar(): IOArquivoBaixar {
  return {
    autorizacaoCaso: criarIOCaso(),

    async carregarVersao(versaoId) {
      const { data, error } = await sb()
        .schema("arquivos")
        .from("versoes")
        .select("id,cliente_id,documento_id,pagamento_id,contrato_id,nome_original,drive_id,item_id,estado_armazenamento")
        .eq("id", versaoId)
        .maybeSingle<{
          id: string;
          cliente_id: string;
          documento_id: string | null;
          pagamento_id: string | null;
          contrato_id: string | null;
          nome_original: string;
          drive_id: string | null;
          item_id: string | null;
          estado_armazenamento: string;
        }>();
      if (error) throw new Error("falha ao carregar versão para download");
      if (!data) return null;
      const versao: VersaoParaDownload = {
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
      return versao;
    },

    async carregarDocumentoDestino(documentoId) {
      const { data, error } = await sb()
        .schema("documentos")
        .from("documentos")
        .select("fase_id,restrito_ao_papel,papel_dirigido")
        .eq("id", documentoId)
        .maybeSingle<{
          fase_id: string | null;
          restrito_ao_papel: boolean;
          papel_dirigido: DocumentoDestino["papelDirigido"];
        }>();
      if (error) throw new Error("falha ao carregar documento dono da versão");
      if (!data) return null;
      return { faseId: data.fase_id, restritoAoPapel: data.restrito_ao_papel, papelDirigido: data.papel_dirigido };
    },

    async faseLiberada(faseId) {
      const { data, error } = await sb().schema("jornada").from("fases").select("status").eq("id", faseId).maybeSingle<{
        status: string;
      }>();
      if (error) throw new Error("falha ao carregar fase do documento");
      if (!data) return false;
      return data.status === "liberada" || data.status === "em_andamento" || data.status === "concluida";
    },

    async participanteRevogado(authUserId, clienteId) {
      const { data, error } = await sb()
        .schema("crm")
        .from("participantes")
        .select("estado")
        .eq("auth_user_id", authUserId)
        .eq("cliente_id", clienteId)
        .eq("estado", "revogado")
        .limit(1)
        .maybeSingle<{ estado: string }>();
      if (error) throw new Error("falha ao checar estado de participação");
      return Boolean(data);
    },

    async integracaoDoCliente(clienteId) {
      const { data: vinculo, error: erroVinculo } = await sb()
        .schema("arquivos")
        .from("vinculos_pasta")
        .select("integracao_id")
        .eq("cliente_id", clienteId)
        .eq("estado", "ativo")
        .order("validado_em", { ascending: false })
        .limit(1)
        .maybeSingle<{ integracao_id: string }>();
      if (erroVinculo) throw new Error("falha ao carregar vínculo de pasta do caso");
      if (!vinculo) return null;

      const { data: integracao, error: erroIntegracao } = await sb()
        .schema("arquivos")
        .from("integracoes_microsoft")
        .select("id,drive_id,estado")
        .eq("id", vinculo.integracao_id)
        .maybeSingle<{ id: string; drive_id: string; estado: string }>();
      if (erroIntegracao) throw new Error("falha ao carregar integração Microsoft");
      if (!integracao || integracao.estado !== "conectada") return null;
      return { integracaoId: integracao.id, driveId: integracao.drive_id };
    },

    async obterSegredoVault(escopo) {
      return obterSegredo<SegredoMicrosoftGraph>(sb(), escopo);
    },

    async salvarSegredoVault(escopo, valor) {
      await salvarSegredo(sb(), escopo, valor);
    },
  };
}
