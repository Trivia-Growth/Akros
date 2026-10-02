// Erro real de uma Edge Function invocada via `supabase.functions.invoke` — o SDK só expõe
// `error.message` genérico ("Edge Function returned a non-2xx status code"); a causa de verdade
// fica em `error.context` (a Response bruta). Dois formatos de corpo existem no projeto:
//   • problem+json com `detail` (functions de sessão; ver `problem.ts`);
//   • `{ erro: "..." }` (integracoes-ia-salvar e agente-playground, E13-S13/S14).
// Ler só o primeiro engoliu toda mensagem de erro das duas últimas, inclusive "a Evolution
// recusou a chave" e "sem crédito na OpenRouter".

export async function erroDetalhado(error: unknown): Promise<Error> {
  const contexto = (error as { context?: Response })?.context;
  if (contexto && typeof contexto.json === "function") {
    try {
      const corpo = await contexto.clone().json();
      for (const campo of ["detail", "erro"] as const) {
        const causa = corpo?.[campo];
        if (typeof causa === "string" && causa) return new Error(causa);
      }
    } catch {
      // corpo não era JSON (ou já consumido) — cai no erro original abaixo.
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}
