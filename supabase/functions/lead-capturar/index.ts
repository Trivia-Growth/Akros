// lead-capturar — E13-S09 AC-7. Cria lead a partir do formulario publico de /contatos.
//
// Por que uma function e nao INSERT direto: quem envia o formulario e um visitante ANONIMO, e
// `crm.leads` tem RLS admin-only. Dar INSERT para `anon` resolveria o 401 e abriria escrita
// publica no CRM — spam direto na base de pre-venda, com o custo de PostgREST junto. Aqui a
// escrita passa por `service_role`, depois de validar e de consumir cota.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSupabaseServiceKey } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { checarLimite, resposta429, TETOS } from "../_shared/rate-limit.ts";

const FN = "lead-capturar";
const MAX_BYTES = 8 * 1024;

// `.strict()` recusa campo nao declarado: o formulario e publico, entao o corpo e entrada
// hostil por definicao. Nada de `estagio`, `notas` ou `perfil` vindo de fora — quem define o
// estagio inicial e o banco (DEFAULT 'lead'), nunca o visitante.
const InputSchema = z
  .object({
    nome: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    telefone: z.string().trim().min(8).max(30),
    tipoVistoInteresse: z.string().trim().min(1).max(60),
    areaProfissao: z.string().trim().max(120).optional(),
    mensagem: z.string().trim().max(2000).optional(),
    origem: z.string().trim().max(60).optional(),
  })
  .strict();

serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors, status: 204 });
  }
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: cors });
  }

  // Fail-closed: sem limitador, um formulario publico e um canal aberto de escrita no CRM.
  const limite = await checarLimite({ req, rota: FN, ...TETOS[FN] });
  if (!limite.permitido) return resposta429(limite.reiniciaEm, cors);

  const reqId = crypto.randomUUID().slice(0, 8);

  try {
    const bruto = await req.text();
    if (new TextEncoder().encode(bruto).byteLength > MAX_BYTES) {
      return new Response(null, { status: 413, headers: cors });
    }
    const entrada = InputSchema.parse(JSON.parse(bruto));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      getSupabaseServiceKey(),
    );
    const { data, error } = await supabase
      .schema("crm")
      .from("leads")
      .insert({
        nome: entrada.nome,
        email: entrada.email,
        telefone: entrada.telefone,
        tipo_visto_interesse: entrada.tipoVistoInteresse,
        area_profissao: entrada.areaProfissao ?? null,
        mensagem: entrada.mensagem ?? null,
        // Origem vem do cliente mas e rotulo, nao permissao. Default explicito no servidor.
        origem: entrada.origem ?? "site",
      })
      .select()
      .single();

    if (error) throw error;

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        nivel: "info",
        fn: FN,
        reqId,
        criado: data.id,
      }),
    );

    // Devolve so o id: o visitante nao precisa (nem deve) receber a linha inteira de volta.
    return new Response(JSON.stringify({ id: data.id }), {
      status: 201,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const validacao = e instanceof z.ZodError;
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        nivel: "warn",
        fn: FN,
        reqId,
        msg: validacao ? "payload invalido" : "falha ao criar lead",
      }),
    );
    // Sem detalhe do erro na resposta (RFC 7807 sem stack): mensagem de banco vaza estrutura.
    return new Response(
      JSON.stringify({
        erro: validacao ? "Dados inválidos." : "Não foi possível enviar agora.",
      }),
      {
        status: validacao ? 400 : 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }
});
