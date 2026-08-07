import { container } from "@/app/di";
import { beforeEach, describe, expect, it } from "vitest";
import { useMockDb } from "./store";

describe("produto configurável — mock", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("uma jornada editada é aplicada somente a novos casos", async () => {
    const programa = useMockDb.getState().programas.find((item) => item.codigo === "eb2-niw");
    expect(programa).toBeDefined();
    if (!programa) return;

    useMockDb.getState().salvarPrograma({
      ...programa,
      fasesTemplate: programa.fasesTemplate.map((fase, index) =>
        index === 0 ? { ...fase, titulo: "Boas-vindas premium" } : fase,
      ),
    });

    const cliente = await container.clientes.criarAPartirDeLead("lead-006", programa.codigo);
    const jornadaNova = useMockDb
      .getState()
      .jornadas.find((jornada) => jornada.clienteId === cliente.id);
    const jornadaExistente = useMockDb
      .getState()
      .jornadas.find((jornada) => jornada.clienteId === "cliente-carlos");

    expect(jornadaNova?.fases[0]?.titulo).toBe("Boas-vindas premium");
    expect(jornadaExistente?.fases[0]?.titulo).not.toBe("Boas-vindas premium");
  });

  it("integração mantém apenas a final da chave na configuração mock", () => {
    useMockDb
      .getState()
      .atualizarIntegracao("instagram", { ativa: true, apiKey: "demo_secret_9876" });
    const integracao = useMockDb.getState().integracoes.find((item) => item.id === "instagram");

    expect(integracao).toMatchObject({
      ativa: true,
      segredoConfigurado: true,
      segredoFinal: "9876",
    });
    expect(integracao).not.toHaveProperty("apiKey");
  });

  it("cada agente preserva sua própria alma e memória", () => {
    const ana = useMockDb.getState().agentesIA.find((agente) => agente.id === "agente-ana");
    const claraAntes = useMockDb
      .getState()
      .agentesIA.find((agente) => agente.id === "agente-clara");
    expect(ana).toBeDefined();
    expect(claraAntes).toBeDefined();
    if (!ana || !claraAntes) return;

    useMockDb.getState().salvarAgenteIA({
      ...ana,
      alma: "Tom atualizado para qualificação premium.",
      memoria: { ...ana.memoria, retencao: "90 dias" },
    });

    const claraDepois = useMockDb
      .getState()
      .agentesIA.find((agente) => agente.id === "agente-clara");
    expect(
      useMockDb.getState().agentesIA.find((agente) => agente.id === "agente-ana")?.alma,
    ).toContain("premium");
    expect(claraDepois?.alma).toBe(claraAntes.alma);
    expect(claraDepois?.memoria.retencao).toBe(claraAntes.memoria.retencao);
  });
});
