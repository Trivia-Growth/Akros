// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const { buscar } = vi.hoisted(() => ({ buscar: vi.fn() }));
vi.mock("@/app/real-repositories", () => ({
  obterArquivoDownloadReal: () => ({ baixar: buscar }),
}));
import { useDownloadDocumento } from "./useDownloadDocumento";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("disponibiliza o arquivo e libera a URL temporária", async () => {
  vi.useFakeTimers();
  buscar.mockResolvedValue(new Blob(["PDF"], { type: "application/pdf" }));
  const criar = vi.fn().mockReturnValue("blob:arquivo");
  const liberar = vi.fn();
  class URLComDownload extends URL {
    static createObjectURL = criar;
    static revokeObjectURL = liberar;
  }
  vi.stubGlobal("URL", URLComDownload);
  const clicar = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const { result } = renderHook(() => useDownloadDocumento());
  await act(async () => {
    await result.current.baixar("versao-1", "documento.pdf");
  });
  expect(buscar).toHaveBeenCalledWith("versao-1");
  expect(clicar).toHaveBeenCalledOnce();
  expect(result.current.erro).toBe(false);
  act(() => vi.runAllTimers());
  expect(liberar).toHaveBeenCalledWith("blob:arquivo");
});

it("mostra erro quando o servidor recusa o arquivo", async () => {
  buscar.mockRejectedValue(new Error("negado"));
  const { result } = renderHook(() => useDownloadDocumento());
  await act(async () => {
    await result.current.baixar("versao-2", "documento.pdf");
  });
  expect(result.current.erro).toBe(true);
  expect(result.current.baixando).toBe(false);
});
