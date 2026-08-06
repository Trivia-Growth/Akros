import { useMockDb } from "@/mocks/store";
import { beforeEach, describe, expect, it } from "vitest";
import { calcularProgresso, concluirEtapa, obterFaseAtual } from "./hooks";

describe("jornada hooks (E02-S02)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("obterFaseAtual retorna a fase em_andamento do cliente", () => {
    const jornada = useMockDb.getState().jornadas.find((j) => j.clienteId === "cliente-carlos");
    const faseAtual = obterFaseAtual(jornada);
    expect(faseAtual?.id).toBe("fase-1");
    expect(faseAtual?.status).toBe("em_andamento");
  });

  it("calcularProgresso reflete etapas concluídas sobre o total", () => {
    const jornadaCarlos = useMockDb
      .getState()
      .jornadas.find((j) => j.clienteId === "cliente-carlos");
    const progressoAntes = calcularProgresso(jornadaCarlos);
    expect(progressoAntes).toBeGreaterThan(0);
    expect(progressoAntes).toBeLessThan(100);

    const jornadaFernanda = useMockDb
      .getState()
      .jornadas.find((j) => j.clienteId === "cliente-fernanda");
    expect(calcularProgresso(jornadaFernanda)).toBe(100);
  });

  it("concluirEtapa marca a etapa como concluída e reflete no progresso", async () => {
    const antes = calcularProgresso(
      useMockDb.getState().jornadas.find((j) => j.clienteId === "cliente-carlos"),
    );

    await concluirEtapa("cliente-carlos", "f1-2");

    const depois = calcularProgresso(
      useMockDb.getState().jornadas.find((j) => j.clienteId === "cliente-carlos"),
    );
    expect(depois).toBeGreaterThan(antes);
  });

  it("fase vira 'concluida' quando todas as etapas concluem", async () => {
    const jornada = useMockDb.getState().jornadas.find((j) => j.clienteId === "cliente-carlos");
    const fase1 = jornada?.fases.find((f) => f.id === "fase-1");
    expect(fase1).toBeDefined();

    for (const etapa of fase1?.etapas ?? []) {
      await concluirEtapa("cliente-carlos", etapa.id);
    }

    const jornadaDepois = useMockDb
      .getState()
      .jornadas.find((j) => j.clienteId === "cliente-carlos");
    const fase1Depois = jornadaDepois?.fases.find((f) => f.id === "fase-1");
    expect(fase1Depois?.status).toBe("concluida");
  });

  it("fase-2 permanece bloqueada até o admin liberar (gate)", () => {
    const jornada = useMockDb.getState().jornadas.find((j) => j.clienteId === "cliente-carlos");
    const fase2 = jornada?.fases.find((f) => f.id === "fase-2");
    expect(fase2?.status).toBe("bloqueada");
  });
});
