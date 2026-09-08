// E06-S05 Task 3 — gate de render do formulário (design.md): campos do requisito, seção "Análise
// por IA" só com o toggle ligado e bloqueio de salvamento com skill vazia (AC-3). O desfecho do
// AC-2 (remoção bloqueada → desativar) é gate de camada de dados + wiring já coberto em
// MockRequisitoDocumentoRepository.test.ts; aqui o foco é o contrato de UI do design.md.
// @vitest-environment jsdom
import "@/shared/i18n/config";
import { useMockDb } from "@/mocks/store";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { ToastViewport } from "@/shared/ui";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProgramasPage } from "./ProgramasPage";

describe("E06-S05 — editor de requisito (AC-1, AC-3, AC-7)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza campos do requisito e a seção de IA só com o toggle ligado; bloqueia salvar com skill vazia", async () => {
    renderWithRouter(
      <>
        <ProgramasPage />
        <ToastViewport />
      </>,
      ["/admin/programas"],
    );
    await screen.findByText("Visto Religioso (R / EB-4)");

    fireEvent.click(screen.getByRole("button", { name: /editar jornada/i }));
    expect(screen.getByText("Editar programa")).toBeTruthy();

    // Campos do requisito visíveis (design.md).
    expect(screen.getAllByLabelText("Título do documento").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Emitido por").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Objetivo do documento").length).toBeGreaterThan(0);

    // Seção condicional: skill e upload só aparecem com o toggle ligado.
    expect(screen.queryByLabelText("Skill: instrução para a IA")).toBeNull();
    fireEvent.click(screen.getAllByRole("switch")[0]);
    const skill = screen.getByLabelText("Skill: instrução para a IA");
    expect(skill).toBeTruthy();
    expect(screen.getByText("Arquivo de referência (opcional)")).toBeTruthy();

    // AC-3: salvar com toggle ligado e skill vazia é bloqueado na UI, com mensagem.
    fireEvent.click(screen.getByRole("button", { name: /salvar configuração/i }));
    await screen.findByText(/sem instrução \(skill\)/i);
    expect(screen.getByText("Editar programa")).toBeTruthy(); // modal permanece aberto

    // Com skill preenchida, o salvamento persiste a configuração e fecha o editor.
    fireEvent.change(skill, { target: { value: "Verifique timbrado, assinatura e período" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar configuração/i }));
    await waitFor(() => expect(screen.queryByText("Editar programa")).toBeNull());

    const requisito = useMockDb
      .getState()
      .programas.flatMap((p) => p.documentosExigidos)
      .find((r) => r.analiseIA?.habilitada);
    expect(requisito?.analiseIA?.skill).toBe("Verifique timbrado, assinatura e período");
  }, 15000);
});
