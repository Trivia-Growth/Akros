import { type Page, expect, test } from "@playwright/test";

/** E13-S11 AC-1 — esta suíte inicia o Vite com VITE_DEMO_MODE=false. */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.beforeAll(() => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Credenciais de admin ausentes. Preencha E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD em apps/web/.env.test.local.",
    );
  }
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL as string);
  await page.getByLabel("Senha").fill(ADMIN_PASSWORD as string);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("E13-S11 AC-1: admin lê o catálogo de programas real fora do demo", async ({ page }) => {
  await login(page);
  await page.goto("/admin/programas");

  await expect(page).toHaveURL(/\/admin\/programas$/);
  await expect(page.getByRole("heading", { name: "Programas e jornadas" })).toBeVisible();
  await expect(page.getByText("EB-2 NIW").first()).toBeVisible();
});
