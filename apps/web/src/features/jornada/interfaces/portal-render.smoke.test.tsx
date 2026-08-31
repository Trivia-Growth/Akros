// @vitest-environment jsdom
import "@/shared/i18n/config";
import { AgendaPage } from "@/features/agenda/interfaces/AgendaPage";
import { DocumentosPage } from "@/features/documentos/interfaces/DocumentosPage";
import { PagamentosPage } from "@/features/pagamentos/interfaces/PagamentosPage";
import { useMockDb } from "@/mocks/store";
import { esperarSemViolacoesGraves } from "@/shared/lib/a11y-test";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";
import { JornadaPage } from "./JornadaPage";

/**
 * Smoke tests de render (E00-S00 — bugfix): pegam "Maximum update depth exceeded"
 * causado por seletores Zustand que retornam array/objeto novo a cada render
 * (.filter/.map/.sort dentro do próprio seletor). Testes de lógica pura (store.test.ts)
 * não pegam esse tipo de bug porque ele só se manifesta no ciclo de render do React.
 */
describe("Portal — smoke test de render (sem loop infinito)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  afterEach(() => {
    cleanup();
  });

  it("DashboardPage renderiza sem 'Maximum update depth exceeded'", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<DashboardPage />, ["/portal"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("JornadaPage renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<JornadaPage />, ["/portal/jornada"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("DocumentosPage renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<DocumentosPage />, ["/portal/documentos"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("PagamentosPage renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<PagamentosPage />, ["/portal/pagamentos"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("AgendaPage renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<AgendaPage />, ["/portal/agenda"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });
});

// ── Acessibilidade (axe-core) ────────────────────────────────────────────────
// Parte verificável do checklist impeccable virando gate: label de formulário, nome acessível de
// botão, ordem de heading, papel ARIA válido. NÃO cobre contraste — `color-contrast` precisa de
// layout real e jsdom não faz layout (ver `shared/lib/a11y-test.ts`); contraste segue no peer
// review manual até existir passada com browser de verdade.
describe("portal-render — acessibilidade", () => {
  afterEach(() => {
    cleanup();
  });

  it("AgendaPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<AgendaPage />, ["/portal/agenda"]);
    await esperarSemViolacoesGraves(container);
  });

  it("DocumentosPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<DocumentosPage />, ["/portal/documentos"]);
    await esperarSemViolacoesGraves(container);
  });

  it("PagamentosPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<PagamentosPage />, ["/portal/pagamentos"]);
    await esperarSemViolacoesGraves(container);
  });

  it("DashboardPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<DashboardPage />, ["/portal"]);
    await esperarSemViolacoesGraves(container);
  });

  it("JornadaPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<JornadaPage />, ["/portal/jornada"]);
    await esperarSemViolacoesGraves(container);
  });
});
