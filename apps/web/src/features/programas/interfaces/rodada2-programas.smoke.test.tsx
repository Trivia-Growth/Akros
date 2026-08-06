// @vitest-environment jsdom
import "@/shared/i18n/config";
import { useMockDb } from "@/mocks/store";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgramasPage } from "./ProgramasPage";

describe("ProgramasPage (E06-S04) — smoke test de render", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza os dois programas do catálogo sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<ProgramasPage />, ["/admin/programas"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(screen.getAllByText("EB-2 NIW").length).toBeGreaterThan(0);
    expect(screen.getByText("Visto Religioso (R / EB-4)")).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });
});
