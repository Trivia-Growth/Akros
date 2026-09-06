import { describe, expect, it, vi } from "vitest";
import { SupabasePerfilClienteConsulta } from "./SupabasePerfilClienteConsulta";

const { maybeSingle, select, from, schema } = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  schema: vi.fn(),
}));

vi.mock("@/shared/supabase/client", () => ({
  getSupabase: () => ({ schema }),
}));

describe("SupabasePerfilClienteConsulta", () => {
  it("consulta linha própria sem receber clienteId do claim", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "760facdf-37fa-4f41-8cef-9a79d673a2cf",
        lead_origem_id: null,
        nome: "Carlos Mendes",
        email: "carlos@example.com",
        telefone: "11999999999",
        tipo_visto: "EB-2 NIW",
        case_manager: "Natalia Luz",
        saude: "em_dia",
        programa_id: null,
        programa_versao: null,
        pasta_drive_nome: null,
        perfil_imigratorio: null,
        created_at: "2026-09-05T00:00:00Z",
      },
      error: null,
    });
    select.mockReturnValue({ maybeSingle });
    from.mockReturnValue({ select });
    schema.mockReturnValue({ from });

    await expect(new SupabasePerfilClienteConsulta().carregar()).resolves.toMatchObject({
      id: "760facdf-37fa-4f41-8cef-9a79d673a2cf",
      nome: "Carlos Mendes",
    });
    expect(schema).toHaveBeenCalledWith("crm");
    expect(from).toHaveBeenCalledWith("clientes");
    expect(select).toHaveBeenCalledWith();
  });

  it("propaga falha do PostgREST", async () => {
    const erro = new Error("RLS indisponível");
    maybeSingle.mockResolvedValue({ data: null, error: erro });
    select.mockReturnValue({ maybeSingle });
    from.mockReturnValue({ select });
    schema.mockReturnValue({ from });

    await expect(new SupabasePerfilClienteConsulta().carregar()).rejects.toBe(erro);
  });
});
