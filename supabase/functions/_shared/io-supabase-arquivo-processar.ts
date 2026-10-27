// _shared/io-supabase-arquivo-processar.ts — E/S real do processador de transferência (E03-S07,
// Fase 5/US2, ADR-0019). Mesma divisão de `io-supabase-caso.ts`: tudo que decide está em
// `arquivo-processar.ts`; aqui só há encanamento com `service_role`.
//
// Esta Edge Function é o "processador do sistema" (design-tecnico.md §2, "Auditoria": "identidade
// do sistema no processador") — grava DIRETO nas tabelas via `clienteServico()`, sem RPC
// `SECURITY DEFINER` extra para os passos 4-8 (não é ação de usuário final com autor humano a
// auditar). A ÚNICA RPC necessária é `arquivos.adquirir_trabalho_pendente` (migration 0028):
// supabase-js não expõe `FOR UPDATE SKIP LOCKED` em `.from().select()`.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clienteServico, obterSegredo, salvarSegredo } from "./integracoes.ts";
import { LEASE_TRABALHO_MINUTOS } from "./limites.ts";
import type { IOArquivoProcessar, ResultadoContexto, TrabalhoLease } from "./arquivo-processar.ts";
import { MOTIVO_PASTA_AUSENTE, MOTIVO_RECONECTAR } from "./arquivo-processar.ts";
import { executarManutencaoArquivos } from "./manutencao-arquivos.ts";
import type { SegredoMicrosoftGraph } from "./graph-microsoft.ts";

let cliente: SupabaseClient | null = null;
// Criação preguiçosa: ambiente incompleto vira erro de requisição (500), não queda no boot —
// mesmo critério de `io-supabase.ts`/`io-supabase-caso.ts`.
const sb = () => (cliente ??= clienteServico());

