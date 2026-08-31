import { useSessaoStore } from "@/features/sessao/application/store";
import { createClient } from "@supabase/supabase-js";

/**
 * E13-S08: primeiro uso de @supabase/supabase-js no bundle do front (Edge Functions até aqui
 * eram só `fetch`). Config por ADR-0008 — sessão é gerida pelo módulo `sessao`, não pelo SDK:
 * sem persistência própria, sem refresh automático, token de acesso vem sempre da memória.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    accessToken: async () => useSessaoStore.getState().sessao?.accessToken ?? null,
  },
);
