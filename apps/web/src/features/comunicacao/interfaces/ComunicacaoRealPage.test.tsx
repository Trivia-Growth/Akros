// E13-S13 — o admin não achava onde configurar o agente: Comunicação é só leitura e não apontava o
// caminho. O aviso e a aba "Agente IA" passam a levar a Configurações.
// @vitest-environment jsdom
import i18n from "@/shared/i18n/config";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { ToastViewport } from "@/shared/ui";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  agentes: [] as unknown[],
  conversas: [] as unknown[],
  urlDoAnexo: vi.fn(),
}));
vi.mock("../application/useComunicacaoAdminSupabase", () => ({
  useComunicacaoAdminSupabase: () => ({
    conversas: estado.conversas,
    urlDoAnexo: estado.urlDoAnexo,
    emails: [],
    eventos: [],
    agentes: estado.agentes,
    fontes: [],
    carregando: false,
    erro: null,
  }),
}));

import { ComunicacaoRealPage } from "./ComunicacaoRealPage";

beforeAll(async () => {
  await i18n.changeLanguage("pt-BR");
});

describe("ComunicacaoRealPage — caminho para configurar o agente", () => {
  afterEach(() => cleanup());

  it("o aviso de somente leitura aponta para Configurações e mantém a frase do e2e", () => {
    estado.agentes = [];
    renderWithRouter(<ComunicacaoRealPage />);
    expect(screen.getByTestId("atalho-configuracoes").getAttribute("href")).toBe(
      "/admin/configuracoes",
    );
    expect(
      screen.getByText(/Esta tela não grava comunicação diretamente pelo navegador/),
    ).toBeTruthy();
  });

  it("aba Agente IA com agente: mostra o estado e o atalho para configurar", () => {
    estado.agentes = [{ id: "a1", nome: "Ana", funcao: "Primeiro atendimento", ativo: true }];
    renderWithRouter(<ComunicacaoRealPage />);
    fireEvent.click(screen.getAllByRole("tab")[3]); // 4ª aba: Agente IA
    expect(screen.getAllByText("Ana").length).toBeGreaterThan(0); // lista + seletor do Playground
    expect(screen.getByTestId("atalho-configurar-agente").getAttribute("href")).toBe(
      "/admin/configuracoes",
    );
  });

  it("aba Agente IA sem agente: também leva a Configurações", () => {
    estado.agentes = [];
    renderWithRouter(<ComunicacaoRealPage />);
    fireEvent.click(screen.getAllByRole("tab")[3]); // 4ª aba: Agente IA
    expect(screen.getByText(/Nenhum agente real configurado/)).toBeTruthy();
    expect(screen.getByTestId("atalho-configurar-agente").getAttribute("href")).toBe(
      "/admin/configuracoes",
    );
  });
});

