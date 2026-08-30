import { type Page, expect, test } from "@playwright/test";

/**
 * E12-S03 — matriz de autorização executável (ver spec.md). Cobre isolamento por papel/rota
 * (ADR-0008 sessão + ADR-0009 papel/cliente_id), que é o que existe implementado hoje.
 * Isolamento por linha (cliente A x cliente B) aguarda E13 — ver o `test.fixme` no final.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const CLIENTE_EMAIL = process.env.E2E_CLIENTE_EMAIL;
const CLIENTE_PASSWORD = process.env.E2E_CLIENTE_PASSWORD;

test.beforeAll(() => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !CLIENTE_EMAIL || !CLIENTE_PASSWORD) {
    throw new Error(
      "Credenciais de teste ausentes. Preencha E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD/" +
        "E2E_CLIENTE_EMAIL/E2E_CLIENTE_PASSWORD em apps/web/.env.test.local (gitignored).",
    );
  }
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("Matriz de autorização — E12-S02/ADR-0008/ADR-0009", () => {
  test("AC-1: sem sessão, /admin e /portal redirecionam pro /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/portal");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("AC-2: admin acessa /admin, não acessa /portal", async ({ page }) => {
    await login(page, ADMIN_EMAIL as string, ADMIN_PASSWORD as string);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/portal");
    // RequireRole barra (papel != cliente) -> /login -> já tem sessão admin -> devolve pro /admin
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("AC-3: cliente acessa /portal com a própria persona, não acessa /admin", async ({
    page,
  }) => {
    await login(page, CLIENTE_EMAIL as string, CLIENTE_PASSWORD as string);
    await expect(page).toHaveURL(/\/portal$/);
    await expect(page.getByText("Olá, Carlos")).toBeVisible();
    await expect(page.getByText("EB-2 NIW")).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/portal$/);
  });

  test("AC-4: senha errada não autentica", async ({ page }) => {
    await login(page, ADMIN_EMAIL as string, "senha-incorreta-de-teste");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
  });

  test("AC-5: logout revoga a sessão no servidor (F5 não rehidrata)", async ({ page }) => {
    await login(page, ADMIN_EMAIL as string, ADMIN_PASSWORD as string);
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });

  test.fixme(
    "AC-6: cliente A não vê dado de cliente B (aguarda E13 — RLS + segundo usuário seed)",
    async () => {
      // Hoje só existe 1 usuário `cliente` seed (product.md de E12-S02, decisão consciente:
      // sem self-signup) e o dado de negócio é 100% mockado no browser — não há policy de banco
      // pra violar ainda. Fica `fixme` documentado em vez de omitido: é o critério de "pronto"
      // do E13 citado no handoff de 28/08 (docs/STATE.md) — RLS real + um segundo cliente seed.
    },
  );
});
