// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ carregar: vi.fn(), vincularPasta: vi.fn() }));
vi.mock("@/app/real-repositories", () => ({
  obterVinculoPastaReal: () => ({ carregar: mocks.carregar }),
  obterCasoComandosReal: () => ({ vincularPasta: mocks.vincularPasta }),
}));
vi.mock("@/features/configuracoes/application/useIntegracaoOneDrive", () => ({
  useIntegracaoOneDrive: () => ({
    integracao: { id: "integracao-1", estado: "conectada" },
    carregando: false,
    erro: null,
  }),
}));
import { usePastaCaso } from "./usePastaCaso";

beforeEach(() => {
  mocks.carregar.mockReset().mockResolvedValue(null);
  mocks.vincularPasta.mockReset();
});

it("vincula caso à integração ativa e preserva chave ao repetir após erro", async () => {
  mocks.vincularPasta
    .mockRejectedValueOnce(new Error("falha de rede"))
    .mockResolvedValueOnce(undefined);
  const { result } = renderHook(() => usePastaCaso("cliente-1", "jornada-1"));
  await waitFor(() => expect(result.current.carregando).toBe(false));
  await act(async () => {
    await result.current.vincular("pasta-1");
  });
  expect(result.current.erro).toBe("case.folderLinkError");
  await act(async () => {
    await result.current.vincular("pasta-1");
  });
  expect(mocks.vincularPasta).toHaveBeenCalledTimes(2);
  expect(mocks.vincularPasta.mock.calls[0][0]).toMatchObject({
    clienteId: "cliente-1",
    jornadaId: "jornada-1",
    integracaoId: "integracao-1",
    folderItemId: "pasta-1",
  });
  expect(mocks.vincularPasta.mock.calls[1][0].idempotencyKey).toBe(
    mocks.vincularPasta.mock.calls[0][0].idempotencyKey,
  );
  expect(result.current.erro).toBeNull();
});

it("mostra falha na consulta da pasta em vez de fingir que não existe vínculo", async () => {
  mocks.carregar.mockRejectedValue(new Error("sem acesso"));
  const { result } = renderHook(() => usePastaCaso("cliente-1", "jornada-1"));
  await waitFor(() => expect(result.current.carregando).toBe(false));
  expect(result.current.erro).toBe("case.folderReadError");
});
