import { useSessaoStore } from "@/features/sessao/application/store";
// E13-S13 — formulário de canal e agente: campos por tipo de canal, corpo enviado à Edge Function
// e nenhuma credencial na tela depois de salvar.
// @vitest-environment jsdom
import i18n from "@/shared/i18n/config";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const getSession = vi
  .fn()
  .mockResolvedValue({ data: { session: { access_token: "token-admin" } }, error: null });
const { navegarPara } = vi.hoisted(() => ({ navegarPara: vi.fn() }));
vi.mock("@/shared/supabase/client", () => ({
  getSupabase: () => ({ functions: { invoke }, auth: { getSession } }),
}));
vi.mock("@/shared/lib/navegacao", () => ({ navegarPara }));
const estado = vi.hoisted(() => ({ agentesIA: [] as unknown[] }));
vi.mock("../application/hooks", () => ({
  useConfiguracoesReais: () => ({
    equipe: [],
    integracoes: [],
    contasAgenda: [],
    contasCanal: [],
    agentesIA: estado.agentesIA,
    carregando: false,
    erro: null,
    refetch: () => Promise.resolve(),
  }),
}));

// O painel da Evolution (E13-S15) tem teste próprio; aqui só o formulário de agente e canais Meta.
vi.mock("./CanalEvolutionPainel", () => ({ CanalEvolutionPainel: () => null }));

const useIntegracaoOneDriveMock = vi.fn();
vi.mock("../application/useIntegracaoOneDrive", () => ({
  useIntegracaoOneDrive: () => useIntegracaoOneDriveMock(),
}));

import { ToastViewport } from "@/shared/ui";
import { ConfiguracoesRealPage } from "./ConfiguracoesRealPage";

const URL_META =
  "https://p.supabase.co/functions/v1/meta-whatsapp-webhook?conta=11111111-1111-4111-8111-111111111111";

function abrir() {
  render(
    <>
      <ConfiguracoesRealPage />
      <ToastViewport />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: /configurar canal e agente/i }));
  return screen.getByRole("dialog");
}

function conectarCanal(dialogo: HTMLElement) {
  fireEvent.click(within(dialogo).getByLabelText(/Conectar um canal agora/i));
}

function preencher(dialogo: HTMLElement, rotulo: string | RegExp, valor: string) {
  fireEvent.change(within(dialogo).getByLabelText(rotulo), { target: { value: valor } });
}

