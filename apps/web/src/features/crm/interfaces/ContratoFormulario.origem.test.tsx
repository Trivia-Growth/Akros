// @vitest-environment jsdom
import "@/shared/i18n/config";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const comandos = vi.hoisted(() => ({
  registrarContrato: vi.fn().mockResolvedValue({ id: "contrato-1" }),
  prepararCaso: vi.fn().mockResolvedValue({ id: "jornada-1" }),
}));
vi.mock("../application/useContratoComandos", () => ({
  useContratoComandos: () => ({ ...comandos, salvando: false }),
}));
import { ContratoFormulario } from "./ContratoFormulario";

afterEach(() => cleanup());

it("permite registrar cliente em andamento com origem importada", async () => {
  render(<ContratoFormulario open onClose={vi.fn()} clienteId="cliente-1" onSalvo={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/program code/i), { target: { value: "eb2-niw" } });
  fireEvent.change(screen.getByLabelText(/program version/i), { target: { value: "2026.1" } });
  fireEvent.change(screen.getByLabelText(/response deadline/i), { target: { value: "10" } });
  expect(
    (screen.getByRole("button", { name: /register contract/i }) as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText(/case origin/i), { target: { value: "importado" } });
  fireEvent.click(screen.getByRole("button", { name: /register contract/i }));
  await waitFor(() =>
    expect(comandos.prepararCaso).toHaveBeenCalledWith(
      expect.objectContaining({ origem: "importado" }),
    ),
  );
});
