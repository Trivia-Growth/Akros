// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroCanalEvolution } from "../domain/evolution";

const invoke = vi.fn();
const consultas: Record<string, { data: unknown; error: unknown }> = {};
vi.mock("@/shared/supabase/client", () => ({
  getSupabase: () => ({
    functions: { invoke },
    schema: () => ({
      from: (tabela: string) => {
        // Uma Promise de verdade com os métodos encadeáveis do PostgREST pendurados nela.
        const cadeia = Promise.resolve(consultas[tabela]) as Promise<unknown> &
          Record<string, unknown>;
        for (const m of ["select", "eq", "is", "order", "limit", "maybeSingle"])
          cadeia[m] = () => cadeia;
        return cadeia;
      },
    }),
  }),
}));

import { SupabaseEvolutionCanal } from "./SupabaseEvolutionCanal";

const CONTA = "11111111-1111-4111-8111-111111111111";

describe("SupabaseEvolutionCanal", () => {
  beforeEach(() => {
    invoke.mockReset();
    for (const k of Object.keys(consultas)) delete consultas[k];
  });

  it("comandos vão à função canal-evolution com o cabeçalho anti-CSRF e a ação certa", async () => {
    invoke.mockResolvedValue({
      data: { estado: "compativel", versao: "2.3.7", indicio: "abcd", afetadaLogout: false },
      error: null,
    });
    const porta = new SupabaseEvolutionCanal();
    await porta.salvarServidor("https://evo.exemplo.com", "CHAVE-SECRETA-1");
    expect(invoke).toHaveBeenCalledWith("canal-evolution", {
      headers: { "x-akros-csrf": "1" },
      body: {
        acao: "salvar_servidor",
        urlBase: "https://evo.exemplo.com",
        apiKey: "CHAVE-SECRETA-1",
      },
    });

    invoke.mockResolvedValue({ data: {}, error: null });
    await porta.criarInstancia(CONTA);
    await porta.instalarWebhook(CONTA);
    await porta.aceitarRisco(CONTA);
    await porta.enviarTeste(CONTA, "5511999999999");
    await porta.definirAtiva(CONTA, true);
    await porta.vincularAgente(CONTA, "22222222-2222-4222-8222-222222222222");
    const corpos = invoke.mock.calls.slice(1).map((c) => c[1].body);
    expect(corpos).toEqual([
      { acao: "criar_instancia", contaId: CONTA },
      { acao: "instalar_webhook", contaId: CONTA },
      { acao: "aceitar_risco", contaId: CONTA },
      { acao: "enviar_teste", contaId: CONTA, numero: "5511999999999" },
      { acao: "definir_ativa", contaId: CONTA, ativa: true },
      { acao: "vincular_agente", contaId: CONTA, agenteId: "22222222-2222-4222-8222-222222222222" },
    ]);
  });

  it("erro da função vira ErroCanalEvolution com o código do corpo (traduzível na tela)", async () => {
    const corpo = new Response(
      JSON.stringify({ erro: "Aceite o risco.", codigo: "risco_nao_aceito", reqId: "x" }),
      { status: 409 },
    );
    invoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error("non-2xx"), { context: corpo }),
    });
    const erro = await new SupabaseEvolutionCanal().gerarQr(CONTA).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroCanalEvolution);
    expect([erro.codigo, erro.message]).toEqual(["risco_nao_aceito", "Aceite o risco."]);
  });

  it("erro sem corpo legível cai num erro genérico, sem quebrar", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("falha de rede") });
    const erro = await new SupabaseEvolutionCanal().consultarEstado(CONTA).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroCanalEvolution);
    expect(erro.codigo).toBe("erro");
  });

  it("carregar mapeia servidor, matriz e canais sem expor segredo", async () => {
    consultas.evolution_servidor = {
      data: {
        url_base: "https://evo.exemplo.com",
        versao_detectada: "2.3.7",
        estado: "compativel",
        motivo: null,
        indicio: "abcd",
      },
      error: null,
    };
    consultas.evolution_compatibilidade = {
      data: [{ versao: "2.3.7", capacidades: ["qr"], afetada_logout: true, evidencia: "smoke" }],
      error: null,
    };
    consultas.contas_canal = {
      data: [
        {
          id: CONTA,
          nome_exibicao: "WhatsApp Akros",
          identificador: "5511988881001",
          ativa: false,
          estado_conexao: "aguardando_pareamento",
          ultimo_erro_codigo: null,
          aceite_risco_em: null,
        },
      ],
      error: null,
    };
    const d = await new SupabaseEvolutionCanal().carregar();
    expect(d.servidor).toEqual({
      urlBase: "https://evo.exemplo.com",
      versao: "2.3.7",
      estado: "compativel",
      motivo: null,
      indicio: "abcd",
    });
    expect(d.compatibilidade).toEqual([
      { versao: "2.3.7", capacidades: ["qr"], afetadaLogout: true, evidencia: "smoke" },
    ]);
    expect(d.canais[0]).toEqual({
      id: CONTA,
      nomeExibicao: "WhatsApp Akros",
      numero: "5511988881001",
      ativa: false,
      estadoConexao: "aguardando_pareamento",
      ultimoErroCodigo: null,
      aceiteRiscoEm: null,
    });
  });

  it("sem servidor configurado, carregar devolve servidor nulo; erro de leitura falha com mensagem clara", async () => {
    consultas.evolution_servidor = { data: null, error: null };
    consultas.evolution_compatibilidade = { data: [], error: null };
    consultas.contas_canal = { data: [], error: null };
    expect((await new SupabaseEvolutionCanal().carregar()).servidor).toBeNull();
    consultas.contas_canal = { data: null, error: { message: "boom" } };
    await expect(new SupabaseEvolutionCanal().carregar()).rejects.toThrow(/canal Evolution/);
  });
});