describe("ConfiguracoesRealPage — canal e agente (E13-S13)", () => {
  beforeEach(() => {
    invoke.mockReset();
    useIntegracaoOneDriveMock.mockReturnValue({
      integracao: null,
      carregando: false,
      erro: null,
      refetch: () => Promise.resolve(),
    });
    estado.agentesIA = [];
  });
  afterEach(() => {
    cleanup();
  });

  it("abre só com o agente: sem campos de canal até marcar 'Conectar um canal agora'", () => {
    const d = abrir();
    expect(within(d).queryByLabelText("Tipo de canal")).toBeNull();
    expect(within(d).queryByLabelText(/URL HTTPS da Evolution/i)).toBeNull();
    expect(within(d).getByLabelText(/API key OpenRouter/i)).toBeTruthy();
    conectarCanal(d);
    expect(within(d).getByLabelText("Tipo de canal")).toBeTruthy();
  });

  it("salvar só o agente envia o corpo sem canal e mostra a dica do Playground", async () => {
    invoke.mockResolvedValue({
      data: { agenteId: "a1", provedor: null, webhookUrl: null },
      error: null,
    });
    const d = abrir();
    preencher(d, /API key OpenRouter/i, "sk-or-v1-secreta");
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const corpo = invoke.mock.calls[0][1].body;
    expect(corpo).not.toHaveProperty("canal");
    expect(corpo.agente).toMatchObject({ apiKeyOpenRouter: "sk-or-v1-secreta", ativo: false });
    expect(await screen.findByText(/Playground/)).toBeTruthy();
    expect(document.body.innerHTML).not.toContain("sk-or-v1-secreta");
  });

  it("começa em WhatsApp oficial: a Evolution tem painel próprio e não aparece neste formulário", () => {
    const d = abrir();
    conectarCanal(d);
    expect(within(d).getByLabelText(/ID do número de telefone/i)).toBeTruthy();
    expect(within(d).getByLabelText(/Token de acesso permanente/i)).toBeTruthy();
    expect(within(d).queryByLabelText(/ID da conta do Instagram/i)).toBeNull();
    expect(within(d).queryByLabelText(/URL HTTPS da Evolution/i)).toBeNull();
    const tipos = Array.from(
      (within(d).getByLabelText("Tipo de canal") as HTMLSelectElement).options,
    ).map((o) => o.value);
    expect(tipos).toEqual(["whatsapp_oficial", "instagram"]);
  });

  it("trocar para Instagram troca os campos e esconde os do WhatsApp oficial", () => {
    const d = abrir();
    conectarCanal(d);
    fireEvent.change(within(d).getByLabelText("Tipo de canal"), { target: { value: "instagram" } });
    expect(within(d).getByLabelText(/ID da conta do Instagram/i)).toBeTruthy();
    expect(within(d).queryByLabelText(/ID do número de telefone/i)).toBeNull();
    expect(within(d).queryByLabelText(/ID da conta WhatsApp Business/i)).toBeNull();
  });

  it("Instagram pede o id da conta e o Page Access Token", () => {
    const d = abrir();
    conectarCanal(d);
    fireEvent.change(within(d).getByLabelText("Tipo de canal"), { target: { value: "instagram" } });
    expect(within(d).getByLabelText(/ID da conta do Instagram/i)).toBeTruthy();
    expect(within(d).getByLabelText(/Page Access Token/i)).toBeTruthy();
    expect(within(d).queryByLabelText(/ID do número de telefone/i)).toBeNull();
  });

  it("'Gerar' preenche um token de verificação de 32 caracteres hexadecimais", () => {
    const d = abrir();
    conectarCanal(d);
    fireEvent.change(within(d).getByLabelText("Tipo de canal"), { target: { value: "instagram" } });
    fireEvent.click(within(d).getByRole("button", { name: "Gerar" }));
    const campo = within(d).getByLabelText(/Token de verificação do webhook/i) as HTMLInputElement;
    expect(campo.value).toMatch(/^[0-9a-f]{32}$/);
  });

  it("salva WhatsApp oficial: corpo com união por provedor, resultado com o endereço e credenciais zeradas", async () => {
    invoke.mockResolvedValue({
      data: { contaId: "11111111-1111-4111-8111-111111111111", webhookUrl: URL_META },
      error: null,
    });
    const d = abrir();
    conectarCanal(d);
    fireEvent.change(within(d).getByLabelText("Tipo de canal"), {
      target: { value: "whatsapp_oficial" },
    });
    preencher(d, /Número WhatsApp/i, "5511999999999");
    preencher(d, /ID do número de telefone/i, "222333444");
    preencher(d, /ID da conta WhatsApp Business/i, "111222333");
    preencher(d, /Token de acesso permanente/i, "EAAB-token-secreto");
    preencher(d, /App Secret/i, "app-secret-1");
    preencher(d, /Token de verificação do webhook/i, "token-verificacao-1");
    preencher(d, /API key OpenRouter/i, "sk-or-secreta");
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [nome, opcoes] = invoke.mock.calls[0];
    expect(nome).toBe("integracoes-ia-salvar");
    expect(opcoes.headers).toEqual({ "x-akros-csrf": "1" });
    expect(opcoes.body.canal).toEqual({
      provedor: "whatsapp_oficial",
      nomeExibicao: "WhatsApp Akros",
      identificador: "5511999999999",
      ativa: true,
      phoneNumberId: "222333444",
      wabaId: "111222333",
      accessToken: "EAAB-token-secreto",
      appSecret: "app-secret-1",
      verifyToken: "token-verificacao-1",
    });
    expect(opcoes.body.agente).toMatchObject({ apiKeyOpenRouter: "sk-or-secreta", ativo: false });

    const resultado = await screen.findByTestId("resultado-meta");
    expect(resultado.textContent).toContain(URL_META);
    expect(resultado.textContent).toContain("token-verificacao-1");

    // Nenhuma credencial fica nos campos nem em lugar algum do documento depois de salvar.
    const html = document.body.innerHTML;
    expect(html).not.toContain("EAAB-token-secreto");
    expect(html).not.toContain("app-secret-1");
    expect(html).not.toContain("sk-or-secreta");
    expect((within(d).getByLabelText(/App Secret/i) as HTMLInputElement).value).toBe("");
    expect((within(d).getByLabelText(/API key OpenRouter/i) as HTMLInputElement).value).toBe("");
  });

  it("erro do servidor mostra a causa e não troca a tela por sucesso", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("falha") });
    const d = abrir();
    conectarCanal(d);
    preencher(d, /Número WhatsApp/i, "5511999999999");
    preencher(d, /ID do número de telefone/i, "123456789012345");
    preencher(d, /ID da conta WhatsApp Business/i, "987654321098765");
    preencher(d, /Token de acesso permanente/i, "EAAB-token-secreto");
    preencher(d, /App Secret/i, "app-secret-1");
    preencher(d, /Token de verificação/i, "meu-token-verificacao");
    preencher(d, /API key OpenRouter/i, "sk-or-secreta");
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("resultado-meta")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("com agente já criado, abre editando o primeiro (não 'Novo agente') e salva com o id dele", async () => {
    estado.agentesIA = [
      {
        id: "6f29faf4-9e1e-4c66-b8cd-19c309d8581f",
        nome: "Ana",
        funcao: "triagem",
        alma: "Acolha o cliente com calma e encaminhe casos jurídicos.",
        saudacao: "Olá",
        mensagemHandoff: "Vou chamar a equipe",
        modelo: "openai/gpt-4.1-mini",
        ativo: true,
      },
    ];
    invoke.mockResolvedValue({
      data: { agenteId: "6f29faf4-9e1e-4c66-b8cd-19c309d8581f" },
      error: null,
    });
    const d = abrir();
    expect((within(d).getByLabelText("Agente") as HTMLSelectElement).value).toBe(
      "6f29faf4-9e1e-4c66-b8cd-19c309d8581f",
    );
    expect((within(d).getByLabelText(/Nome do agente/i) as HTMLInputElement).value).toBe("Ana");
    preencher(d, /API key OpenRouter/i, "chave-nova-1234");
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke.mock.calls[0][1].body.agente.agenteId).toBe(
      "6f29faf4-9e1e-4c66-b8cd-19c309d8581f",
    );
  });

  it("criou um agente novo e salvou de novo: o segundo salvamento atualiza o mesmo (sem duplicar)", async () => {
    invoke.mockResolvedValue({
      data: { agenteId: "1ea6f326-5912-4493-8d25-d5040bd23dea" },
      error: null,
    });
    const d = abrir();
    preencher(d, /API key OpenRouter/i, "chave-nova-1234");
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke.mock.calls[0][1].body.agente).not.toHaveProperty("agenteId");
    await screen.findAllByText(/Playground/);
    // Só o agente foi salvo, então o diálogo fecha; reabrir e salvar de novo deve atualizar o mesmo.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /configurar canal e agente/i }));
    const d2 = screen.getByRole("dialog");
    preencher(d2, /API key OpenRouter/i, "outra-chave-5678");
    fireEvent.submit(d2.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke.mock.calls[1][1].body.agente.agenteId).toBe(
      "1ea6f326-5912-4493-8d25-d5040bd23dea",
    );
  });
});