export function criarIOArquivoProcessar(clienteOverride?: SupabaseClient): IOArquivoProcessar {
  const api = () => clienteOverride ?? sb();
  return {
    async adquirirTrabalho(leaseDono) {
      await executarManutencaoArquivos({
        async liberarLeases() {
          const { error } = await api().schema("arquivos").rpc("liberar_leases_expiradas");
          if (error) throw new Error("falha ao recuperar leases expiradas");
        },
        async listarConfirmados() {
          const { data, error } = await api().schema("arquivos").from("versoes")
            .select("id,objeto_temporario")
            .eq("estado_armazenamento", "armazenado")
            .not("item_id", "is", null)
            .not("objeto_temporario", "is", null)
            .limit(10);
          if (error) throw new Error("falha ao consultar temporários confirmados");
          return (data ?? []).map((linha) => ({ id: linha.id as string, caminho: linha.objeto_temporario as string }));
        },
        async removerObjeto(caminho) {
          const { error } = await api().storage.from("envios").remove([caminho]);
          if (error) throw new Error("falha ao remover temporário pelo Storage");
        },
        async marcarLimpo(id, caminho) {
          const { error } = await api().schema("arquivos").from("versoes")
            .update({ objeto_temporario: null })
            .eq("id", id).eq("objeto_temporario", caminho)
            .eq("estado_armazenamento", "armazenado").not("item_id", "is", null);
          if (error) throw new Error("falha ao registrar limpeza");
        },
      });
      const { data, error } = await api().schema("arquivos").rpc("adquirir_trabalho_pendente", {
        p_lease_dono: leaseDono,
        p_lease_minutos: LEASE_TRABALHO_MINUTOS,
      });
      if (error) throw new Error("falha ao adquirir trabalho de transferência");
      const linha = Array.isArray(data) ? data[0] : data;
      if (!linha) return null;
      return {
        trabalhoId: linha.id as string,
        versaoId: linha.versao_id as string,
        tentativas: linha.tentativas as number,
      };
    },

    async carregarContexto(trabalho: TrabalhoLease): Promise<ResultadoContexto> {
      const { data: versao, error: erroVersao } = await api()
        .schema("arquivos")
        .from("versoes")
        .select("id,cliente_id,documento_id,pagamento_id,tamanho_bytes,objeto_temporario")
        .eq("id", trabalho.versaoId)
        .maybeSingle<{
          id: string;
          cliente_id: string;
          documento_id: string | null;
          pagamento_id: string | null;
          tamanho_bytes: number;
          objeto_temporario: string | null;
        }>();
      if (erroVersao) throw new Error("falha ao carregar versão do trabalho de transferência");
      if (!versao) throw new Error("versão referenciada pelo trabalho não existe");
      if (!versao.objeto_temporario) throw new Error("versão sem objeto temporário no bucket");

      const { data: vinculo, error: erroVinculo } = await api()
        .schema("arquivos")
        .from("vinculos_pasta")
        .select("integracao_id,drive_id,folder_item_id,estado")
        .eq("cliente_id", versao.cliente_id)
        .eq("estado", "ativo")
        .order("validado_em", { ascending: false })
        .limit(1)
        .maybeSingle<{ integracao_id: string; drive_id: string; folder_item_id: string; estado: string }>();
      if (erroVinculo) throw new Error("falha ao carregar vínculo de pasta do caso");
      if (!vinculo) return { ok: false, motivo: MOTIVO_PASTA_AUSENTE };

      const { data: integracao, error: erroIntegracao } = await api()
        .schema("arquivos")
        .from("integracoes_microsoft")
        .select("id,pasta_raiz_item_id,estado")
        .eq("id", vinculo.integracao_id)
        .maybeSingle<{ id: string; pasta_raiz_item_id: string; estado: string }>();
      if (erroIntegracao) throw new Error("falha ao carregar integração Microsoft");
      if (!integracao || integracao.estado !== "conectada") {
        return { ok: false, motivo: MOTIVO_RECONECTAR };
      }

      return {
        ok: true,
        contexto: {
          versaoId: versao.id,
          clienteId: versao.cliente_id,
          documentoId: versao.documento_id,
          pagamentoId: versao.pagamento_id,
          tamanhoBytes: versao.tamanho_bytes,
          objetoTemporario: versao.objeto_temporario,
          integracaoId: integracao.id,
          driveId: vinculo.drive_id,
          folderItemId: vinculo.folder_item_id,
          pastaRaizItemId: integracao.pasta_raiz_item_id,
        },
      };
    },

    async obterSegredoVault(escopo) {
      return obterSegredo<SegredoMicrosoftGraph>(api(), escopo);
    },

    async salvarSegredoVault(escopo, valor) {
      await salvarSegredo(api(), escopo, valor);
    },

    async descartarSegredoSessao(versaoId) {
      // Melhor esforço (T069 passo 6): sobrescreve com um valor vazio em vez de expor uma RPC de
      // DELETE no cofre — não existe `configuracoes.apagar_segredo_integracao` hoje (0016/0025 só
      // definem salvar/obter); criar uma função nova só para isto, sem outro chamador no
      // repositório, seria superfície nova fora do pedido desta task. Sobrescrever com "" não
      // remove a linha de `configuracoes.referencias_cofre`, mas invalida o conteúdo útil (a URL
      // de sessão expira sozinha no Graph depois de alguns dias de qualquer forma). Nunca lança:
      // uma falha aqui não pode desfazer o sucesso já gravado em `marcarConcluido`.
      try {
        await salvarSegredo(api(), `upload-sessao:${versaoId}`, { uploadUrl: "" });
      } catch {
        // melhor esforço — já logado por `salvarSegredo`/RPC subjacente se necessário.
      }
    },

    async baixarObjetoTemporario(caminho) {
      const { data, error } = await api().storage.from("envios").download(caminho);
      if (error || !data) throw new Error("falha ao baixar objeto temporário do bucket envios");
      return new Uint8Array(await data.arrayBuffer());
    },

    async atualizarProgresso(trabalhoId, bytesEnviados, sessaoReferencia) {
      const { error } = await api()
        .schema("arquivos")
        .from("trabalhos_transferencia")
        .update({
          bytes_enviados: bytesEnviados,
          sessao_referencia: sessaoReferencia,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trabalhoId);
      if (error) throw new Error("falha ao atualizar progresso do trabalho");
    },

    async marcarConcluido({ trabalhoId, versaoId, itemId, driveId }) {
      const { error: erroVersao } = await api()
        .schema("arquivos")
        .from("versoes")
        .update({ item_id: itemId, drive_id: driveId, estado_armazenamento: "armazenado" })
        .eq("id", versaoId);
      if (erroVersao) throw new Error("falha ao marcar versão como armazenada");

      const { error: erroTrabalho } = await api()
        .schema("arquivos")
        .from("trabalhos_transferencia")
        .update({
          estado: "concluido",
          item_id_resultado: itemId,
          lease_ate: null,
          lease_dono: null,
          erro_sanitizado: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trabalhoId);
      if (erroTrabalho) throw new Error("falha ao marcar trabalho como concluído");
    },

    async marcarFalhaTransitoria({ trabalhoId, tentativas, proximaTentativaEm }) {
      const { error } = await api()
        .schema("arquivos")
        .from("trabalhos_transferencia")
        .update({
          estado: "pendente",
          tentativas,
          proxima_tentativa_em: proximaTentativaEm.toISOString(),
          lease_ate: null,
          lease_dono: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trabalhoId);
      if (error) throw new Error("falha ao registrar falha transitória do trabalho");
    },

    async marcarBloqueado({ trabalhoId, motivo }) {
      const { error } = await api()
        .schema("arquivos")
        .from("trabalhos_transferencia")
        .update({
          estado: "bloqueado",
          erro_sanitizado: motivo,
          lease_ate: null,
          lease_dono: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trabalhoId);
      if (error) throw new Error("falha ao marcar trabalho como bloqueado");
    },
  };
}
