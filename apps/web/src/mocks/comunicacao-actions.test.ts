import { container } from "@/app/di";
import { beforeEach, describe, expect, it } from "vitest";
import { useMockDb } from "./store";

describe("ações de comunicação (E04-S01/S02)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("E04-S01 AC-3: enviarMensagem adiciona mensagem 'humano' à conversa", async () => {
    const antes = useMockDb.getState().conversas.find((c) => c.id === "conversa-carlos");
    const totalAntes = antes?.mensagens.length ?? 0;

    await container.conversas.enviarMensagem("conversa-carlos", "Olá, tudo bem?");

    const depois = useMockDb.getState().conversas.find((c) => c.id === "conversa-carlos");
    expect(depois?.mensagens.length).toBe(totalAntes + 1);
    expect(depois?.mensagens.at(-1)?.autor).toBe("humano");
    expect(depois?.mensagens.at(-1)?.texto).toBe("Olá, tudo bem?");
  });

  it("E04-S01 AC-4: conversa do cliente aparece anexada (mesmo clienteId da visão 360)", async () => {
    const conversa = useMockDb.getState().conversas.find((c) => c.clienteId === "cliente-carlos");
    expect(conversa).toBeDefined();
  });

  it("E04-S02 AC-1/AC-3: config do agente é lida e atualizável", async () => {
    const config = await container.agenteIA.obterConfig();
    expect(config.ativo).toBe(true);

    await container.agenteIA.atualizarConfig({ nomeAgente: "Bia (Assistente Akros)" });
    const atualizado = await container.agenteIA.obterConfig();
    expect(atualizado.nomeAgente).toBe("Bia (Assistente Akros)");
  });

  it("E04-S02 AC-3: simularResposta responde tópico conhecido sem handoff", async () => {
    const r = await container.agenteIA.simularResposta("EB-2 NIW o que é?");
    expect(r.handoff).toBe(false);
    expect(r.resposta.length).toBeGreaterThan(0);
  });

  it("E04-S02 AC-3: pergunta fora do escopo aciona handoff", async () => {
    const r = await container.agenteIA.simularResposta("vocês vendem carro?");
    expect(r.handoff).toBe(true);
  });

  it("E04-S04 AC-3: transcrição está anexada à reunião do cliente (evidência)", () => {
    const reuniao = useMockDb
      .getState()
      .reunioes.find((r) => r.clienteId === "cliente-carlos" && r.transcricaoId);
    expect(reuniao).toBeDefined();

    const transcricao = useMockDb
      .getState()
      .transcricoes.find((t) => t.id === reuniao?.transcricaoId);
    expect(transcricao?.reuniaoId).toBe(reuniao?.id);
    expect(transcricao?.actionItems.length).toBeGreaterThan(0);
  });
});
