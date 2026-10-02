// E13-S14 — Playground: o admin conversa com o agente sem canal. Cobre o que ele vê quando funciona,
// quando a mensagem vai para a equipe, quando a OpenRouter falha, e que nada fica salvo no navegador.
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/shared/supabase/client", () => ({ getSupabase: () => ({ functions: { invoke } }) }));

import { PlaygroundAgente } from "./PlaygroundAgente";

const AGENTES = [
  { id: "11111111-1111-4111-8111-111111111111", nome: "Ana", funcao: "triagem", ativo: false },
  { id: "22222222-2222-4222-8222-222222222222", nome: "Beto", funcao: "vendas", ativo: true },
];
const RESPOSTA = {
  tipo: "resposta",
  resposta: "Olá! O EB-2 NIW é um visto para profissionais qualificados.",
  custo: 0.0012,
  modelo: "openai/gpt-4.1-mini",
  ms: 1400,
  instrucoes: "Você é Ana, triagem, da Akros Immigration.",
};

function enviar(texto: string) {
  fireEvent.change(screen.getByLabelText("Mensagem do cliente"), { target: { value: texto } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
}

describe("PlaygroundAgente", () => {
  beforeEach(() => invoke.mockReset());
  afterEach(() => cleanup());

  it("sem agente salvo, explica como criar um sem conectar canal", () => {
    render(<PlaygroundAgente agentes={[]} />);
    expect(screen.getByTestId("playground-sem-agente").textContent).toContain(
      "sem precisar conectar canal",
    );
  });

  it("lista os agentes (desligado também) e avisa que nada é gravado e que a base não é consultada", () => {
    render(<PlaygroundAgente agentes={AGENTES} />);
    expect(screen.getByRole("option", { name: "Ana (desligado)" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Beto" })).toBeTruthy();
    expect(screen.getByTestId("playground-agente").textContent).toContain(
      "Nada é gravado nem enviado a ninguém",
    );
    expect(screen.getByTestId("playground-agente").textContent).toContain(
      "A base de conhecimento ainda não é consultada",
    );
  });

  it("envia a mensagem com o agente escolhido e mostra resposta, modelo, tempo e custo", async () => {
    invoke.mockResolvedValue({ data: RESPOSTA, error: null });
    render(<PlaygroundAgente agentes={AGENTES} />);
    enviar("  Oi, quero saber do EB-2 NIW  ");
    await screen.findByText(/EB-2 NIW é um visto/);
    const [nome, opcoes] = invoke.mock.calls[0];
    expect(nome).toBe("agente-playground");
    expect(opcoes.headers).toEqual({ "x-akros-csrf": "1" });
    expect(opcoes.body).toEqual({
      agenteId: AGENTES[0].id,
      mensagens: [],
      texto: "Oi, quero saber do EB-2 NIW",
    });
    const conversa = screen.getByTestId("playground-conversa");
    expect(within(conversa).getByText("openai/gpt-4.1-mini")).toBeTruthy();
    expect(within(conversa).getByText("1,4 s")).toBeTruthy();
    expect(within(conversa).getByText(/US\$ 0,0012/)).toBeTruthy();
    expect((screen.getByLabelText("Mensagem do cliente") as HTMLTextAreaElement).value).toBe("");
  });

  it("a segunda mensagem leva o histórico da conversa de teste", async () => {
    invoke.mockResolvedValue({ data: RESPOSTA, error: null });
    render(<PlaygroundAgente agentes={AGENTES} />);
    enviar("Oi");
    await screen.findByText(/EB-2 NIW é um visto/);
    enviar("E o prazo?");
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke.mock.calls[1][1].body.mensagens).toEqual([
      { autor: "cliente", texto: "Oi" },
      { autor: "agente_ia", texto: RESPOSTA.resposta },
    ]);
  });

  it("encaminhamento à equipe aparece marcado e sem custo", async () => {
    invoke.mockResolvedValue({
      data: { ...RESPOSTA, tipo: "handoff", resposta: "Vou chamar a equipe.", custo: null },
      error: null,
    });
    render(<PlaygroundAgente agentes={AGENTES} />);
    enviar("Quero falar com um advogado");
    await screen.findByText("Vou chamar a equipe.");
    expect(screen.getByText(/Encaminhado à equipe/)).toBeTruthy();
    expect(screen.queryByText(/US\$/)).toBeNull();
  });

  it("sugestão envia direto; 'Nova conversa' apaga tudo", async () => {
    invoke.mockResolvedValue({ data: RESPOSTA, error: null });
    render(<PlaygroundAgente agentes={AGENTES} />);
    fireEvent.click(screen.getByRole("button", { name: /Quanto custa e quanto tempo demora/ }));
    await screen.findByText(/EB-2 NIW é um visto/);
    expect(invoke.mock.calls[0][1].body.texto).toBe("Quanto custa e quanto tempo demora?");
    fireEvent.click(screen.getByRole("button", { name: /Nova conversa/ }));
    expect(screen.queryByText(/EB-2 NIW é um visto/)).toBeNull();
    expect(screen.getByText(/Nenhuma mensagem ainda/)).toBeTruthy();
  });

  it("erro do servidor mostra a causa e devolve o texto ao campo para tentar de novo", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("falha") });
    render(<PlaygroundAgente agentes={AGENTES} />);
    enviar("Oi, tudo bem?");
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((screen.getByLabelText("Mensagem do cliente") as HTMLTextAreaElement).value).toBe(
      "Oi, tudo bem?",
    );
    expect(screen.queryByTestId("msg-cliente")).toBeNull();
  });

  it("instruções do modelo ficam disponíveis depois da primeira resposta", async () => {
    invoke.mockResolvedValue({ data: RESPOSTA, error: null });
    render(<PlaygroundAgente agentes={AGENTES} />);
    expect(screen.queryByTestId("playground-instrucoes")).toBeNull();
    enviar("Oi");
    await screen.findByText(/EB-2 NIW é um visto/);
    expect(screen.getByTestId("playground-instrucoes").textContent).toContain("Você é Ana");
  });

  it("não guarda a conversa no navegador", async () => {
    invoke.mockResolvedValue({ data: RESPOSTA, error: null });
    render(<PlaygroundAgente agentes={AGENTES} />);
    enviar("Meu passaporte é X123456");
    await screen.findByText(/EB-2 NIW é um visto/);
    expect(JSON.stringify({ ...localStorage })).not.toContain("X123456");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("X123456");
  });
});
