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
 * Fora do `pre-push`/CI de propósito (mesma categoria de `db-tests` com Docker no lefthook.yml):
 * depende de rede externa ao commit. Rodar manualmente com `pnpm exec playwright test`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // login/logout real no mesmo projeto Supabase — evita corrida de sessão
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    env: { VITE_DEMO_MODE: "false" },
    timeout: 30_000,
  },
});
