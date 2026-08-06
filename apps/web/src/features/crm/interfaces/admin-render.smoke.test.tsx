// @vitest-environment jsdom
import "@/shared/i18n/config";
import { useMockDb } from "@/mocks/store";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { Cliente360 } from "./Cliente360";
import { Clientes360Page } from "./Clientes360Page";
import { KanbanPage } from "./KanbanPage";
import { PropostasPage } from "./PropostasPage";

describe("Admin — smoke test de render (sem loop infinito)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  afterEach(() => {
    cleanup();
  });

  it("AdminDashboardPage renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<AdminDashboardPage />, ["/admin"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("KanbanPage renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<KanbanPage />, ["/admin/leads"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("Clientes360Page (lista) renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<Clientes360Page />, ["/admin/clientes"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("Cliente360 (detalhe, todas as abas montadas) renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<Cliente360 clienteId="cliente-carlos" onBack={() => {}} />, [
      "/admin/clientes",
    ]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("PropostasPage (com modal de criação sempre montado) renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<PropostasPage />, ["/admin/propostas"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });
});