// E03-S07 Fase 5 (T058, ADR-0019) — cartão "Conta Microsoft / OneDrive": estados (não
// conectada/conectada/expirada/revogada) e o fluxo de "conectar" chamando GET
// onedrive-oauth/iniciar (nunca token na tela, nunca em localStorage).
describe("ConfiguracoesRealPage — Conta Microsoft / OneDrive (E03-S07 Fase 5)", () => {
  function renderPagina() {
    return render(
      <>
        <ConfiguracoesRealPage />
        <ToastViewport />
      </>,
    );
  }

  beforeEach(async () => {
    invoke.mockReset();
    navegarPara.mockReset();
    getSession.mockRejectedValue(new Error("Supabase Auth não mantém a sessão da aplicação"));
    useSessaoStore.getState().definirSessao({
      accessToken: "token-admin",
      expiresAt: 9999999999,
      usuario: { id: "admin-1", email: "admin@example.test", papel: "admin" },
    });
    // Determinístico independente do idioma detectado no ambiente (navigator/locale da
    // máquina que roda o teste) — o detector de i18next pode resolver "en" fora do pt-BR
    // configurado como fallback.
    await i18n.changeLanguage("pt-BR");
  });
  afterEach(() => {
    cleanup();
    useSessaoStore.getState().definirSessao(null);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("não conectada: mostra aviso e botão 'Conectar', sem botão 'Reconectar'", () => {
    useIntegracaoOneDriveMock.mockReturnValue({
      integracao: null,
      carregando: false,
      erro: null,
      refetch: () => Promise.resolve(),
    });
    renderPagina();
    expect(screen.getByText(/Nenhuma conta Microsoft conectada/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Conectar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reconectar" })).toBeNull();
  });

  it("conectada: mostra e-mail, pasta raiz e badge de estado, sem botão 'Reconectar'", () => {
    useIntegracaoOneDriveMock.mockReturnValue({
      integracao: {
        id: "1",
        contaEmail: "onedrive@akros.exemplo",
        pastaRaizId: "item-raiz-1",
        estado: "conectada",
        conectadoEm: "2026-10-01T10:00:00Z",
      },
      carregando: false,
      erro: null,
      refetch: () => Promise.resolve(),
    });
    renderPagina();
    expect(screen.getByText("onedrive@akros.exemplo")).toBeTruthy();
    expect(screen.getByText("item-raiz-1")).toBeTruthy();
    expect(screen.getByText("Conectada")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reconectar" })).toBeNull();
  });

  it("expirada: mostra badge 'Expirada' e botão 'Reconectar'", () => {
    useIntegracaoOneDriveMock.mockReturnValue({
      integracao: {
        id: "1",
        contaEmail: "onedrive@akros.exemplo",
        pastaRaizId: "item-raiz-1",
        estado: "expirada",
        conectadoEm: "2026-10-01T10:00:00Z",
      },
      carregando: false,
      erro: null,
      refetch: () => Promise.resolve(),
    });
    renderPagina();
    expect(screen.getByText("Expirada")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reconectar" })).toBeTruthy();
  });

  it("revogada: mostra badge 'Revogada' e botão 'Reconectar'", () => {
    useIntegracaoOneDriveMock.mockReturnValue({
      integracao: {
        id: "1",
        contaEmail: "onedrive@akros.exemplo",
        pastaRaizId: "item-raiz-1",
        estado: "revogada",
        conectadoEm: "2026-10-01T10:00:00Z",
      },
      carregando: false,
      erro: null,
      refetch: () => Promise.resolve(),
    });
    renderPagina();
    expect(screen.getByText("Revogada")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reconectar" })).toBeTruthy();
  });

  it("erro ao carregar: mostra mensagem de erro, não quebra o resto da página", () => {
    useIntegracaoOneDriveMock.mockReturnValue({
      integracao: null,
      carregando: false,
      erro: new Error("falhou"),
      refetch: () => Promise.resolve(),
    });
    renderPagina();
    expect(screen.getByText(/Não foi possível carregar a conexão com o OneDrive/i)).toBeTruthy();
  });

  it("conectar: chama GET onedrive-oauth/iniciar com Bearer + x-akros-csrf e navega para a " +
    "authorizeUrl devolvida — nunca um token na tela", async () => {
    useIntegracaoOneDriveMock.mockReturnValue({
      integracao: null,
      carregando: false,
      erro: null,
      refetch: () => Promise.resolve(),
    });
    vi.stubEnv("VITE_SUPABASE_URL", "https://p.supabase.co");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          authorizeUrl:
            "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?state=abc",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPagina();
    fireEvent.click(screen.getByRole("button", { name: "Conectar" }));
    const dialogo = screen.getByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/E-mail da conta corporativa/i), {
      target: { value: "ops@akros.exemplo" },
    });
    fireEvent.change(within(dialogo).getByLabelText(/ID do drive \(OneDrive\)/i), {
      target: { value: "drive-1" },
    });
    fireEvent.change(within(dialogo).getByLabelText(/ID da pasta raiz autorizada/i), {
      target: { value: "pasta-raiz-1" },
    });
    fireEvent.submit(dialogo.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [urlChamada, opcoes] = fetchMock.mock.calls[0];
    expect(String(urlChamada)).toContain("/functions/v1/onedrive-oauth/iniciar");
    expect(String(urlChamada)).toContain("contaEmail=ops%40akros.exemplo");
    expect(String(urlChamada)).toContain("driveId=drive-1");
    expect(String(urlChamada)).toContain("pastaRaizItemId=pasta-raiz-1");
    expect(opcoes.headers.Authorization).toBe("Bearer token-admin");
    expect(opcoes.headers["x-akros-csrf"]).toBe("1");
    expect(opcoes.credentials).toBe("include");

    await waitFor(() =>
      expect(navegarPara).toHaveBeenCalledWith(
        "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?state=abc",
      ),
    );
    // Nunca um token/segredo em lugar nenhum do documento.
    expect(document.body.innerHTML).not.toContain("token-admin");
  });
});
