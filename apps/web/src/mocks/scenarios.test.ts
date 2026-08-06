import { beforeEach, describe, expect, it } from "vitest";
import { cenarios } from "./scenarios";
import { useMockDb } from "./store";

describe("cenarios de demo (E05-S02)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("AC-3: cobre pelo menos os 5 cenários mínimos da spec + padrão", () => {
    const ids = cenarios.map((c) => c.id);
    expect(ids).toContain("padrao");
    expect(ids).toContain("funil-cheio");
    expect(ids).toContain("recem-contratado");
    expect(ids).toContain("meio-processo");
    expect(ids).toContain("aguardando-uscis");
    expect(ids).toContain("aprovado");
  });

  it("AC-1: cenário 'funil-cheio' popula leads em todas as 6 colunas do kanban", () => {
    const cenario = cenarios.find((c) => c.id === "funil-cheio");
    expect(cenario).toBeDefined();

    useMockDb.getState().carregarCenario(cenario?.seedExtra ?? (() => ({})));

    const estagios = new Set(useMockDb.getState().leads.map((l) => l.estagio));
    expect(estagios.has("lead")).toBe(true);
    expect(estagios.has("qualificado")).toBe(true);
    expect(estagios.has("reuniao_agendada")).toBe(true);
    expect(estagios.has("em_negociacao")).toBe(true);
    expect(estagios.has("fechado")).toBe(true);
    expect(estagios.has("descartado")).toBe(true);
  });

  it("AC-2: 'resetarDemo' volta ao estado padrão após carregar outro cenário", () => {
    const antes = useMockDb.getState().leads.length;

    const funilCheio = cenarios.find((c) => c.id === "funil-cheio");
    useMockDb.getState().carregarCenario(funilCheio?.seedExtra ?? (() => ({})));
    expect(useMockDb.getState().leads.length).toBeGreaterThan(antes);

    useMockDb.getState().resetarDemo();
    expect(useMockDb.getState().leads.length).toBe(antes);
  });

  it("cenário 'aprovado' aponta para a persona com jornada 100% concluída", () => {
    const cenario = cenarios.find((c) => c.id === "aprovado");
    expect(cenario?.personaId).toBe("cliente-fernanda");

    const jornada = useMockDb.getState().jornadas.find((j) => j.clienteId === "cliente-fernanda");
    expect(jornada?.fases.every((f) => f.status === "concluida")).toBe(true);
  });
});
