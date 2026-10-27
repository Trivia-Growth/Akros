// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { vincular, estado } = vi.hoisted(() => ({
  vincular: vi.fn().mockResolvedValue(undefined),
  estado: { erro: null as string | null, conectada: true },
}));
vi.mock("../application/usePastaCaso", () => ({
  usePastaCaso: () => ({
    vincular,
    vinculo: null,
    carregando: false,
    salvando: false,
    erro: estado.erro,
    conectada: estado.conectada,
  }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { PastaCasoPainel } from "./PastaCasoPainel";

beforeEach(() => {
  estado.erro = null;
  estado.conectada = true;
  vincular.mockClear();
});
afterEach(() => cleanup());

it("vincula ao caso a pasta escolhida pela equipe", async () => {
  render(<PastaCasoPainel clienteId="cliente-1" jornadaId="jornada-1" />);
  fireEvent.change(screen.getByLabelText("case.folderItemId"), { target: { value: "pasta-123" } });
  fireEvent.click(screen.getByRole("button", { name: "case.linkFolder" }));
  await waitFor(() => expect(vincular).toHaveBeenCalledWith("pasta-123"));
});

it("impede novo vínculo se não consegue consultar o vínculo existente", () => {
  estado.erro = "case.folderReadError";
  render(<PastaCasoPainel clienteId="cliente-1" jornadaId="jornada-1" />);
  expect(screen.getByRole("alert")).toHaveTextContent("case.folderReadError");
  expect(screen.queryByRole("button", { name: "case.linkFolder" })).toBeNull();
});
