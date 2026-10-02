// meta-whatsapp-webhook — E13-S13. WhatsApp Cloud API: GET de verificação (hub.verify_token) e POST
// assinado (X-Hub-Signature-256). URL no painel da Meta: .../functions/v1/meta-whatsapp-webhook?conta=<id>
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { enviarWhatsAppOficial, lerEntradasWhatsApp } from "../_shared/canais/meta.ts";
import { escopoMetaWhatsApp } from "../_shared/integracoes.ts";
import { criarIOSupabase } from "../_shared/io-supabase.ts";
import { checarLimite, TETOS } from "../_shared/rate-limit.ts";
import { criarManipuladorMeta } from "../_shared/webhook-meta.ts";

const texto = (v: unknown) => (typeof v === "string" ? v : "");

const FN = "meta-whatsapp-webhook";
const io = {
  ...criarIOSupabase(),
  limite: (req: Request) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
};

serve(criarManipuladorMeta({
  provedor: "whatsapp_oficial",
  escopo: escopoMetaWhatsApp,
  usaTelefone: true,
  ler: (payload, m) =>
    texto(m.wabaId) && texto(m.phoneNumberId)
      ? lerEntradasWhatsApp(payload, { wabaId: texto(m.wabaId), phoneNumberId: texto(m.phoneNumberId) })
      : [],
  enviar: (buscador, { segredo, metadados, para, texto: corpo }) =>
    enviarWhatsAppOficial(buscador, {
      accessToken: segredo.accessToken,
      phoneNumberId: texto(metadados.phoneNumberId),
      para,
      texto: corpo,
    }),
}, io));
