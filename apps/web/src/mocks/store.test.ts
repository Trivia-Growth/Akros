import { container } from "@/app/di";
import { beforeEach, describe, expect, it } from "vitest";
import { useMockDb } from "./store";

describe("useMockDb (E00-S04 — camada de mock + DI)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("AC-3: personas nascem com jornadas em estados diferentes", async () => {
    const clientes = await container.clientes.listar();
    expect(clientes.length).toBeGreaterThanOrEqual(4);

    const jornadaCarlos = await container.jornada.obterPorCliente("cliente-carlos");
    const jornadaFernanda = await container.jornada.obterPorCliente("cliente-fernanda");

    expect(jornadaCarlos?.fases.find((f) => f.id === "fase-1")?.status).toBe("em_andamento");
    expect(jornadaFernanda?.fases.every((f) => f.status === "concluida")).toBe(true);
  });

  it("AC-2/AC-4: mutação via porta persiste na sessão (mover lead no kanban)", async () => {
    const antes = await container.leads.obter("lead-001");
    expect(antes?.estagio).toBe("lead");

    await container.leads.moverEstagio("lead-001", "qualificado");

    const depois = await container.leads.obter("lead-001");
    expect(depois?.estagio).toBe("qualificado");
  });

  it("gate central: fase bloqueada só libera via liberarFase (admin)", async () => {
    const antes = await container.jornada.obterPorCliente("cliente-carlos");
    expect(antes?.fases.find((f) => f.id === "fase-2")?.status).toBe("bloqueada");

    await container.jornada.liberarFase("cliente-carlos", "fase-2");

    const depois = await container.jornada.obterPorCliente("cliente-carlos");
    expect(depois?.fases.find((f) => f.id === "fase-2")?.status).toBe("liberada");
  });

  it("registra interação no histórico ao liberar fase", async () => {
    await container.jornada.liberarFase("cliente-carlos", "fase-2");
    const historico = await container.clientes.historico("cliente-carlos");
    expect(historico.some((i) => i.tipo === "mudanca_fase")).toBe(true);
  });

  it("AC-1: formulário de lead cria Lead que aparece no kanban (estágio 'lead')", async () => {
    const novo = await container.leads.criar({
      nome: "Teste E2E",
      email: "teste@example.com",
      telefone: "+55 11 90000-0000",
      origem: "Formulário homepage",
      tipoVistoInteresse: "EB-2 NIW",
    });
    expect(novo.estagio).toBe("lead");

    const todos = await container.leads.listar();
    expect(todos.find((l) => l.id === novo.id)?.estagio).toBe("lead");
  });

  it("AC-5: resetarDemo restaura o estado inicial", async () => {
    await container.leads.moverEstagio("lead-001", "fechado");
    useMockDb.getState().resetarDemo();
    const lead = await container.leads.obter("lead-001");
    expect(lead?.estagio).toBe("lead");
  });

  it("progresso da jornada é calculado a partir das etapas concluídas", async () => {
    const percentualAntes = await container.progresso.calcularPercentual("cliente-carlos");
    await container.jornada.concluirEtapa("cliente-carlos", "f1-2");
    const percentualDepois = await container.progresso.calcularPercentual("cliente-carlos");
    expect(percentualDepois).toBeGreaterThan(percentualAntes);
  });

  it("assinatura mock: assinar solicitação muda status para 'assinado'", async () => {
    await container.assinatura.assinar("assinatura-renata-cartas", "Renata Alves");
    const solicitacoes = await container.assinatura.listarPorCliente("cliente-renata");
    const alvo = solicitacoes.find((s) => s.id === "assinatura-renata-cartas");
    expect(alvo?.status).toBe("assinado");
  });

  it("agente IA: responde tópico conhecido e faz handoff em pergunta desconhecida", async () => {
    const conhecida = await container.agenteIA.simularResposta("Quanto custa o processo?");
    expect(conhecida.handoff).toBe(false);

    const desconhecida = await container.agenteIA.simularResposta("Qual a capital da França?");
    expect(desconhecida.handoff).toBe(true);
  });
});
