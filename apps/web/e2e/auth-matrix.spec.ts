import { type Page, expect, test } from "@playwright/test";

/**
 * E12-S03 — matriz de autorização executável (ver spec.md). Cobre isolamento por papel/rota
 * (ADR-0008 sessão + ADR-0009 papel/cliente_id) e, desde E13-S01, isolamento por linha
 * (`cliente_id`, RLS de `crm.clientes`) verificado direto via PostgREST — a UI ainda lê mock
 * até E13-S07 trocar o adapter.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const CLIENTE_EMAIL = process.env.E2E_CLIENTE_EMAIL;
const CLIENTE_PASSWORD = process.env.E2E_CLIENTE_PASSWORD;
const CLIENTE_B_EMAIL = process.env.E2E_CLIENTE_B_EMAIL;
const CLIENTE_B_PASSWORD = process.env.E2E_CLIENTE_B_PASSWORD;
const SUPABASE_URL = process.env.E2E_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY;

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

  test("AC-6 (E13-S01): RLS de crm.clientes isola cliente A de cliente B, no nível de API", async ({
    request,
  }) => {
    // A UI ainda lê tudo de useMockDb (E13-S07 troca isso) — mas o schema/RLS já são reais
    // (E13-S01). Este teste bate direto no PostgREST, não na UI, pra provar o isolamento onde
    // ele de fato existe hoje: no banco. Fecha o `test.fixme` que ficou aqui até então.
    test.skip(
      !CLIENTE_B_EMAIL || !CLIENTE_B_PASSWORD || !SUPABASE_URL || !SUPABASE_ANON_KEY,
      "Preencha E2E_CLIENTE_B_*/E2E_SUPABASE_* em .env.test.local (ver E13-S01/tasks.md).",
    );

    async function loginToken(email: string, senha: string): Promise<string> {
      const res = await request.post(`${SUPABASE_URL}/functions/v1/sessao-login`, {
        headers: { Origin: "http://localhost:5173" },
        data: { email, senha },
      });
      const body = await res.json();
      return body.accessToken as string;
    }

    async function verComoCliente(token: string): Promise<{ email: string }[]> {
      const res = await request.get(`${SUPABASE_URL}/rest/v1/clientes?select=email`, {
        headers: {
          apikey: SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${token}`,
          "Accept-Profile": "crm",
        },
      });
      return res.json();
    }

    const tokenA = await loginToken(CLIENTE_EMAIL as string, CLIENTE_PASSWORD as string);
    const tokenB = await loginToken(CLIENTE_B_EMAIL as string, CLIENTE_B_PASSWORD as string);

    const linhasVistasPorA = await verComoCliente(tokenA);
    const linhasVistasPorB = await verComoCliente(tokenB);

    expect(linhasVistasPorA).toEqual([{ email: CLIENTE_EMAIL }]);
    expect(linhasVistasPorB).toEqual([{ email: CLIENTE_B_EMAIL }]);
  });
});
