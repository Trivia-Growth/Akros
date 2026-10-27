// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { solicitar } = vi.hoisted(() => ({ solicitar: vi.fn().mockResolvedValue(true) }));
vi.mock("../application/useSolicitacaoDocumento", () => ({
  useSolicitacaoDocumento: () => ({
    programa: {
      fasesTemplate: [{ id: "fase-template", ordem: 0 }],
      documentosExigidos: [
        { id: "req-1", faseTemplateId: "fase-template", titulo: "Passaporte", ativo: true },
        { id: "req-2", faseTemplateId: "outra-fase", titulo: "Outro" },
      ],
    },
    carregando: false,
    salvando: false,
    erro: null,
    solicitar,
  }),
}));
vi.mock("../application/useParticipantesConsulta", () => ({
  useParticipantesConsulta: () => ({ participantes: [], carregando: false, erro: null }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { SolicitarDocumentoPainel } from "./SolicitarDocumentoPainel";

beforeEach(() => solicitar.mockClear());
afterEach(() => cleanup());

it("solicita apenas requisito da fase escolhida para o caso", async () => {
  render(
    <SolicitarDocumentoPainel
      clienteId="cliente-1"
      familiares={[]}
      jornada={{
        id: "jornada-1",
        clienteId: "cliente-1",
        faseAtualId: "fase-1",
        programaId: "eb2",
        programaVersao: "1",
        fases: [
          { id: "fase-1", ordem: 0, titulo: "Fase", descricao: "", status: "liberada", etapas: [] },
        ],
      }}
      onSalvo={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("case.requestPhase"), { target: { value: "fase-1" } });
  expect(screen.queryByText("Outro")).toBeNull();
  fireEvent.change(screen.getByLabelText("case.requestRequirement"), {
    target: { value: "req-1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "case.requestSubmit" }));
  await waitFor(() =>
    expect(solicitar).toHaveBeenCalledWith(
      expect.objectContaining({
        faseId: "fase-1",
        requisitoId: "req-1",
        titulo: "Passaporte",
        sujeitoTipo: "caso",
      }),
    ),
  );
});

it("mantém o familiar selecionado na solicitação", async () => {
  render(
    <SolicitarDocumentoPainel
      clienteId="cliente-1"
      familiares={[{ id: "fam-1", nome: "Ana", parentesco: "conjuge", incluirNoProcesso: true }]}
      jornada={{
        id: "jornada-1",
        clienteId: "cliente-1",
        faseAtualId: "fase-1",
        programaId: "eb2",
        programaVersao: "1",
        fases: [
          { id: "fase-1", ordem: 0, titulo: "Fase", descricao: "", status: "liberada", etapas: [] },
        ],
      }}
      onSalvo={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("case.requestPhase"), { target: { value: "fase-1" } });
  fireEvent.change(screen.getByLabelText("case.requestRequirement"), {
    target: { value: "req-1" },
  });
  fireEvent.change(screen.getByLabelText("case.requestSubject"), {
    target: { value: "familiar:fam-1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "case.requestSubmit" }));
  await waitFor(() =>
    expect(solicitar).toHaveBeenCalledWith(
      expect.objectContaining({ sujeitoTipo: "familiar", sujeitoFamiliarId: "fam-1" }),
    ),
  );
});
