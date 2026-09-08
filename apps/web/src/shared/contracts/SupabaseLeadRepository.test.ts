import { afterEach, describe, expect, it, vi } from "vitest";
import type { LinhaLeadSupabase } from "./SupabaseLeadRepository";
import { paraColunas, paraDominio } from "./SupabaseLeadRepository";

/**
 * E13-S09 AC-1 — mapeamento linha↔domínio.
 *
 * O comportamento contra o banco real é provado pelo job `db-tests`
 * (`supabase/tests/02-rls-leads_test.sql`). O que se testa aqui é a tradução, que é onde o erro
 * silencioso mora: uma coluna esquecida no `paraColunas` some sem o TypeScript reclamar, porque
 * o retorno é `Record<string, unknown>`.
 */
const linha: LinhaLeadSupabase = {
  id: "11111111-1111-1111-1111-111111111111",
  nome: "Ana",
  email: "ana@example.com",
  telefone: "11999999999",
  origem: "site",
  tipo_visto_interesse: "eb2-niw",
  area_profissao: null,
  mensagem: null,
  estagio: "qualificado",
  nao_contatar: false,
  notas: ["primeira nota"],
  perfil: { formacao: "mestrado" },
  perfil_origem: { formacao: "informado_lead" },
  qualificacao: null,
  cadencia: null,
  gate_agendamento: null,
  created_at: "2026-08-31T12:00:00.000Z",
};

describe("SupabaseLeadRepository — mapeamento", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-1: snake_case do banco vira camelCase do domínio", () => {
    const lead = paraDominio(linha);
    expect(lead.tipoVistoInteresse).toBe("eb2-niw");
    expect(lead.criadoEm).toBe("2026-08-31T12:00:00.000Z");
    expect(lead.naoContatar).toBe(false);
    expect(lead.perfil).toEqual({ formacao: "mestrado" });
  });

  it("coluna nula vira `undefined`, não `null` — o domínio não conhece null", () => {
    const lead = paraDominio(linha);
    expect(lead.areaProfissao).toBeUndefined();
    expect(lead.mensagem).toBeUndefined();
    expect(lead.qualificacao).toBeUndefined();
  });

  it("`notas` nula vira lista vazia — a UI itera sem checar", () => {
    expect(paraDominio({ ...linha, notas: null }).notas).toEqual([]);
  });

  it("AC-1: `paraColunas` cobre todo campo de NovoLead", () => {
    // Se alguém acrescentar um campo em `NovoLead` e esquecer do mapeamento, este teste falha —
    // é a única barreira, já que o retorno é Record<string, unknown> e o TS não ajuda.
    const colunas = paraColunas({
      nome: "Bruno",
      email: "bruno@example.com",
      telefone: "11988888888",
      origem: "indicacao",
      tipoVistoInteresse: "eb1a",
      areaProfissao: "engenharia",
      mensagem: "oi",
      perfil: { formacao: "doutorado" },
      perfilOrigem: { formacao: "preenchido_equipe" },
      qualificacao: { status: "em_andamento", perguntaAtualIndex: 2, respostas: { q1: "sim" } },
      cadencia: { status: "ativa", toqueAtual: 1 },
      gateAgendamento: { status: "pendente" },
      naoContatar: true,
    });

    expect(colunas).toEqual({
      nome: "Bruno",
      email: "bruno@example.com",
      telefone: "11988888888",
      origem: "indicacao",
      tipo_visto_interesse: "eb1a",
      area_profissao: "engenharia",
      mensagem: "oi",
      perfil: { formacao: "doutorado" },
      perfil_origem: { formacao: "preenchido_equipe" },
      qualificacao: { status: "em_andamento", perguntaAtualIndex: 2, respostas: { q1: "sim" } },
      cadencia: { status: "ativa", toqueAtual: 1 },
      gate_agendamento: { status: "pendente" },
      nao_contatar: true,
    });
  });

  it("`naoContatar` ausente grava `false`, nunca `undefined` (coluna é NOT NULL)", () => {
    const colunas = paraColunas({
      nome: "C",
      email: "c@example.com",
      telefone: "11",
      origem: "site",
      tipoVistoInteresse: "eb2-niw",
    });
    expect(colunas.nao_contatar).toBe(false);
  });

  it("AC-7: criação pública usa endpoint first-party e não envia campos internos", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "22222222-2222-2222-2222-222222222222" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { SupabaseLeadRepository } = await import("./SupabaseLeadRepository");
    const repository = new SupabaseLeadRepository();

    const criado = await repository.criar({
      nome: "Carla",
      email: "carla@example.com",
      telefone: "11977777777",
      origem: "Formulário homepage",
      tipoVistoInteresse: "eb2-niw",
      perfil: { formacao: "mestrado" },
      naoContatar: true,
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/leads");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      nome: "Carla",
      email: "carla@example.com",
      telefone: "11977777777",
      tipoVistoInteresse: "eb2-niw",
      origem: "Formulário homepage",
    });
    expect(criado.id).toBe("22222222-2222-2222-2222-222222222222");
    expect(criado.estagio).toBe("lead");
  });

  it("AC-7: excesso recebe mensagem acionável", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 429 }));
    const { SupabaseLeadRepository } = await import("./SupabaseLeadRepository");

    await expect(
      new SupabaseLeadRepository().criar({
        nome: "Carla",
        email: "carla@example.com",
        telefone: "11977777777",
        origem: "site",
        tipoVistoInteresse: "eb2-niw",
      }),
    ).rejects.toThrow("Muitas tentativas");
  });
});
