import { type Page, expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const CLIENTE_EMAIL = process.env.E2E_CLIENTE_EMAIL;
const CLIENTE_PASSWORD = process.env.E2E_CLIENTE_PASSWORD;

test.beforeAll(() => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !CLIENTE_EMAIL || !CLIENTE_PASSWORD) {
    throw new Error(
      "Credenciais E2E ausentes. Preencha E2E_ADMIN_* e E2E_CLIENTE_* em apps/web/.env.test.local.",
    );
  }
});

async function login(page: Page, email: string, password: string, rota: RegExp) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(rota);
}

test("E13-S11 AC-2: cliente vê dados do processo pelo próprio UUID", async ({ page }) => {
  await login(page, CLIENTE_EMAIL as string, CLIENTE_PASSWORD as string, /\/portal$/);
  const carregouStoreMock = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .some(
        (entrada) => entrada.name.includes("/mocks/store") || /\/assets\/store-/.test(entrada.name),
      ),
  );
  expect(carregouStoreMock).toBe(false);
  await page.goto("/portal/agenda");

  await expect(page).toHaveURL(/\/portal\/agenda$/);
  await expect(page.getByTestId("agenda-real")).toBeVisible();
  await expect(page.getByTestId("agenda-reuniao").first()).toBeVisible();

  await page.goto("/portal/jornada");
  await expect(page).toHaveURL(/\/portal\/jornada$/);
  await expect(page.getByTestId("jornada-real")).toBeVisible();
  await expect(page.getByTestId("jornada-fase-real")).toBeVisible();
  await expect(
    page.getByText("Esta tela não grava status diretamente no navegador."),
  ).toBeVisible();

  await page.goto("/portal/documentos");
  await expect(page).toHaveURL(/\/portal\/documentos$/);
  await expect(page.getByTestId("documentos-real")).toBeVisible();
  await expect(page.getByTestId("documento-real").first()).toBeVisible();

  await page.goto("/portal/pagamentos");
  await expect(page).toHaveURL(/\/portal\/pagamentos$/);
  await expect(page.getByTestId("pagamentos-real")).toBeVisible();
  await expect(page.getByTestId("pagamento-real").first()).toBeVisible();

  await page.goto("/portal/mensagens");
  await expect(page).toHaveURL(/\/portal\/mensagens$/);
  await expect(page.getByTestId("mensagens-real")).toBeVisible();
  await expect(
    page.getByText("Esta tela não grava conversas nem eventos diretamente pelo navegador."),
  ).toBeVisible();

  await page.goto("/portal/perfil");
  await expect(page).toHaveURL(/\/portal\/perfil$/);
  await expect(page.getByTestId("perfil-real")).toBeVisible();
});

test("E13-S11 AC-2/AC-3: admin lê agenda e operação reais", async ({ page }) => {
  await login(page, ADMIN_EMAIL as string, ADMIN_PASSWORD as string, /\/admin$/);
  await expect(page.getByTestId("admin-dashboard-real")).toBeVisible();
  await page.goto("/admin/operacao");
  await expect(page).toHaveURL(/\/admin\/operacao$/);
  await expect(page.getByTestId("operacao-real")).toBeVisible();
  await page.goto("/admin/clientes");
  await expect(page).toHaveURL(/\/admin\/clientes$/);
  await expect(page.getByTestId("clientes-360-real")).toBeVisible();
  await page.goto("/admin/documentos");
  await expect(page).toHaveURL(/\/admin\/documentos$/);
  await expect(page.getByTestId("fila-revisao-real")).toBeVisible();
  await page.goto("/admin/agenda");

  await expect(page).toHaveURL(/\/admin\/agenda$/);
  await expect(page.getByTestId("admin-agenda-real")).toBeVisible();
  await expect(page.getByTestId("admin-agenda-reuniao").first()).toBeVisible();

  await page.goto("/admin/propostas");
  await expect(page).toHaveURL(/\/admin\/propostas$/);
  await expect(page.getByTestId("propostas-real")).toBeVisible();
  await expect(
    page.getByText("Esta tela não grava propostas diretamente pelo navegador."),
  ).toBeVisible();

  await page.goto("/admin/comunicacao");
  await expect(page).toHaveURL(/\/admin\/comunicacao$/);
  await expect(page.getByTestId("comunicacao-real")).toBeVisible();
  await expect(
    page.getByText("Esta tela não grava comunicação diretamente pelo navegador."),
  ).toBeVisible();
});
