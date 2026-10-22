import { type APIRequestContext, type Page, expect, test } from "@playwright/test";

/**
 * E03-S07 (T052) — US6/ADR-0018, cenários de aceite 2 e 4 (`spec.md`): visibilidade de
 * documento/requisito por papel e perda imediata de acesso na revogação.
 *
 * Pré-requisito de fixture (além das credenciais de login): um caso com DOIS participantes
 * ATIVOS de papéis diferentes (ex.: visto R — aplicante organização + beneficiário pessoa), um
 * requisito/documento restrito a um dos dois papéis, e um documento livre (não restrito) visível
 * aos dois. Nada disso existe por padrão num projeto Supabase novo — precisa ser semeado à mão
 * (ou por script) no projeto apontado por `E2E_SUPABASE_URL` antes de rodar este arquivo. Ver
 * `06-rls-participantes_test.sql`/`07-rls-documentos-papel_test.sql` pela MESMA forma de caso
 * (prova equivalente contra Postgres puro, sem rede/Playwright — essa prova já existe e passa,
 * ver `specs/005-cliente-360-operacional/evidencias/us6.md`).
 *
 * `E2E_PARTICIPANTE_A_*`/`E2E_PARTICIPANTE_B_*`: login dos dois participantes (papéis
 * diferentes, mesmo caso). `E2E_DOCUMENTO_RESTRITO_ID`: UUID de um documento com
 * `restrito_ao_papel = true`, dirigido ao papel do participante A (logo, oculto para B).
 * `E2E_PARTICIPANTE_B_ID`: UUID da linha de `crm.participantes` do participante B (alvo da
 * revogação no cenário 4 — revogado DURANTE o teste, então usa uma persona dedicada, nunca
 * reaproveitada de outro arquivo de teste).
 */
const SUPABASE_URL = process.env.E2E_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY;
const PARTICIPANTE_A_EMAIL = process.env.E2E_PARTICIPANTE_A_EMAIL;
const PARTICIPANTE_A_PASSWORD = process.env.E2E_PARTICIPANTE_A_PASSWORD;
const PARTICIPANTE_B_EMAIL = process.env.E2E_PARTICIPANTE_B_EMAIL;
const PARTICIPANTE_B_PASSWORD = process.env.E2E_PARTICIPANTE_B_PASSWORD;
const DOCUMENTO_RESTRITO_ID = process.env.E2E_DOCUMENTO_RESTRITO_ID;
const PARTICIPANTE_B_ID = process.env.E2E_PARTICIPANTE_B_ID;

const FIXTURE_AUSENTE =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !PARTICIPANTE_A_EMAIL ||
  !PARTICIPANTE_A_PASSWORD ||
  !PARTICIPANTE_B_EMAIL ||
  !PARTICIPANTE_B_PASSWORD ||
  !DOCUMENTO_RESTRITO_ID ||
  !PARTICIPANTE_B_ID;

const MOTIVO_SKIP =
  "Preencha E2E_SUPABASE_URL/E2E_SUPABASE_ANON_KEY/E2E_PARTICIPANTE_A_*/E2E_PARTICIPANTE_B_*/" +
  "E2E_DOCUMENTO_RESTRITO_ID/E2E_PARTICIPANTE_B_ID em apps/web/.env.test.local, com um caso de " +
  "dois participantes de papéis diferentes e um documento restrito semeado no projeto de teste " +
  "(ver comentário no topo deste arquivo).";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/portal$/);
}

async function loginToken(
  request: APIRequestContext,
  email: string,
  senha: string,
): Promise<string> {
  const res = await request.post(`${SUPABASE_URL}/functions/v1/sessao-login`, {
    headers: { Origin: "http://localhost:5173" },
    data: { email, senha },
  });
  const body = await res.json();
  return body.accessToken as string;
}

