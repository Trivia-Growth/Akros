import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseClienteRepository } from "./SupabaseClienteRepository";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/shared/supabase/client", () => ({
  getSupabase: () => ({
    schema: (schema: string) => {
      expect(schema).toBe("crm");
      return { rpc };
    },
  }),
}));

describe("SupabaseClienteRepository — conversão de lead", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("E13-S09 AC-1: chama RPC transacional e traduz cliente criado", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: "55555555-5555-5555-5555-555555555555",
          lead_origem_id: "11111111-1111-1111-1111-111111111111",
          nome: "Ana",
          email: "ana@example.com",
          telefone: "11999999999",
          tipo_visto: "eb2-niw",
          case_manager: "Natalia Luz",
          saude: "em_dia",
          programa_id: "eb2-niw",
          programa_versao: null,
          pasta_drive_nome: null,
          perfil_imigratorio: null,
          created_at: "2026-09-04T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const cliente = await new SupabaseClienteRepository().criarAPartirDeLead(
      "11111111-1111-1111-1111-111111111111",
      "eb2-niw",
    );

    expect(rpc).toHaveBeenCalledWith("criar_cliente_a_partir_de_lead", {
      p_lead_id: "11111111-1111-1111-1111-111111111111",
      p_programa_codigo: "eb2-niw",
    });
    expect(cliente).toMatchObject({
      id: "55555555-5555-5555-5555-555555555555",
      leadOrigemId: "11111111-1111-1111-1111-111111111111",
      programaId: "eb2-niw",
      saude: "em_dia",
    });
  });

  it("propaga erro da RPC sem fabricar cliente", async () => {
    const erro = new Error("apenas admin pode converter lead em cliente");
    rpc.mockResolvedValue({ data: null, error: erro });

    await expect(
      new SupabaseClienteRepository().criarAPartirDeLead("11111111-1111-1111-1111-111111111111"),
    ).rejects.toBe(erro);
  });
});
