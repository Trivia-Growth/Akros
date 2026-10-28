// E13-S15 (ADR-0022) — painel da transcrição de áudio: um passo por vez (configurar → testar →
// ligar), aceite do envio de dados, chave write-only e erros traduzidos.
// @vitest-environment jsdom
import i18n from "@/shared/i18n/config";
import { ToastViewport } from "@/shared/ui";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscricaoAudioPort } from "../application/ports";
import { ErroCanalEvolution } from "../domain/evolution";
import type { TranscricaoAudio } from "../domain/transcricao";

import { TranscricaoAudioPainel } from "./TranscricaoAudioPainel";

const CHAVE = "gsk_CHAVE-SECRETA-DO-PROVEDOR";
const config = (over: Partial<TranscricaoAudio> = {}): TranscricaoAudio => ({
  provedor: "groq",
  modelo: "whisper-large-v3-turbo",
  idioma: null,
  indicio: "ROVE",
  ativa: false,
  aceiteEnvioEm: "2026-10-28T10:00:00Z",
  verificadaEm: null,
  ...over,
});

function criarPorta(inicial: TranscricaoAudio | null) {
  const estado = { atual: inicial };
  return {
    estado,
    carregar: vi.fn(async () => (estado.atual ? structuredClone(estado.atual) : null)),
    salvar: vi.fn(async () => {}),
    testar: vi.fn(async () => {}),
    definirAtiva: vi.fn(async (_ativa: boolean) => {}),
  } satisfies TranscricaoAudioPort & { estado: { atual: TranscricaoAudio | null } };
}

async function abrir(porta: ReturnType<typeof criarPorta>) {
  render(
    <>
      <TranscricaoAudioPainel porta={porta} />
      <ToastViewport />
    </>,
  );
  await screen.findByRole("heading", { name: /transcrição de áudio/i });
  await waitFor(() => expect(screen.queryByText(/^carregando/i)).toBeNull());
}

beforeAll(async () => {
  await i18n.changeLanguage("pt-BR");
});

