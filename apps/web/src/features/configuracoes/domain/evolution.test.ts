import { describe, expect, it } from "vitest";
import {
  type CompatibilidadeEvolution,
  type ServidorEvolution,
  envioProvado,
  proximoPasso,
  versaoAfetadaPorLogout,
} from "./evolution";

const servidor = (versao: string | null): ServidorEvolution => ({
  urlBase: "https://evo.exemplo.com",
  versao,
  estado: "compativel",
  motivo: null,
  indicio: "abcd",
});
const matriz = (capacidades: string[], afetadaLogout = false): CompatibilidadeEvolution[] => [
  { versao: "2.3.7", capacidades, afetadaLogout, evidencia: "smoke" },
];

describe("canal Evolution — domínio", () => {
  it("um passo principal por estado; nunca há passo de 'reiniciar por logout'", () => {
    expect(proximoPasso("sem_credencial")).toBe("preparar");
    expect(proximoPasso("configuracao_incompleta")).toBe("preparar");
    expect(proximoPasso("erro")).toBe("preparar");
    expect(proximoPasso("aguardando_pareamento")).toBe("parear");
    expect(proximoPasso("desconectado")).toBe("parear");
    expect(proximoPasso("conectado_verificado")).toBe("operar");
  });

  it("envio só conta como provado se a versão do servidor está na matriz com sendText", () => {
    expect(envioProvado(servidor("2.3.7"), matriz(["qr"]))).toBe(false);
    expect(envioProvado(servidor("2.3.7"), matriz(["qr", "sendText"]))).toBe(true);
    expect(envioProvado(servidor("2.4.0"), matriz(["sendText"]))).toBe(false);
    expect(envioProvado(servidor(null), matriz(["sendText"]))).toBe(false);
    expect(envioProvado(null, matriz(["sendText"]))).toBe(false);
  });

  it("versão afetada pelo defeito do logout vem da matriz", () => {
    expect(versaoAfetadaPorLogout(servidor("2.3.7"), matriz([], true))).toBe(true);
    expect(versaoAfetadaPorLogout(servidor("2.3.7"), matriz([], false))).toBe(false);
    expect(versaoAfetadaPorLogout(null, matriz([], true))).toBe(false);
  });
});
