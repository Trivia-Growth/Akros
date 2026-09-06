import { describe, expect, it } from "vitest";
import { paraConversa, paraEmail } from "./SupabaseComunicacaoAdminConsulta";

describe("SupabaseComunicacaoAdminConsulta — mapeamento", () => {
  it("E13-S11 AC-3: preserva UUID e descarta mensagens JSONB inválidas", () => {
    expect(
      paraConversa({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: "22222222-2222-2222-2222-222222222222",
        cliente_nome: "Cliente",
        canal: "whatsapp_oficial",
        mensagens: [
          {
            id: "mensagem-1",
            autor: "cliente",
            texto: "Olá",
            enviadoEm: "2026-09-05T12:00:00Z",
            lida: false,
          },
          { texto: "incompleta" },
        ],
        atendido_por_ia: true,
        custo_ia: "0.0310",
      }),
    ).toMatchObject({
      clienteId: "22222222-2222-2222-2222-222222222222",
      custoIA: 0.031,
      mensagens: [{ id: "mensagem-1" }],
    });
  });

  it("normaliza thread sem vínculo e mensagens de e-mail inválidas", () => {
    expect(
      paraEmail({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: null,
        cliente_nome: null,
        conta_email_id: null,
        assunto: "Assunto",
        mensagens: [
          {
            id: "email-1",
            de: "a@b.com",
            corpo: "Olá",
            recebidoEm: "2026-09-05T12:00:00Z",
            direcao: "entrada",
            lida: true,
          },
        ],
      }),
    ).toMatchObject({ assunto: "Assunto", contaEmailId: "", mensagens: [{ id: "email-1" }] });
  });
});
