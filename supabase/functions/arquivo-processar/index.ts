// arquivo-processar — E03-S07, Fase 5/US2 (T069-T071, ADR-0019). Processador interno da
// transferência Supabase Storage → OneDrive. Nunca chamado por sessão de usuário: só Cron
// (pg_cron, migration 0028) com o segredo de serviço no header, validado por
// `requireServiceRole` (_shared/auth.ts) — mesmo critério das integrações Auvo. Toda a decisão
// vive em `_shared/arquivo-processar.ts` (mesmo padrão de `caso-comandos`/`agente-playground`);
// este arquivo só monta os adapters reais e despacha pelo `serve()`.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireServiceRole } from "../_shared/auth.ts";
import { criarManipuladorArquivoProcessar } from "../_shared/arquivo-processar.ts";
import { criarIOArquivoProcessar } from "../_shared/io-supabase-arquivo-processar.ts";
import { criarIOGraphMicrosoft } from "../_shared/graph-microsoft.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";

const FN = "arquivo-processar";

serve(
  criarManipuladorArquivoProcessar({
    autenticarServico: (req) => requireServiceRole(req),
    limite: (req) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
    io: criarIOArquivoProcessar(),
    graph: criarIOGraphMicrosoft(),
  }),
);
