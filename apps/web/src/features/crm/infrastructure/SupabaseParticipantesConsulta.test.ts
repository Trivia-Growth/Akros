// E03-S07 (T049) — mapeamento de linha snake_case de `crm.participantes`, e a chamada
// `.schema("crm").from("participantes").select().eq("cliente_id", ...).order("created_at")`.
// Mesmo estilo de mock em cadeia de `SupabasePerfilClienteConsulta.test.ts`.
import { describe, expect, it, vi } from "vitest";
import { SupabaseParticipantesConsulta, paraParticipante } from "./SupabaseParticipantesConsulta";

const { order, eq, select, from, schema } = vi.hoisted(() => ({
  order: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  schema: vi.fn(),
}));

vi.mock("@/shared/supabase/client", () => ({
  getSupabase: () => ({ schema }),
}));

describe("SupabaseParticipantesConsulta — mapeamento", () => {
  it("mapeia linha ativa com todos os campos opcionais preenchidos", () => {
    expect(
      paraParticipante({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: "22222222-2222-2222-2222-222222222222",
        papel: "familiar_apoio",
        sujeito_tipo: "familiar",
        familiar_id: "fam-1",
        organizacao_id: null,
        nome_exibicao: "Cônjuge de Apoio",
        email: "conjuge@example.com",
        auth_user_id: "33333333-3333-3333-3333-333333333333",
        estado: "ativo",
        convidado_por: "44444444-4444-4444-4444-444444444444",
        convidado_em: "2026-10-16T12:00:00Z",
        revogado_por: null,
        revogado_em: null,
      }),
    ).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      clienteId: "22222222-2222-2222-2222-222222222222",
      papel: "familiar_apoio",
      sujeitoTipo: "familiar",
      familiarId: "fam-1",
      nomeExibicao: "Cônjuge de Apoio",
      email: "conjuge@example.com",
      authUserId: "33333333-3333-3333-3333-333333333333",
      estado: "ativo",
      convidadoPor: "44444444-4444-4444-4444-444444444444",
      convidadoEm: "2026-10-16T12:00:00Z",
    });
  });

  it("omite campos opcionais nulos (organizacaoId, authUserId, revogadoPor/Em)", () => {
    const participante = paraParticipante({
      id: "11111111-1111-1111-1111-111111111111",
      cliente_id: "22222222-2222-2222-2222-222222222222",
      papel: "organizacao_aplicante",
      sujeito_tipo: "organizacao",
      familiar_id: null,
      organizacao_id: null,
      nome_exibicao: "Igreja Aplicante",
      email: null,
      auth_user_id: null,
      estado: "ativo",
      convidado_por: null,
      convidado_em: null,
      revogado_por: null,
      revogado_em: null,
    });

    expect(participante).not.toHaveProperty("organizacaoId");
    expect(participante).not.toHaveProperty("authUserId");
    expect(participante).not.toHaveProperty("email");
    expect(participante).not.toHaveProperty("convidadoPor");
    expect(participante).not.toHaveProperty("revogadoPor");
    expect(participante).not.toHaveProperty("revogadoEm");
  });

  it("mapeia linha revogada com revogadoPor/revogadoEm", () => {
    const participante = paraParticipante({
      id: "11111111-1111-1111-1111-111111111111",
      cliente_id: "22222222-2222-2222-2222-222222222222",
      papel: "beneficiario",
      sujeito_tipo: "titular",
      familiar_id: null,
      organizacao_id: null,
      nome_exibicao: "Beneficiário",
      email: null,
      auth_user_id: null,
      estado: "revogado",
      convidado_por: "33333333-3333-3333-3333-333333333333",
      convidado_em: "2026-10-16T12:00:00Z",
      revogado_por: "44444444-4444-4444-4444-444444444444",
      revogado_em: "2026-10-16T13:00:00Z",
    });

    expect(participante).toMatchObject({
      estado: "revogado",
      revogadoPor: "44444444-4444-4444-4444-444444444444",
      revogadoEm: "2026-10-16T13:00:00Z",
    });
  });

  it("carregar() filtra por cliente_id e ordena por created_at, mapeando cada linha", async () => {
    order.mockResolvedValue({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          cliente_id: "22222222-2222-2222-2222-222222222222",
          papel: "aplicante",
          sujeito_tipo: "titular",
          familiar_id: null,
          organizacao_id: null,
          nome_exibicao: "Aplicante",
          email: null,
          auth_user_id: null,
          estado: "ativo",
          convidado_por: null,
          convidado_em: null,
          revogado_por: null,
          revogado_em: null,
        },
      ],
      error: null,
    });
    eq.mockReturnValue({ order });
    select.mockReturnValue({ eq });
    from.mockReturnValue({ select });
    schema.mockReturnValue({ from });

    const participantes = await new SupabaseParticipantesConsulta().carregar(
      "22222222-2222-2222-2222-222222222222",
    );

    expect(schema).toHaveBeenCalledWith("crm");
    expect(from).toHaveBeenCalledWith("participantes");
    expect(eq).toHaveBeenCalledWith("cliente_id", "22222222-2222-2222-2222-222222222222");
    expect(order).toHaveBeenCalledWith("created_at");
    expect(participantes).toHaveLength(1);
    expect(participantes[0]).toMatchObject({ nomeExibicao: "Aplicante" });
  });

  it("propaga falha do PostgREST", async () => {
    const erro = new Error("RLS indisponível");
    order.mockResolvedValue({ data: null, error: erro });
    eq.mockReturnValue({ order });
    select.mockReturnValue({ eq });
    from.mockReturnValue({ select });
    schema.mockReturnValue({ from });

    await expect(
      new SupabaseParticipantesConsulta().carregar("22222222-2222-2222-2222-222222222222"),
    ).rejects.toBe(erro);
  });
});
