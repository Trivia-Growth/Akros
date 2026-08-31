// @vitest-environment jsdom
import "@/shared/i18n/config";
import { useMockDb } from "@/mocks/store";
import { esperarSemViolacoesGraves } from "@/shared/lib/a11y-test";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConciliacaoPage } from "./ConciliacaoPage";
import { PagamentosPage } from "./PagamentosPage";

describe("Pagamentos (E10-S01) — smoke test de render", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  afterEach(() => {
    cleanup();
  });

  it("PagamentosPage (portal) renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<PagamentosPage />, ["/portal/pagamentos"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("ConciliacaoPage (admin) renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<ConciliacaoPage />, ["/admin/pagamentos"]);
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
describe("rodada2-pagamentos — acessibilidade", () => {
  afterEach(() => {
    cleanup();
  });

  it("ConciliacaoPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<ConciliacaoPage />, ["/admin/pagamentos"]);
    await esperarSemViolacoesGraves(container);
  });

  it("PagamentosPage não tem violação grave de acessibilidade", async () => {
    const { container } = renderWithRouter(<PagamentosPage />, ["/portal/pagamentos"]);
    await esperarSemViolacoesGraves(container);
  });
});
