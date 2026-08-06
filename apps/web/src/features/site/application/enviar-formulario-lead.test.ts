import { useMockDb } from "@/mocks/store";
import { beforeEach, describe, expect, it } from "vitest";
import { enviarFormularioLead, leadFormSchema } from "./enviar-formulario-lead";

describe("enviarFormularioLead (E01-S07)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("AC-1: schema rejeita campos obrigatórios ausentes/inválidos", () => {
    const result = leadFormSchema.safeParse({
      nome: "",
      email: "invalido",
      telefone: "",
      tipoVistoInteresse: "",
      consentimento: false,
    });
    expect(result.success).toBe(false);
  });

  it("AC-2/AC-3: envio válido cria Lead no estágio 'lead' (visível no kanban)", async () => {
    const lead = await enviarFormularioLead({
      nome: "Teste da Silva",
      email: "teste@example.com",
      telefone: "+55 11 90000-0000",
      tipoVistoInteresse: "EB-2 NIW",
      areaProfissao: "Engenharia",
      mensagem: "",
      consentimento: true,
    });

    expect(lead.estagio).toBe("lead");
    expect(lead.origem).toBe("Formulário homepage");

    const todos = useMockDb.getState().leads;
    expect(todos.find((l) => l.id === lead.id)?.estagio).toBe("lead");
  });
});
