// Guardas de ambiente do build (AV-08). Sem import de Vite: a regra é pura e testável.
//
// `isDemoMode` (src/shared/lib/env.ts) vale `VITE_DEMO_MODE !== "false"`: sem a variável, /admin e
// /portal são servidos sem guarda de papel. Isso é o protótipo mockado, decisão registrada em
// docs/epics/AJUSTES.md (A-01) — por isso o padrão NÃO muda aqui. O que esta guarda impede é a
// combinação que transforma esquecimento em exposição: backend real configurado no build com o modo
// demo ainda ligado.

/** `null` se o ambiente de build é coerente; senão a mensagem do erro (sem repetir valores). */
export function verificarAmbienteDeBuild(env: Record<string, string | undefined>): string | null {
  const backendConfigurado = Boolean(env.VITE_SUPABASE_URL?.trim());
  const demoLigado = env.VITE_DEMO_MODE !== "false"; // mesma regra de `isDemoMode`
  if (backendConfigurado && demoLigado) {
    return (
      "VITE_SUPABASE_URL está definida, mas VITE_DEMO_MODE não é exatamente 'false': o build " +
      "serviria /admin e /portal sem guarda de papel. Defina VITE_DEMO_MODE=false para o modo " +
      "real, ou remova as variáveis VITE_SUPABASE_* para o protótipo em demo (AV-08)."
    );
  }
  return null;
}
