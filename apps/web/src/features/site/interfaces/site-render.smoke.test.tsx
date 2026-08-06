// @vitest-environment jsdom
import "@/shared/i18n/config";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";
import { QuemSomosPage } from "./QuemSomosPage";

/**
 * Smoke tests de render do site institucional (E01-S01 / E01-S02 — redesign).
 * Cobrem o mesmo risco dos smoke tests do portal: loop infinito de render e
 * chave de i18n inexistente (que apareceria como o próprio path da chave no DOM).
 */
describe("Site — smoke test de render", () => {
  afterEach(() => {
    cleanup();
  });

  it("HomePage renderiza sem loop infinito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<HomePage />, ["/"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth"));
    errorSpy.mockRestore();
  });

  it("HomePage não deixa vazar chave de i18n crua no texto", async () => {
    renderWithRouter(<HomePage />, ["/"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(document.body.textContent ?? "").not.toMatch(/home\.[a-z]+\./i);
  });

  it("HomePage mostra a foto da fundadora no hero", async () => {
    renderWithRouter(<HomePage />, ["/"]);
    const fotos = await screen.findAllByRole("img");
    expect(fotos.some((img) => img.getAttribute("src") === "/equipe/natalia-luz.jpg")).toBe(true);
  });

  it("QuemSomosPage renderiza os 4 integrantes com foto", async () => {
    renderWithRouter(<QuemSomosPage />, ["/quem-somos"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    const fotos = screen.getAllByRole("img");
    const srcs = fotos.map((img) => img.getAttribute("src"));
    expect(srcs).toEqual(
      expect.arrayContaining([
        "/equipe/natalia-luz.jpg",
        "/equipe/denise-sarchiapone.jpg",
        "/equipe/bruno-luz.jpg",
        "/equipe/elem-tluczek.jpg",
      ]),
    );
  });

  it("QuemSomosPage não deixa vazar chave de i18n crua no texto", async () => {
    renderWithRouter(<QuemSomosPage />, ["/quem-somos"]);
    await waitFor(() => screen.getAllByRole("heading", { level: 1 }));
    expect(document.body.textContent ?? "").not.toMatch(/aboutPage\./i);
  });
});
