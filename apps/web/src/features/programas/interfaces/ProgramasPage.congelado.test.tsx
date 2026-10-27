import { ToastViewport } from "@/shared/ui";
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

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
    salvar: vi.fn().mockRejectedValue({ code: "55000" }),
  }),
  useRequisitoDocumentoRepo: () => null,
}));
vi.mock("@/features/crm/application/useClientesSupabase", () => ({
  useClientesSupabase: () => ({ clientes: [] }),
}));
vi.mock("@/features/sessao/application/hooks", () => ({ useSessaoAtual: () => null }));
import { ProgramasPage } from "./ProgramasPage";

it("orienta duplicar versão já usada por casos", async () => {
  render(
    <>
      <ProgramasPage />
      <ToastViewport />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: /editar jornada/i }));
  fireEvent.click(screen.getByRole("button", { name: /salvar configuração/i }));
  expect(await screen.findByText(/duplique o programa/i)).toBeTruthy();
});
