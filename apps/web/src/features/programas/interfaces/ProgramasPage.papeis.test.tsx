// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const { salvar } = vi.hoisted(() => ({ salvar: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../application/hooks", () => ({
  useProgramasReais: () => ({
    programas: [
      {
        id: "p1",
        codigo: "eb2",
        nome: "EB2",
        categoria: "imigrante",
        sujeito: "individuo",
        versao: "1",
        ativo: true,
        fasesTemplate: [],
        documentosExigidos: [],
        papeis: [],
      },
    ],
    carregando: false,
    erro: null,
    duplicar: vi.fn(),
    salvar,
  }),
  useRequisitoDocumentoRepo: () => null,
}));
vi.mock("@/features/crm/application/useClientesSupabase", () => ({
  useClientesSupabase: () => ({ clientes: [] }),
}));
vi.mock("@/features/sessao/application/hooks", () => ({ useSessaoAtual: () => null }));
import { ProgramasPage } from "./ProgramasPage";

it("configura papéis obrigatórios e opcionais do programa", async () => {
  render(<ProgramasPage />);
  fireEvent.click(screen.getByRole("button", { name: /editar jornada/i }));
  fireEvent.change(screen.getByLabelText("Aplicante"), { target: { value: "obrigatorio" } });
  fireEvent.change(screen.getByLabelText("Familiar de apoio"), { target: { value: "opcional" } });
  fireEvent.click(screen.getByRole("button", { name: /salvar configuração/i }));
  await waitFor(() =>
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        papeis: [
          { papel: "aplicante", obrigatorio: true },
          { papel: "familiar_apoio", obrigatorio: false },
        ],
      }),
    ),
  );
});
