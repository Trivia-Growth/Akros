import { useSessaoStore } from "@/features/sessao/application/store";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";

/**
 * E13-S08: primeiro uso de @supabase/supabase-js no bundle do front (Edge Functions até aqui
 * eram só `fetch`). Config por ADR-0008 — sessão é gerida pelo módulo `sessao`, não pelo SDK:
 * sem persistência própria, sem refresh automático, token de acesso vem sempre da memória.
 *
 * **Criação preguiçosa (2026-08-31).** Antes o `createClient` rodava no carregamento do módulo e
 * lançava `supabaseUrl is required` quando as variáveis não existiam. Local isso nunca aparecia
 * porque `.env.local` está sempre lá; na primeira execução da CI, 16 suítes de teste falharam sem
 * nem carregar — inclusive as que só mexem em mock e nunca tocam o Supabase. Módulo que explode
 * no import derruba tudo que estiver na mesma cadeia de import, que é o oposto do que E15-S01
 * está construindo.
 *
 * Agora o cliente só nasce na primeira chamada, e a mensagem de erro diz o que fazer.
 */
let instancia: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (instancia) return instancia;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias fora do modo demo. " +
        "Defina em apps/web/.env.local (ver docs/NOVO-PROJETO.md).",
    );
  }

  instancia = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    accessToken: async () => useSessaoStore.getState().sessao?.accessToken ?? null,
  });
  return instancia;
}