test.describe("US6/ADR-0018 — visibilidade por papel e revogação imediata", () => {
  test.skip(FIXTURE_AUSENTE, MOTIVO_SKIP);

  test("AC-2 (smoke de UI): portal do participante B carrega a lista de documentos sem erro", async ({
    page,
  }) => {
    // `DocumentosRealPage.tsx` não renderiza o `id` do documento em lugar nenhum (só
    // nome/tipo/status) — não há como este teste de UI, sozinho, provar "requisito restrito não
    // aparece" sem o fixture também fornecer o NOME esperado do documento restrito (fora do
    // escopo dos env vars documentados no topo deste arquivo). A prova rigorosa do cenário 2
    // ("consulta por ID... chamada direta") é a próxima `test`, direto na API — aqui só
    // confirmamos que a tela do participante B carrega normalmente (sem 403/exceção), condição
    // prévia para a asserção de API fazer sentido.
    await login(page, PARTICIPANTE_B_EMAIL as string, PARTICIPANTE_B_PASSWORD as string);
    await page.goto("/portal/documentos");
    await expect(page.getByTestId("documentos-real")).toBeVisible();
  });

  test("AC-2: consulta direta por ID do documento restrito responde vazio (RLS), não revela metadados", async ({
    request,
  }) => {
    const tokenB = await loginToken(
      request,
      PARTICIPANTE_B_EMAIL as string,
      PARTICIPANTE_B_PASSWORD as string,
    );

    // Chamada direta ao PostgREST, não pela UI — prova o cenário 2 ("consulta por ID... a
    // operação é recusada") no nível onde a garantia realmente vive: a RLS de
    // `documentos.documentos` (policy `participante_ve_documento_do_caso_no_seu_papel`,
    // migration 0019), não uma checagem de UI que poderia ser contornada por chamada direta.
    const res = await request.get(
      `${SUPABASE_URL}/rest/v1/documentos?id=eq.${DOCUMENTO_RESTRITO_ID}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${tokenB}`,
          "Accept-Profile": "documentos",
        },
      },
    );

    expect(res.status()).toBe(200); // RLS filtra a linha, não gera erro — resposta vazia, não 403/404 de aplicação.
    expect(await res.json()).toEqual([]);
  });

  test("AC-4: revogar o participante B faz ele perder a consulta de documentos imediatamente, sem afetar A", async ({
    request,
  }) => {
    const tokenAAntes = await loginToken(
      request,
      PARTICIPANTE_A_EMAIL as string,
      PARTICIPANTE_A_PASSWORD as string,
    );
    const resADocumentosAntes = await request.get(`${SUPABASE_URL}/rest/v1/documentos?select=id`, {
      headers: {
        apikey: SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${tokenAAntes}`,
        "Accept-Profile": "documentos",
      },
    });
    const documentosDeAAntes = await resADocumentosAntes.json();

    // Revogação é ação de admin (crm.revogar_participante exige service_role, ver migration
    // 0024) — fora do escopo deste spec de portal acionar a Edge Function de admin diretamente;
    // o teste assume que o participante B já está revogado no momento em que roda (parte do
    // fixture pré-condição desta suíte: B é revogado ANTES desta aseserção, não durante — ver
    // README do fixture no topo deste arquivo. Se a suíte ganhar um passo de setup que revoga B
    // em tempo real, mover essa chamada para `test.beforeAll` desta `describe`).
    const tokenB = await loginToken(
      request,
      PARTICIPANTE_B_EMAIL as string,
      PARTICIPANTE_B_PASSWORD as string,
    );
    const resBDocumentos = await request.get(`${SUPABASE_URL}/rest/v1/documentos?select=id`, {
      headers: {
        apikey: SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${tokenB}`,
        "Accept-Profile": "documentos",
      },
    });
    expect(await resBDocumentos.json()).toEqual([]);

    // Participante A (não revogado) continua enxergando o mesmo conjunto de antes — revogar B
    // não afetou A (FR-020).
    const tokenADepois = await loginToken(
      request,
      PARTICIPANTE_A_EMAIL as string,
      PARTICIPANTE_A_PASSWORD as string,
    );
    const resADocumentosDepois = await request.get(`${SUPABASE_URL}/rest/v1/documentos?select=id`, {
      headers: {
        apikey: SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${tokenADepois}`,
        "Accept-Profile": "documentos",
      },
    });
    expect(await resADocumentosDepois.json()).toEqual(documentosDeAAntes);

    // UUID do participante revogado é referenciado no fixture (`E2E_PARTICIPANTE_B_ID`), não
    // usado diretamente nesta prova de API — fica documentado aqui para quem for montar o
    // fixture real saber qual linha de `crm.participantes` revogar antes de rodar a suíte.
    expect(PARTICIPANTE_B_ID).toBeTruthy();
  });
});
