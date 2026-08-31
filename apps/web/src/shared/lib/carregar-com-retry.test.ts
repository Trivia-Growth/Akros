import { describe, expect, it, vi } from "vitest";
import { carregarComRetry, ehFalhaDeChunk } from "./carregar-com-retry";

describe("carregarComRetry (E15-S01 AC-5)", () => {
  it("AC-5: falha na primeira tentativa e resolve na segunda", async () => {
    const importar = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to fetch dynamically imported module"))
      .mockResolvedValueOnce({ default: "modulo" });

    await expect(carregarComRetry(importar, 2, 0)).resolves.toEqual({ default: "modulo" });
    expect(importar).toHaveBeenCalledTimes(2);
  });

  it("AC-5: esgotadas as tentativas, propaga o erro para o boundary", async () => {
    const erro = new Error("Failed to fetch dynamically imported module");
    const importar = vi.fn().mockRejectedValue(erro);

    await expect(carregarComRetry(importar, 2, 0)).rejects.toThrow(erro);
    expect(importar).toHaveBeenCalledTimes(2);
  });

  it("não tenta de novo quando a primeira já resolve", async () => {
    const importar = vi.fn().mockResolvedValue({ default: "ok" });
    await carregarComRetry(importar, 2, 0);
    expect(importar).toHaveBeenCalledTimes(1);
  });

  it("distingue falha de chunk de bug de render", () => {
    expect(ehFalhaDeChunk(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(ehFalhaDeChunk(new Error("Loading chunk 42 failed"))).toBe(true);
    expect(ehFalhaDeChunk(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});
