import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clienteServico } from "./integracoes.ts";
import { criarIOCaso } from "./io-supabase-caso.ts";
import type { IOChatPortal } from "./comunicacao-chat-portal.ts";

export function criarIOChatPortal(clienteOverride?: SupabaseClient): IOChatPortal {
  const sb = () => clienteOverride ?? clienteServico();
  return {
    autorizacaoCaso: criarIOCaso(),
    async nomeDoCliente(clienteId) {
      const { data } = await sb().schema("crm").from("clientes").select("nome").eq("id", clienteId).maybeSingle<{ nome: string }>();
      return data?.nome ?? null;
    },
    async enviar({ clienteId, autorTipo, autorNome, conteudo, autorId }) {
      const { data, error } = await sb()
        .schema("comunicacao")
        .rpc("enviar_mensagem_portal", {
          p_cliente_id: clienteId,
          p_autor_tipo: autorTipo,
          p_autor_nome: autorNome,
          p_conteudo: conteudo,
          p_autor_id: autorId,
        });
      if (error) throw error;
      return data;
    },
  };
}
