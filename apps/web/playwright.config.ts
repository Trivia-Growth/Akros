import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

// Credenciais de teste nunca em código (seguranca/baseline-minimo.md) — vêm de .env.test.local
// (gitignored). Sem lib extra: parser mínimo, só pra este arquivo.
function loadEnvLocal(name: string) {
  const path = fileURLToPath(new URL(name, import.meta.url));
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal(".env.test.local");

/**
 * E12-S03 — matriz de autorização executável. Roda contra `pnpm dev` real (não mock de rede):
 * as 3 Edge Functions de sessão (ADR-0008) são chamadas de verdade contra o projeto Supabase.
 *
 * Roda no `pre-push` local, mas não na CI: depende de credenciais locais e rede externa.
 * Usa porta dedicada e nunca reaproveita servidor existente — em 2026-09-04 o gate aceitou um
 * Vite de outro projeto na 5173 e testou uma página `Not Found` por dois minutos.
 */
const E2E_PORT = 4173;
const E2E_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // `fullyParallel: false` serializa testes dentro de cada arquivo, mas arquivos ainda usam os
  // workers padrão. Sessões de teste compartilham as mesmas personas e um logout concorrente
  // revoga token de outro arquivo; limite de login também é global por origem.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: E2E_URL,
    // Asserções de produto usam cópia pt-BR; sem locale explícito o Chromium usa en-US e troca
    // apenas textos i18n como o cumprimento do dashboard, tornando a matriz não determinística.
    locale: "pt-BR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${E2E_PORT} --strictPort`,
    url: E2E_URL,
    reuseExistingServer: false,
    env: { VITE_DEMO_MODE: "false" },
    timeout: 30_000,
  },
});
