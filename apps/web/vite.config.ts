import { URL, fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
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
