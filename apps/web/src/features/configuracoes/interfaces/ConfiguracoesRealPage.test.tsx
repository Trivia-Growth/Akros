// E13-S13 — formulário de canal e agente: campos por tipo de canal, corpo enviado à Edge Function
// e nenhuma credencial na tela depois de salvar.
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/shared/supabase/client", () => ({ getSupabase: () => ({ functions: { invoke } }) }));
vi.mock("../application/hooks", () => ({
  useConfiguracoesReais: () => ({
    equipe: [],
    integracoes: [],
    contasAgenda: [],
    contasCanal: [],
    agentesIA: [],
    carregando: false,
    erro: null,
    refetch: () => Promise.resolve(),
  }),
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

function preencher(dialogo: HTMLElement, rotulo: string | RegExp, valor: string) {
  fireEvent.change(within(dialogo).getByLabelText(rotulo), { target: { value: valor } });
}

describe("ConfiguracoesRealPage — canal e agente (E13-S13)", () => {
  beforeEach(() => {
    invoke.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it("começa em Evolution e mostra só os campos dela", () => {
    const d = abrir();
    expect(within(d).getByLabelText(/URL HTTPS da Evolution/i)).toBeTruthy();
    expect(within(d).queryByLabelText(/ID do número de telefone/i)).toBeNull();
    expect(within(d).queryByLabelText(/ID da conta do Instagram/i)).toBeNull();
  });

  it("trocar para WhatsApp oficial troca os campos e esconde os da Evolution", () => {
    const d = abrir();
    fireEvent.change(within(d).getByLabelText("Tipo de canal"), {
      target: { value: "whatsapp_oficial" },
    });
    expect(within(d).getByLabelText(/ID do número de telefone/i)).toBeTruthy();
    expect(within(d).getByLabelText(/ID da conta WhatsApp Business/i)).toBeTruthy();
    expect(within(d).getByLabelText(/Token de acesso permanente/i)).toBeTruthy();
    expect(within(d).getByLabelText(/App Secret/i)).toBeTruthy();
    expect(within(d).queryByLabelText(/URL HTTPS da Evolution/i)).toBeNull();
  });

  it("Instagram pede o id da conta e o Page Access Token", () => {
    const d = abrir();
    fireEvent.change(within(d).getByLabelText("Tipo de canal"), { target: { value: "instagram" } });
    expect(within(d).getByLabelText(/ID da conta do Instagram/i)).toBeTruthy();
    expect(within(d).getByLabelText(/Page Access Token/i)).toBeTruthy();
    expect(within(d).queryByLabelText(/ID do número de telefone/i)).toBeNull();
  });

  it("'Gerar' preenche um token de verificação de 32 caracteres hexadecimais", () => {
    const d = abrir();
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
    preencher(d, /Número WhatsApp/i, "5511999999999");
    preencher(d, /URL HTTPS da Evolution/i, "https://evo.exemplo.com");
    preencher(d, /Nome da instância/i, "akros");
    preencher(d, /API key Evolution/i, "chave-evolution");
    preencher(d, /API key OpenRouter/i, "sk-or-secreta");
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("resultado-meta")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
