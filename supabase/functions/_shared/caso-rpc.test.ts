import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executarCasoRpc } from "./caso-rpc.ts";

Deno.test("RPCs de caso usam schemas crm e arquivos no PostgREST", async () => {
  const perfis: string[] = [];
  const cliente = createClient("https://supabase.example", "chave-ficticia", {
    global: { fetch: (_input, init) => {
      perfis.push(new Headers(init?.headers).get("Content-Profile") ?? "public");
      return Promise.resolve(new Response("{}", { status: 200 }));
    } },
  });
  const rpc = executarCasoRpc(cliente);
  await rpc("registrar_contrato", {});
  await rpc("preparar_caso_com_origem", {});
  await rpc("vincular_pasta", {});
  assertEquals(perfis, ["crm", "crm", "arquivos"]);
});
