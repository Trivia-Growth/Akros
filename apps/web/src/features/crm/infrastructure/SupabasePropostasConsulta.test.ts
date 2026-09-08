import { describe, expect, it } from "vitest";
import { paraProposta } from "./SupabasePropostasConsulta";

describe("SupabasePropostasConsulta — mapeamento", () => {
  it("E13-S11 AC-2: preserva UUID, numeric e itens JSONB", () => {
    expect(
      paraProposta({
        id: "11111111-1111-1111-1111-111111111111",
        lead_id: null,
        cliente_id: "22222222-2222-2222-2222-222222222222",
        escopo: "Petição",
        itens_escopo: ["Estratégia", 3, "Formulários"],
        tipo_visto: "EB-2 NIW",
        valor: "8500.00",
        moeda: "USD",
        condicoes: "À vista.",
        valido_ate: "2026-10-01T00:00:00Z",
        status: "rascunho",
        created_at: "2026-09-05T00:00:00Z",
      }),
    ).toMatchObject({
      leadOuClienteId: "22222222-2222-2222-2222-222222222222",
      valor: 8500,
      itensEscopo: ["Estratégia", "Formulários"],
    });
  });

  it("rejeita linha que viola vínculo exclusivo de origem", () => {
    expect(() =>
      paraProposta({
        id: "11111111-1111-1111-1111-111111111111",
        lead_id: null,
        cliente_id: null,
        escopo: "Petição",
        itens_escopo: [],
        tipo_visto: "EB-2 NIW",
        valor: 1,
        moeda: "USD",
        condicoes: "",
        valido_ate: "2026-10-01T00:00:00Z",
        status: "rascunho",
        created_at: "2026-09-05T00:00:00Z",
      }),
    ).toThrow("sem lead ou cliente");
  });
});
