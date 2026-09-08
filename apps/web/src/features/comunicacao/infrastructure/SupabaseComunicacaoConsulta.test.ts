import { describe, expect, it } from "vitest";
import { paraEvento } from "./SupabaseComunicacaoConsulta";

describe("SupabaseComunicacaoConsulta — mapeamento", () => {
  it("E13-S11 AC-2: preserva UUID e valida anexos JSONB", () => {
    expect(
      paraEvento({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: "22222222-2222-2222-2222-222222222222",
        canal: "chat_portal",
        direcao: "entrada",
        autor: "Cliente",
        conteudo: "Preciso de ajuda.",
        anexos: [
          { nome: "passaporte.pdf", documentoId: "33333333-3333-3333-3333-333333333333" },
          {},
        ],
        ocorrido_em: "2026-09-05T12:00:00Z",
        origem_id: null,
        pendente_de_canal: false,
      }),
    ).toMatchObject({
      clienteOuLeadId: "22222222-2222-2222-2222-222222222222",
      anexos: [{ nome: "passaporte.pdf", documentoId: "33333333-3333-3333-3333-333333333333" }],
    });
  });

  it("não expõe evento de lead sem cliente convertido", () => {
    expect(
      paraEvento({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: null,
        canal: "sistema",
        direcao: "interno",
        autor: "Sistema",
        conteudo: "Lead criado.",
        anexos: null,
        ocorrido_em: "2026-09-05T12:00:00Z",
        origem_id: null,
        pendente_de_canal: null,
      }),
    ).toBeNull();
  });
});
