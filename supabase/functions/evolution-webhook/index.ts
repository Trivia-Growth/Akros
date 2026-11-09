// evolution-webhook — E13-S12/E13-S13. Entrada pública autenticada por capability token por conta
// (ADR-0012). Toda a decisão vive em `_shared/webhook-evolution.ts` e `_shared/agente.ts`.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { criarIOEvolution } from "../_shared/io-supabase.ts";
import { checarLimite, TETOS } from "../_shared/rate-limit.ts";
import { criarManipuladorEvolution } from "../_shared/webhook-evolution.ts";

const FN = "evolution-webhook";
const io = {
  ...criarIOEvolution(),
  limite: (req: Request) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
  // Cada transcrição de áudio custa no provedor: o teto à vista aqui é o limite de gasto por hora.
  limiteTranscricao: (req: Request) => checarLimite({ req, rota: "transcricao-audio", ...TETOS["transcricao-audio"] }),
};

serve(criarManipuladorEvolution(io));
