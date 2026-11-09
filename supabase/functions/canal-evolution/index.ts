// canal-evolution — E13-S15. API administrativa do canal Evolution: servidor, instância, webhook
// (com releitura), QR, estado, ativação. Toda a decisão vive em `_shared/canal-evolution.ts`
// (contrato em specs/006-evolution-confiavel/contracts/canal-evolution.md).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { criarManipuladorCanalEvolution } from "../_shared/canal-evolution.ts";
import { criarDepsCanalEvolution } from "../_shared/io-canal-evolution.ts";
import { checarLimite, TETOS } from "../_shared/rate-limit.ts";

const FN = "canal-evolution";
const deps = {
  ...criarDepsCanalEvolution(),
  limite: (req: Request) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
};

serve(criarManipuladorCanalEvolution(deps));
