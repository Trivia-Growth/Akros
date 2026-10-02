// E13-S13 — o admin não achava onde configurar o agente: Comunicação é só leitura e não apontava o
// caminho. O aviso e a aba "Agente IA" passam a levar a Configurações.
// @vitest-environment jsdom
import "@/shared/i18n/config";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({ agentes: [] as unknown[] }));
vi.mock("../application/useComunicacaoAdminSupabase", () => ({
  useComunicacaoAdminSupabase: () => ({
    conversas: [],
    emails: [],
    eventos: [],
    agentes: estado.agentes,
    fontes: [],
    carregando: false,
    erro: null,
  }),
}));

import { ComunicacaoRealPage } from "./ComunicacaoRealPage";

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
