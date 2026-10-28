// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroCanalEvolution } from "../domain/evolution";

const invoke = vi.fn();
let linha: { data: unknown; error: unknown } = { data: null, error: null };
vi.mock("@/shared/supabase/client", () => ({
  getSupabase: () => ({
    functions: { invoke },
    schema: () => ({
      from: () => {
        const cadeia = Promise.resolve(linha) as Promise<unknown> & Record<string, unknown>;
        for (const m of ["select", "limit", "maybeSingle"]) cadeia[m] = () => cadeia;
        return cadeia;
      },
    }),
  }),
}));

import { SupabaseTranscricaoAudio } from "./SupabaseTranscricaoAudio";

describe("SupabaseTranscricaoAudio", () => {
  beforeEach(() => {
    invoke.mockReset();
    linha = { data: null, error: null };
  });

  it("carrega a linha única e traduz os nomes de coluna; sem linha é null", async () => {
    linha = {
      data: {
        provedor: "groq",
        modelo: "whisper-large-v3-turbo",
        idioma: "pt",
        indicio: "wxyz",
        ativa: true,
        aceite_envio_em: "2026-10-28T10:00:00Z",
        verificada_em: "2026-10-28T11:00:00Z",
      },
      error: null,
    };
    expect(await new SupabaseTranscricaoAudio().carregar()).toEqual({
      provedor: "groq",
      modelo: "whisper-large-v3-turbo",
      idioma: "pt",
      indicio: "wxyz",
      ativa: true,
      aceiteEnvioEm: "2026-10-28T10:00:00Z",
      verificadaEm: "2026-10-28T11:00:00Z",
    });
    linha = { data: null, error: null };
    expect(await new SupabaseTranscricaoAudio().carregar()).toBeNull();
    linha = { data: null, error: { message: "rls" } };
    await expect(new SupabaseTranscricaoAudio().carregar()).rejects.toThrow(/carregar/i);
  });

  it("comandos vão à canal-evolution com o cabeçalho anti-CSRF; chave vazia nem vai no corpo", async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const porta = new SupabaseTranscricaoAudio();
    await porta.salvar({
      provedor: "groq",
      modelo: "whisper-large-v3-turbo",
      idioma: null,
      apiKey: "gsk_SEGREDO-DO-PROVEDOR",
      aceiteEnvioDados: true,
    });
    await porta.salvar({
      provedor: "groq",
      modelo: "whisper-large-v3",
      idioma: "pt",
      apiKey: "",
      aceiteEnvioDados: true,
    });
    await porta.testar();
    await porta.definirAtiva(true);
    const chamadas = invoke.mock.calls;
    expect(chamadas.every((c) => c[0] === "canal-evolution")).toBe(true);
    expect(chamadas.every((c) => c[1].headers["x-akros-csrf"] === "1")).toBe(true);
    expect(chamadas.map((c) => c[1].body)).toEqual([
      {
        acao: "salvar_transcricao",
        provedor: "groq",
        modelo: "whisper-large-v3-turbo",
        idioma: null,
        apiKey: "gsk_SEGREDO-DO-PROVEDOR",
        aceiteEnvioDados: true,
      },
      {
        acao: "salvar_transcricao",
        provedor: "groq",
        modelo: "whisper-large-v3",
        idioma: "pt",
        aceiteEnvioDados: true,
      },
      { acao: "testar_transcricao" },
      { acao: "definir_transcricao_ativa", ativa: true },
    ]);
  });

  it("erro da função vira ErroCanalEvolution com o código do corpo (traduzível na tela)", async () => {
    const corpo = new Response(
      JSON.stringify({ erro: "O provedor recusou a chave.", codigo: "chave_recusada", reqId: "x" }),
      { status: 502 },
    );
    invoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error("non-2xx"), { context: corpo }),
    });
    const erro = await new SupabaseTranscricaoAudio().testar().catch((e) => e);
    expect(erro).toBeInstanceOf(ErroCanalEvolution);
    expect(erro.codigo).toBe("chave_recusada");
  });
});
