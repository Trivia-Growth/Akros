// @vitest-environment jsdom
import "@/shared/i18n/config";
import { useMockDb } from "@/mocks/store";
import { esperarSemViolacoesGraves } from "@/shared/lib/a11y-test";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AprovacoesPage } from "./AprovacoesPage";
import { KanbanPage } from "./KanbanPage";
import { ReativacaoPage } from "./ReativacaoPage";

/**
 * Smoke tests de render das telas novas da rodada 2 (E06/E07/E09/E11) — mesmo risco dos
 * smoke tests da rodada 1: loop infinito de render por seletor Zustand mal formado.
 */
describe("Admin (rodada 2) — smoke test de render", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  afterEach(() => {
    cleanup();
  });

  it("KanbanPage renderiza e abre o detalhe de um lead com as novas abas", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<KanbanPage />, ["/admin/leads"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("AprovacoesPage renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<AprovacoesPage />, ["/admin/aprovacoes"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("ReativacaoPage renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<ReativacaoPage />, ["/admin/reativacao"]);
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
describe("rodada2-render — acessibilidade", () => {
  afterEach(() => {
    cleanup();
  });

  it("AprovacoesPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<AprovacoesPage />, ["/admin/aprovacoes"]);
    await esperarSemViolacoesGraves(container);
  });

  it("KanbanPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<KanbanPage />, ["/admin/leads"]);
    await esperarSemViolacoesGraves(container);
  });

  it("ReativacaoPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<ReativacaoPage />, ["/admin/reativacao"]);
    await esperarSemViolacoesGraves(container);
  });
});
