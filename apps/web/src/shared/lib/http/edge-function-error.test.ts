import { describe, expect, it } from "vitest";
import { erroDetalhado } from "./edge-function-error";

const GENERICO = "Edge Function returned a non-2xx status code";
const falha = (corpo: unknown, bruto = false) => {
  const erro = new Error(GENERICO) as Error & { context: Response };
  erro.context = new Response(bruto ? String(corpo) : JSON.stringify(corpo), { status: 502 });
  return erro;
};

describe("erroDetalhado", () => {
  it("lê `detail` (problem+json das functions de sessão)", async () => {
    expect((await erroDetalhado(falha({ detail: "Sessão expirada" }))).message).toBe(
      "Sessão expirada",
    );
  });

  it("lê `erro` (integracoes-ia-salvar e agente-playground): era engolido e a tela mostrava o genérico", async () => {
    const e = await erroDetalhado(
      falha({ erro: "A OpenRouter recusou a chave. Confira a API key do agente.", reqId: "x" }),
    );
    expect(e.message).toBe("A OpenRouter recusou a chave. Confira a API key do agente.");
  });

  it("corpo sem causa legível, não-JSON ou sem contexto cai no erro original", async () => {
    expect((await erroDetalhado(falha({ qualquer: 1 }))).message).toBe(GENERICO);
    expect((await erroDetalhado(falha("<html>", true))).message).toBe(GENERICO);
    expect((await erroDetalhado(new Error("rede caiu"))).message).toBe("rede caiu");
    expect((await erroDetalhado("texto")).message).toBe("texto");
  });
});
