import { URL, fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // E12-S03: e2e/ é suite do Playwright (@playwright/test), não do Vitest — os dois definem
  // `test`/`expect` globais e colidem se o Vitest tentar coletar os arquivos .spec.ts de lá.
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
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
