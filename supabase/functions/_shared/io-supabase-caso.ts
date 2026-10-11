// _shared/io-supabase-caso.ts — E/S real dos comandos de caso (E03-S07): autorização por
// participação (contra `crm.participantes`/`crm.clientes`) e idempotência (contra
// `comandos.idempotencia`). Tudo que decide está em `autorizacao-caso.ts`/`idempotencia.ts`; aqui
// só há encanamento com `service_role` — mesma divisão de responsabilidade de `io-supabase.ts`
// para o webhook/agente. Não acumule outras responsabilidades neste arquivo.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clienteServico } from "./integracoes.ts";
import type { IOAutorizacaoCaso, Participacao } from "./autorizacao-caso.ts";
import type { IOIdempotencia } from "./idempotencia.ts";

let cliente: SupabaseClient | null = null;
// Criação preguiçosa: ambiente incompleto vira erro de requisição (500), não queda no boot —
// mesmo critério de `io-supabase.ts`.
const sb = () => (cliente ??= clienteServico());

/** Adapter real de `IOAutorizacaoCaso`. Replica a regra de `crm.meus_casos()` (0017): linhas
 *  ativas de `crm.participantes` para este `auth_user_id`, MAIS o vínculo legado mono-titular
 *  (`crm.clientes.auth_user_id`), com `papel: null` — `crm.meus_papeis()`/`crm.tenho_papel()`
 *  NÃO têm esse fallback (de propósito: ver comentário em `autorizacao-caso.ts`), então não
 *  sintetize papel aqui para o vínculo legado. Vínculo legado é descartado se o `cliente_id` já
 *  apareceu via `crm.participantes` (fonte autoritativa quando presente), para não devolver
 *  papel duplicado/divergente para o mesmo caso. */
export function criarIOCaso(): IOAutorizacaoCaso {
  return {
    async participacoesDoUsuario(authUserId) {
      const [participantesRes, clienteRes] = await Promise.all([
        sb()
          .schema("crm")
          .from("participantes")
          .select("cliente_id,papel")
          .eq("auth_user_id", authUserId)
          .eq("estado", "ativo"),
        sb()
          .schema("crm")
          .from("clientes")
          .select("id")
          .eq("auth_user_id", authUserId)
          .is("deleted_at", null)
          .maybeSingle<{ id: string }>(),
      ]);
      if (participantesRes.error) throw new Error("falha ao carregar participações do caso");
      if (clienteRes.error) throw new Error("falha ao carregar vínculo legado do caso");

      const participacoes: Participacao[] = (participantesRes.data ?? []).map((linha) => ({
        clienteId: linha.cliente_id as string,
        papel: linha.papel as Participacao["papel"],
      }));

      const vinculoLegado = clienteRes.data;
      if (vinculoLegado && !participacoes.some((p) => p.clienteId === vinculoLegado.id)) {
        participacoes.push({ clienteId: vinculoLegado.id, papel: null });
      }

      return participacoes;
    },
  };
}

/** Adapter real de `IOIdempotencia`, contra `comandos.idempotencia` (chave, hash_conteudo,
 *  resultado, criado_por) — tabela criada por T014 em paralelo; não precisa existir para
 *  escrever/testar `idempotencia.ts` com um fake, só antes de alguém chamar a Edge Function de
 *  verdade. */
export function criarIOIdempotencia(): IOIdempotencia {
  return {
    async buscar(chave) {
      const { data, error } = await sb()
        .schema("comandos")
        .from("idempotencia")
        .select("hash_conteudo,resultado")
        .eq("chave", chave)
        .maybeSingle<{ hash_conteudo: string; resultado: unknown }>();
      if (error) throw new Error("falha ao consultar idempotência");
      if (!data) return null;
      return { hashConteudo: data.hash_conteudo, resultado: data.resultado };
    },

    async gravar(chave, hashConteudo, resultado, criadoPor) {
      const { error } = await sb().schema("comandos").from("idempotencia").insert({
        chave,
        hash_conteudo: hashConteudo,
        resultado,
        criado_por: criadoPor,
      });
      if (error) throw new Error("falha ao gravar idempotência");
    },
  };
}
