// revisao-comandos — E03-S07 (Fase 6/US3). Edge Function de comando transacional:
// revisar_documento, decidir_etapa, liberar_fase. Toda a decisão vive em
// `_shared/revisao-comandos.ts` (mesmo padrão de `caso-comandos`/`agente-playground`); este
// arquivo só monta os adapters reais e despacha pelo `serve()`.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { clienteServico } from "../_shared/integracoes.ts";
import { criarIOIdempotencia } from "../_shared/io-supabase-caso.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";
import { executarRevisaoRpc } from "../_shared/revisao-rpc.ts";
import { criarManipuladorRevisaoComandos } from "../_shared/revisao-comandos.ts";

const FN = "revisao-comandos";

serve(
  criarManipuladorRevisaoComandos({
    limite: (req) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
    autenticarAdmin: (req) => requireAdmin(req),
    idempotencia: criarIOIdempotencia(),
    rpc: executarRevisaoRpc(clienteServico()),
  }),
);
