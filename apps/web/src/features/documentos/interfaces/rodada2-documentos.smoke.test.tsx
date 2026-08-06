// @vitest-environment jsdom
import "@/shared/i18n/config";
import { useMockDb } from "@/mocks/store";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FilaRevisaoPage } from "./FilaRevisaoPage";

describe("FilaRevisaoPage (E07-S03) — smoke test de render", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza sem loop infinito e mostra o documento com tipo trocado (E07-S04)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<FilaRevisaoPage />, ["/admin/documentos"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(screen.getByText(/Carta de experiência — Empresa Delta/)).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });
});
