// caso-comandos — E03-S07 (T031/T032). Primeira Edge Function de comando transacional desta
// feature: registrar_contrato, preparar_caso (ações futuras entram em _shared/caso-comandos.ts,
// não aqui). Toda a decisão vive em `_shared/caso-comandos.ts` (mesmo padrão de
// `agente-playground`/`_shared/playground.ts`); este arquivo só monta os adapters reais —
// `service_role` via `_shared/integracoes.ts`, idempotência via `_shared/io-supabase-caso.ts` —
// e despacha pelo `serve()`.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { criarManipuladorCasoComandos } from "../_shared/caso-comandos.ts";
import { clienteServico } from "../_shared/integracoes.ts";
import { criarIOIdempotencia } from "../_shared/io-supabase-caso.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";

const FN = "caso-comandos";

serve(
  criarManipuladorCasoComandos({
    limite: (req) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
    autenticarAdmin: (req) => requireAdmin(req),
    idempotencia: criarIOIdempotencia(),
    rpc: (nome, params) => clienteServico().rpc(nome, params),
  }),
);
