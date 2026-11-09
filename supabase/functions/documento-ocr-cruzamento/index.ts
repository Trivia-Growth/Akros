// documento-ocr-cruzamento — E07-S05/US2. Disparada manualmente pela equipe (não automática a
// cada upload — custo de provedor externo, e `ia_apoio_ativa` precisa valer no momento da
// decisão). Toda a lógica mora em `_shared/documento-cruzamento.ts`; aqui só monta adapters.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireCsrfHeader } from "../_shared/csrf.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";
import { cruzarComRequisito } from "../_shared/documento-cruzamento.ts";
import { criarIODocumentoCruzamento } from "../_shared/io-supabase-documento-cruzamento.ts";

const FN = "documento-ocr-cruzamento";

serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

  const limite = await checarLimite({ req, rota: FN, ...TETOS[FN] });
  if (!limite.permitido) {
    const segundos = limite.reiniciaEm
      ? Math.max(1, Math.ceil((limite.reiniciaEm.getTime() - Date.now()) / 1000))
      : 60;
    return new Response(JSON.stringify({ erro: "Muitas requisições. Tente de novo em instantes." }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(segundos) },
    });
  }

  try {
    requireCsrfHeader(req);
    await requireAdmin(req);

    const corpo = (await req.json().catch(() => null)) as { documentoId?: unknown } | null;
    if (!corpo || typeof corpo.documentoId !== "string") {
      return new Response(JSON.stringify({ erro: "documentoId obrigatório" }), {
        status: 422,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const io = criarIODocumentoCruzamento();
    const documentoAtualizado = await cruzarComRequisitoEDevolverDocumento(io, corpo.documentoId);
    return new Response(JSON.stringify(documentoAtualizado), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const status = (erro as { status?: number }).status ?? 500;
    const mensagem = status < 500 ? (erro as Error).message : "Não foi possível concluir agora.";
    return new Response(JSON.stringify({ erro: mensagem }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

/** Depois do parecer, relê o documento inteiro — o adapter frontend (`SupabaseAnalisadorDocumentoReal`)
 *  espera o `Documento` completo no mesmo formato de `SupabaseDocumentosConsulta.paraDocumento`. */
async function cruzarComRequisitoEDevolverDocumento(
  io: ReturnType<typeof criarIODocumentoCruzamento>,
  documentoId: string,
) {
  const { clienteServico } = await import("../_shared/integracoes.ts");
  await cruzarComRequisito(io, fetch, documentoId);
  const { data, error } = await clienteServico()
    .schema("documentos")
    .from("documentos")
    .select()
    .eq("id", documentoId)
    .single();
  if (error) throw error;
  return data;
}
