// meta-instagram-webhook — E13-S13. Direct do Instagram (Messenger Platform): mesmo desafio e mesma
// assinatura do WhatsApp. URL no painel da Meta: .../functions/v1/meta-instagram-webhook?conta=<id>
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { enviarInstagram, lerEntradasInstagram } from "../_shared/canais/meta.ts";
import { escopoMetaInstagram } from "../_shared/integracoes.ts";
import { criarIOSupabase } from "../_shared/io-supabase.ts";
import { checarLimite, TETOS } from "../_shared/rate-limit.ts";
import { criarManipuladorMeta } from "../_shared/webhook-meta.ts";

const texto = (v: unknown) => (typeof v === "string" ? v : "");

const FN = "meta-instagram-webhook";
const io = {
  ...criarIOSupabase(),
  limite: (req: Request) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
};

serve(criarManipuladorMeta({
  provedor: "instagram",
  escopo: escopoMetaInstagram,
  usaTelefone: false,
  ler: (payload, m) =>
    texto(m.igAccountId) ? lerEntradasInstagram(payload, { igAccountId: texto(m.igAccountId) }) : [],
  enviar: (buscador, { segredo, para, texto: corpo }) =>
    enviarInstagram(buscador, { accessToken: segredo.accessToken, para, texto: corpo }),
}, io));
