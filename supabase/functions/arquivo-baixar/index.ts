// arquivo-baixar — E03-S07, Fase 5/US2 (T073-T074, ADR-0019 ponto 6). `GET ?versaoId=` —
// participante (papel que alcança o documento/pagamento) ou admin. Toda a decisão vive em
// `_shared/arquivo-baixar.ts`; este arquivo só monta os adapters reais e despacha pelo `serve()`.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { criarManipuladorArquivoBaixar } from "../_shared/arquivo-baixar.ts";
import { criarIOArquivoBaixar } from "../_shared/io-supabase-arquivo-baixar.ts";
import { criarIOGraphMicrosoft } from "../_shared/graph-microsoft.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";

const FN = "arquivo-baixar";

serve(
  criarManipuladorArquivoBaixar({
    autenticar: (req) => requireAuth(req),
    limite: (req) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
    io: criarIOArquivoBaixar(),
    graph: criarIOGraphMicrosoft(),
  }),
);
