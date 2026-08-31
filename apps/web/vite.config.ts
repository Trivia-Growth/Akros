import { URL, fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // E12-S03: e2e/ é suite do Playwright (@playwright/test), não do Vitest — os dois definem
  // `test`/`expect` globais e colidem se o Vitest tentar coletar os arquivos .spec.ts de lá.
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
    setupFiles: ["./src/shared/lib/test-setup.ts"],
    // Cobertura como DIAGNÓSTICO, não como meta de porcentagem: o limiar que vale é por camada
    // (`domain/` e `application/` são puros e não têm desculpa), não um número global que se
    // satisfaz testando o que é fácil. Rode com `pnpm --filter @akros/web exec vitest run --coverage`.
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/main.tsx", "src/shared/lib/test-utils.tsx"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        // E15-S01: o split por rota tirou as páginas do chunk de entrada, mas o que sobrou lá é
        // o que TODA sessão carrega — biblioteca e dado mockado. Separar não reduz o total
        // baixado numa visita completa; muda o que precisa ser rebaixado a cada deploy (vendor
        // tem hash estável) e tira do caminho crítico do site institucional dado que só o portal
        // e o admin usam.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-i18n": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Espelha o rewrite de proxy do Netlify (ADR-0008) em dev: o browser só fala com
    // localhost:5173, então o cookie de sessão nasce first-party nos dois ambientes.
    proxy: {
      "/api/sessao": {
        target: "https://mhxopadkizktsenohnbm.supabase.co/functions/v1",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/sessao\//, "/sessao-"),
      },
    },
  },
});
