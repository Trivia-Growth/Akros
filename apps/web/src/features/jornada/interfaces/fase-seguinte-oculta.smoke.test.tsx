// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JornadaRealPage } from "./JornadaRealPage";

vi.mock("../application/real-hooks", () => ({
  useJornadaClienteReal: () => ({
    carregando: false,
    erro: null,
    jornada: {
      id: "j1",
      clienteId: "c1",
      faseAtualId: "f1",
      fases: [
        {
          id: "f1",
          ordem: 1,
          titulo: "Fase atual",
          descricao: "Em curso",
          status: "em_andamento",
          etapas: [
            {
              id: "e1",
              titulo: "Enviar documento",
              descricao: "Envie o PDF",
              status: "pendente",
              responsavel: "cliente",
            },
          ],
        },
        {
          id: "f2",
          ordem: 2,
          titulo: "Fase seguinte secreta",
          descricao: "Aguarde",
          status: "bloqueada",
          etapas: [],
        },
      ],
    },
  }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("fase seguinte oculta smoke", () => {
  it("mostra pendência atual e mantém fase seguinte fora da tela", () => {
    render(<JornadaRealPage />);
    expect(screen.getByText("journey.whatToDoNow")).toBeInTheDocument();
    expect(screen.getAllByText("Enviar documento")).toHaveLength(2);
    expect(screen.queryByText("Fase seguinte secreta")).not.toBeInTheDocument();
  });
});
