// telemetria-erro — E16-S01 AC-3/AC-4. Recebe o evento de erro de cliente que o `ErrorBoundary`
// dispara e o registra no log estruturado da própria function, que é onde a equipe consegue
// consultar.
//
// Por que só log e não tabela: erro de cliente é volume imprevisível e sem valor de negócio
// duradouro. Gravar em `audit.*` poluiria a trilha (que é append-only e auditável) com ruído
// operacional. Se virar necessidade, entra como tabela própria com retenção curta.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FN = "telemetria-erro";

// Teto duro de payload: esta function é anônima de propósito (erro acontece com o usuário
// deslogado também, no site institucional), então o tamanho é a única barreira antes do rate
// limiting chegar. Ver docs/SECURITY_DEBT.md — SD-01.
const MAX_BYTES = 16 * 1024;

// `.strict()` recusa campo não declarado. O cliente já monta o evento por lista de permissão
// (shared/telemetria/sanitizar.ts); aqui a mesma regra é aplicada de novo, do lado que não confia
// no cliente.
const InputSchema = z
  .object({
    mensagem: z.string().max(500),
    nome: z.string().max(100),
    stack: z.string().max(4000).optional(),
    area: z.string().max(100),
    rota: z.string().max(200),
    usuarioId: z.string().uuid().optional(),
    papel: z.string().max(40).optional(),
    userAgent: z.string().max(300),
    quando: z.string().datetime(),
  })
  .strict();

serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors, status: 204 });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

  try {
    const bruto = await req.text();
    if (bruto.length > MAX_BYTES) return new Response(null, { status: 413, headers: cors });

    const evento = InputSchema.parse(JSON.parse(bruto));

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        nivel: "error",
        fn: FN,
        tipo: "erro-de-cliente",
        ...evento,
      }),
    );
  } catch {
    // Payload inválido não é motivo para responder erro: quem chama é um tratador de erro, e uma
    // resposta 4xx só geraria mais ruído no cliente. Registra e segue.
    console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: FN, msg: "payload invalido" }));
  }

  // Sempre 204: o cliente nunca deve reagir à resposta deste endpoint.
  return new Response(null, { status: 204, headers: cors });
});