describe("ComunicacaoRealPage — E13-S15: contato não identificado e anexos", () => {
  afterEach(() => {
    cleanup();
    estado.conversas = [];
    estado.urlDoAnexo.mockReset();
    vi.unstubAllGlobals();
  });

  const mensagem = (id: string, extra: Record<string, unknown>) => ({
    id,
    autor: "cliente",
    texto: "",
    enviadoEm: "2026-10-27T12:00:00Z",
    lida: false,
    ...extra,
  });

  it("conversa não identificada traz o selo e a explicação (só equipe, sem cliente, sem resposta)", () => {
    estado.conversas = [
      {
        id: "c1",
        clienteNome: "Contato não identificado",
        canal: "evolution",
        atendidoPorIA: false,
        identificacao: "nao_identificada",
        mensagens: [mensagem("m1", { texto: "Oi, sou eu" })],
      },
    ];
    renderWithRouter(<ComunicacaoRealPage />);
    const card = screen.getByTestId("conversa-real");
    expect(within(card).getByText("Contato não identificado", { selector: "span" })).toBeTruthy();
    expect(
      within(card).getByText(/sem vínculo com cliente e sem resposta do agente/i),
    ).toBeTruthy();
    expect(within(card).getByText("Oi, sou eu")).toBeTruthy();
  });

  it("conversa identificada não ganha o selo", () => {
    estado.conversas = [
      {
        id: "c2",
        clienteNome: "Maria",
        canal: "evolution",
        atendidoPorIA: true,
        identificacao: "identificada",
        mensagens: [mensagem("m1", { texto: "Olá" })],
      },
    ];
    renderWithRouter(<ComunicacaoRealPage />);
    expect(screen.queryByText(/sem vínculo com cliente/i)).toBeNull();
  });

  it("anexo guardado: 'Abrir anexo' pede o link temporário e abre numa aba nova sem opener", async () => {
    estado.urlDoAnexo.mockResolvedValue("https://p.supabase.co/storage/v1/object/sign/x?token=t");
    const abrir = vi.fn();
    vi.stubGlobal("open", abrir);
    estado.conversas = [
      {
        id: "c3",
        clienteNome: "Maria",
        canal: "evolution",
        atendidoPorIA: false,
        identificacao: "identificada",
        mensagens: [
          mensagem("m1", {
            tipo: "arquivo",
            midiaNome: "passaporte.pdf",
            anexo: {
              caminho: "conta/m1",
              mime: "application/pdf",
              tamanhoBytes: 10,
              baixado: true,
            },
          }),
        ],
      },
    ];
    renderWithRouter(<ComunicacaoRealPage />);
    fireEvent.click(screen.getByRole("button", { name: /ver mensagens/i }));
    expect(screen.getByText("passaporte.pdf")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /abrir anexo/i }));
    await waitFor(() =>
      expect(abrir).toHaveBeenCalledWith(
        "https://p.supabase.co/storage/v1/object/sign/x?token=t",
        "_blank",
        "noopener,noreferrer",
      ),
    );
    expect(estado.urlDoAnexo).toHaveBeenCalledWith("conta/m1");
  });

  it("anexo que não foi baixado mostra o motivo e não oferece abrir", () => {
    estado.conversas = [
      {
        id: "c4",
        clienteNome: "Maria",
        canal: "evolution",
        atendidoPorIA: false,
        identificacao: "identificada",
        mensagens: [
          mensagem("m1", {
            tipo: "imagem",
            anexo: { mime: "image/jpeg", tamanhoBytes: 99, baixado: false, motivo: "tamanho" },
          }),
        ],
      },
    ];
    renderWithRouter(<ComunicacaoRealPage />);
    fireEvent.click(screen.getByRole("button", { name: /ver mensagens/i }));
    expect(screen.getByText(/anexo não baixado · arquivo grande demais/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /abrir anexo/i })).toBeNull();
  });

  it("áudio transcrito mostra o texto com o aviso de transcrição automática; áudio original continua aberto", () => {
    estado.conversas = [
      {
        id: "c5",
        clienteNome: "Maria",
        canal: "evolution",
        atendidoPorIA: true,
        identificacao: "identificada",
        mensagens: [
          mensagem("m1", {
            tipo: "audio",
            texto: "Oi, quero saber sobre o visto EB-2",
            anexo: {
              caminho: "conta/m1",
              mime: "audio/ogg",
              tamanhoBytes: 9000,
              baixado: true,
              transcricao: { estado: "concluida" },
            },
          }),
        ],
      },
    ];
    renderWithRouter(<ComunicacaoRealPage />);
    fireEvent.click(screen.getByRole("button", { name: /ver mensagens/i }));
    // a prévia do cartão e a linha da conversa mostram o mesmo texto falado
    expect(screen.getAllByText("Oi, quero saber sobre o visto EB-2")).toHaveLength(2);
    expect(screen.getByText(/transcrição automática do áudio — pode conter erros/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /abrir anexo/i })).toBeTruthy();
  });

  it("áudio cuja transcrição falhou mostra o motivo em português, sem texto inventado", () => {
    estado.conversas = [
      {
        id: "c6",
        clienteNome: "Maria",
        canal: "evolution",
        atendidoPorIA: false,
        identificacao: "identificada",
        mensagens: [
          mensagem("m1", {
            tipo: "audio",
            anexo: {
              caminho: "conta/m1",
              mime: "audio/ogg",
              tamanhoBytes: 9000,
              baixado: true,
              transcricao: { estado: "falhou", motivo: "limite" },
            },
          }),
          mensagem("m2", {
            tipo: "audio",
            anexo: {
              caminho: "conta/m2",
              mime: "audio/ogg",
              tamanhoBytes: 9000,
              baixado: true,
              transcricao: { estado: "falhou", motivo: "codigo_novo_do_futuro" },
            },
          }),
        ],
      },
    ];
    renderWithRouter(<ComunicacaoRealPage />);
    fireEvent.click(screen.getByRole("button", { name: /ver mensagens/i }));
    expect(
      screen.getByText(/transcrição indisponível · limite de transcrições por hora atingido/i),
    ).toBeTruthy();
    expect(screen.getByText(/transcrição indisponível · codigo_novo_do_futuro/i)).toBeTruthy();
    expect(screen.queryByText(/transcrição automática/i)).toBeNull();
  });

  it("falha ao gerar o link mostra erro e não abre nada", async () => {
    estado.urlDoAnexo.mockRejectedValue(new Error("negado"));
    const abrir = vi.fn();
    vi.stubGlobal("open", abrir);
    estado.conversas = [
      {
        id: "c5",
        clienteNome: "Maria",
        canal: "evolution",
        atendidoPorIA: false,
        identificacao: "identificada",
        mensagens: [
          mensagem("m1", {
            tipo: "arquivo",
            anexo: {
              caminho: "conta/m1",
              mime: "application/pdf",
              tamanhoBytes: 10,
              baixado: true,
            },
          }),
        ],
      },
    ];
    renderWithRouter(
      <>
        <ComunicacaoRealPage />
        <ToastViewport />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /ver mensagens/i }));
    fireEvent.click(screen.getByRole("button", { name: /abrir anexo/i }));
    expect(await screen.findByText(/não foi possível abrir o anexo/i)).toBeTruthy();
    expect(abrir).not.toHaveBeenCalled();
  });
});
