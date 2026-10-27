// envio-comandos — E03-S07 (Fase 5/US2, T059-T060, ADR-0019): reservar_envio, finalizar_envio,
// enviar_etapa_para_avaliacao. Toda a decisão vive em `_shared/envio-comandos.ts` (mesmo padrão
// de `caso-comandos`); este arquivo só monta os adapters reais e despacha pelo `serve()`.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuthComPapel } from "../_shared/auth.ts";
import { criarManipuladorEnvioComandos } from "../_shared/envio-comandos.ts";
import { criarIOStorageEnvios } from "../_shared/io-storage-envios.ts";
import { clienteServico } from "../_shared/integracoes.ts";
import { criarIOIdempotencia } from "../_shared/io-supabase-caso.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";

const FN = "envio-comandos";

serve(
  criarManipuladorEnvioComandos({
    limite: (req) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
    autenticar: (req) => requireAuthComPapel(req),
    idempotencia: criarIOIdempotencia(),
    storage: criarIOStorageEnvios(),
    async obterReserva(versaoId) {
      const { data, error } = await clienteServico()
        .schema("arquivos")
        .from("reservas_envio")
        .select("objeto_permitido,tamanho_declarado,mime_declarado")
        .eq("versao_id", versaoId)
        .maybeSingle<{ objeto_permitido: string; tamanho_declarado: number; mime_declarado: string }>();
      if (error) throw new Error("falha ao consultar reserva de envio");
      if (!data) return null;
      return {
        objetoPermitido: data.objeto_permitido,
        tamanhoDeclarado: data.tamanho_declarado,
        mimeDeclarado: data.mime_declarado,
      };
    },
    // `.schema(...)` explícito: as três funções vivem fora do schema `public`
    // (`arquivos.reservar_envio`/`finalizar_envio`, `jornada.enviar_etapa_para_avaliacao`) — sem
    // isso o PostgREST resolveria a chamada contra `public` (primeiro schema de
    // `[api].schemas` em config.toml) e nunca acharia a função.
    rpc: async (nome, params) => {
      const schema = nome === "enviar_etapa_para_avaliacao" ? "jornada" : "arquivos";
      return await clienteServico().schema(schema).rpc(nome, params);
    },
  }),
);
