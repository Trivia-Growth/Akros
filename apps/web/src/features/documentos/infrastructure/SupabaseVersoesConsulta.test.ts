import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseVersoesConsulta } from "./SupabaseVersoesConsulta";

const { select, eq, order } = vi.hoisted(() => ({ select: vi.fn(), eq: vi.fn(), order: vi.fn() }));
vi.mock("@/shared/supabase/client", () => ({
  getSupabase: () => ({ schema: () => ({ from: () => ({ select, eq, order }) }) }),
}));

describe("SupabaseVersoesConsulta", () => {
  beforeEach(() => {
    select.mockReset().mockReturnThis();
    eq.mockReset().mockReturnThis();
    order.mockReset();
  });

  it("consulta somente versões do documento e mapeia os estados separados", async () => {
    order.mockResolvedValue({
      data: [
        {
          id: "v1",
          numero_versao: 2,
          nome_original: "doc.pdf",
          estado_recebimento: "recebida",
          estado_armazenamento: "pendente",
          recebido_em: "2026-10-21T10:00:00Z",
          created_at: "2026-10-21T09:00:00Z",
        },
      ],
      error: null,
    });
    const result = await new SupabaseVersoesConsulta().listarPorDocumento("d1");
    expect(eq).toHaveBeenCalledWith("documento_id", "d1");
    expect(result[0]).toMatchObject({
      id: "v1",
      numeroVersao: 2,
      estadoRecebimento: "recebida",
      estadoArmazenamento: "pendente",
    });
  });
});
