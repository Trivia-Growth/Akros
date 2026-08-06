import { container } from "@/app/di";
import { beforeEach, describe, expect, it } from "vitest";
import { useMockDb } from "./store";

describe("ações do admin (E03)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("E03-S01 AC-2/AC-3: moverEstagio persiste e é refletido no kanban", async () => {
    await container.leads.moverEstagio("lead-001", "qualificado");
    const leads = await container.leads.listar();
    expect(leads.find((l) => l.id === "lead-001")?.estagio).toBe("qualificado");
  });

  it("E03-S01 AC-3: converter lead 'fechado' cria Cliente + Jornada (fase 0 liberada)", async () => {
    await container.leads.moverEstagio("lead-006", "fechado");
    const cliente = await container.clientes.criarAPartirDeLead("lead-006");

    expect(cliente.nome).toBe("Rafael Coutinho");

    const jornada = useMockDb.getState().jornadas.find((j) => j.clienteId === cliente.id);
    expect(jornada).toBeDefined();
    expect(jornada?.fases.find((f) => f.id === "fase-0")?.status).toBe("liberada");
    expect(jornada?.fases.find((f) => f.id === "fase-1")?.status).toBe("bloqueada");
  });

  it("E03-S03 gate: liberarFase muda status e registra no histórico do cliente", async () => {
    const antes = useMockDb.getState().jornadas.find((j) => j.clienteId === "cliente-carlos");
    expect(antes?.fases.find((f) => f.id === "fase-2")?.status).toBe("bloqueada");

    await container.jornada.liberarFase("cliente-carlos", "fase-2");

    const depois = useMockDb.getState().jornadas.find((j) => j.clienteId === "cliente-carlos");
    expect(depois?.fases.find((f) => f.id === "fase-2")?.status).toBe("liberada");

    const historico = await container.timeline.listarPorCliente("cliente-carlos");
    expect(historico.some((e) => e.canal === "sistema")).toBe(true);
  });

  it("E03-S04: ciclo de vida da proposta (rascunho → enviada → aceita)", async () => {
    const proposta = await container.propostas.criar({
      leadOuClienteId: "lead-001",
      escopo: "Assessoria EB-2 NIW completa",
      tipoVisto: "EB-2 NIW",
      valor: 20000,
      moeda: "BRL",
      condicoes: "Entrada + 4x",
    });
    expect(proposta.status).toBe("rascunho");

    await container.propostas.enviar(proposta.id);
    let atual = (await container.propostas.listar()).find((p) => p.id === proposta.id);
    expect(atual?.status).toBe("enviada");

    await container.propostas.marcarStatus(proposta.id, "aceita");
    atual = (await container.propostas.listar()).find((p) => p.id === proposta.id);
    expect(atual?.status).toBe("aceita");
  });
});