describe("TranscricaoAudioPainel", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => cleanup());

  it("sem configuração: 'Desligada', só o botão de configurar e o aviso de que o áudio sai do Akros", async () => {
    await abrir(criarPorta(null));
    expect(screen.getByText("Desligada")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^configurar$/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /testar chave/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /ligar transcrição/i })).toBeNull();
    expect(screen.getByText(/áudio do cliente é enviado ao provedor/i)).toBeTruthy();
  });

  it("salvar exige a chave e o aceite; envia a chave UMA vez, esvazia o campo e ela nunca fica no DOM", async () => {
    const porta = criarPorta(null);
    await abrir(porta);
    fireEvent.click(screen.getByRole("button", { name: /^configurar$/i }));
    const d = screen.getByRole("dialog");
    const salvar = within(d).getByRole("button", { name: /^salvar$/i }) as HTMLButtonElement;
    expect(salvar.disabled).toBe(true);

    fireEvent.change(within(d).getByLabelText(/chave de api do provedor/i), {
      target: { value: CHAVE },
    });
    expect(salvar.disabled).toBe(true); // falta o aceite
    fireEvent.click(
      within(d).getByLabelText(/entendo que o áudio dos clientes será enviado ao groq/i),
    );
    expect(salvar.disabled).toBe(false);

    porta.estado.atual = config();
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(porta.salvar).toHaveBeenCalledWith({
        provedor: "groq",
        modelo: "whisper-large-v3-turbo",
        idioma: null,
        apiKey: CHAVE,
        aceiteEnvioDados: true,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.body.innerHTML).not.toContain(CHAVE);
    expect(await screen.findByText("Falta testar")).toBeTruthy();
    expect(screen.getByText(/chave final ROVE/)).toBeTruthy();
  });

  it("configurada: 'Testar' prova chave+modelo; só então aparece 'Ligar'; ligar e desligar chamam a porta", async () => {
    const porta = criarPorta(config());
    await abrir(porta);
    expect(screen.queryByRole("button", { name: /ligar transcrição/i })).toBeNull();

    porta.testar.mockImplementation(async () => {
      porta.estado.atual = config({ verificadaEm: "2026-10-28T11:00:00Z" });
    });
    fireEvent.click(screen.getByRole("button", { name: /testar chave e modelo/i }));
    await waitFor(() => expect(porta.testar).toHaveBeenCalled());
    expect(await screen.findByText("Pronta para ligar")).toBeTruthy();
    expect(screen.getByText(/não prova a transcrição em si/i)).toBeTruthy();

    porta.definirAtiva.mockImplementation(async (ativa: boolean) => {
      porta.estado.atual = config({ verificadaEm: "2026-10-28T11:00:00Z", ativa });
    });
    fireEvent.click(screen.getByRole("button", { name: /ligar transcrição/i }));
    await waitFor(() => expect(porta.definirAtiva).toHaveBeenCalledWith(true));
    expect(await screen.findByText("Ligada")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^desligar$/i }));
    await waitFor(() => expect(porta.definirAtiva).toHaveBeenCalledWith(false));
    expect(await screen.findByText("Pronta para ligar")).toBeTruthy();
  });

  it("alterar mantendo o provedor: chave opcional (em branco mantém a guardada) e o aceite não é pedido de novo", async () => {
    const porta = criarPorta(config({ verificadaEm: "2026-10-28T11:00:00Z", ativa: true }));
    await abrir(porta);
    fireEvent.click(screen.getByRole("button", { name: /^alterar$/i }));
    const d = screen.getByRole("dialog");
    expect(within(d).queryByLabelText(/entendo que o áudio/i)).toBeNull();
    expect(within(d).getByText(/deixe em branco para manter a chave guardada/i)).toBeTruthy();
    fireEvent.change(within(d).getByLabelText(/idioma dos áudios/i), { target: { value: "pt" } });
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(porta.salvar).toHaveBeenCalledWith({
        provedor: "groq",
        modelo: "whisper-large-v3-turbo",
        idioma: "pt",
        apiKey: "",
        aceiteEnvioDados: true,
      }),
    );
  });

  it("trocar de provedor pede chave e aceite NOVOS e já troca o modelo para o padrão do provedor", async () => {
    const porta = criarPorta(config({ verificadaEm: "2026-10-28T11:00:00Z", ativa: true }));
    await abrir(porta);
    fireEvent.click(screen.getByRole("button", { name: /^alterar$/i }));
    const d = screen.getByRole("dialog");
    fireEvent.change(within(d).getByLabelText(/^provedor$/i), { target: { value: "openrouter" } });
    expect((within(d).getByLabelText(/^modelo$/i) as HTMLSelectElement).value).toBe(
      "openai/whisper-large-v3",
    );
    expect(
      within(d).getByLabelText(/entendo que o áudio dos clientes será enviado ao openrouter/i),
    ).toBeTruthy();
    expect(
      (within(d).getByRole("button", { name: /^salvar$/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("erros do servidor aparecem traduzidos pelo código, sem texto do provedor", async () => {
    const porta = criarPorta(config());
    porta.testar.mockRejectedValue(new ErroCanalEvolution("chave_recusada", "msg do servidor"));
    await abrir(porta);
    fireEvent.click(screen.getByRole("button", { name: /testar chave e modelo/i }));
    expect(await screen.findByText(/o provedor recusou a chave/i)).toBeTruthy();
    expect(screen.queryByText(/a evolution recusou/i)).toBeNull();
  });

  it("falha ao carregar mostra o erro e não os botões de ação", async () => {
    const porta = criarPorta(null);
    porta.carregar.mockRejectedValue(new Error("rls"));
    render(<TranscricaoAudioPainel porta={porta} />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^configurar$/i })).toBeNull();
  });
});
