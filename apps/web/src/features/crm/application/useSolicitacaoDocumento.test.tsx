import type { Jornada } from "@/features/jornada/domain/types";
// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listar: vi.fn(), solicitarDocumento: vi.fn() }));
vi.mock("@/app/real-repositories", () => ({
  obterRepositorioProgramas: async () => ({ listar: mocks.listar }),
  obterCasoComandosReal: () => ({ solicitarDocumento: mocks.solicitarDocumento }),
}));
import { useSolicitacaoDocumento } from "./useSolicitacaoDocumento";

it("usa a versão congelada e repete a mesma chave após falha", async () => {
  mocks.listar.mockResolvedValue([
    { codigo: "eb2", versao: "1" },
    { codigo: "eb2", versao: "2" },
  ]);
  mocks.solicitarDocumento
    .mockReset()
    .mockRejectedValueOnce(new Error("rede"))
    .mockResolvedValueOnce(undefined);
  const jornada: Jornada = {
    id: "jornada",
    clienteId: "cliente",
    faseAtualId: "",
    fases: [],
    programaId: "eb2",
    programaVersao: "1",
  };
  const { result } = renderHook(() => useSolicitacaoDocumento("cliente", jornada));
  await waitFor(() => expect(result.current.carregando).toBe(false));
  expect(result.current.programa?.versao).toBe("1");
  const dados = {
    faseId: "fase",
    requisitoId: "req",
    titulo: "Passaporte",
    sujeitoTipo: "caso" as const,
  };
  await act(async () => {
    expect(await result.current.solicitar(dados)).toBe(false);
  });
  await act(async () => {
    expect(await result.current.solicitar(dados)).toBe(true);
  });
  expect(mocks.solicitarDocumento.mock.calls[0][0].idempotencyKey).toBe(
    mocks.solicitarDocumento.mock.calls[1][0].idempotencyKey,
  );
  expect(mocks.solicitarDocumento.mock.calls[1][0]).toMatchObject({
    clienteId: "cliente",
    ...dados,
  });
});
