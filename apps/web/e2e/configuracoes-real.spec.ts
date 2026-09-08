import { type Page, expect, test } from "@playwright/test";

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
}

test("E13-S11 AC-1: configurações vazias vêm do Supabase fora do demo", async ({ page }) => {
  await login(page);
  await page.goto("/admin/configuracoes");

  await expect(page).toHaveURL(/\/admin\/configuracoes$/);
  await expect(page.getByRole("heading", { name: "Central de configurações" })).toBeVisible();
  await expect(page.getByText("Nenhuma integração real cadastrada.")).toBeVisible();
  await expect(page.getByText("Nenhum membro da equipe real cadastrado.")).toBeVisible();
  await expect(
    page.getByText("Nenhuma conta de agenda, e-mail ou arquivos conectada."),
  ).toBeVisible();
  await expect(page.getByText("Nenhuma conta de WhatsApp ou Instagram conectada.")).toBeVisible();
});
