import { describe, expect, it } from "vitest";
import { paraDadosRecebimento, paraPagamento } from "./SupabasePagamentosConsulta";

describe("SupabasePagamentosConsulta — mapeamento", () => {
  it("E13-S11 AC-2: preserva UUID e normaliza numeric do PostgREST", () => {
    expect(
      paraPagamento({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: "22222222-2222-2222-2222-222222222222",
        descricao: "Taxa USCIS",
        valor: "485.50",
        moeda: "USD",
        status: "pendente",
        vencimento: "2026-10-01",
        tipo: "taxa_federal",
        pago_em: null,
        comprovante_url: null,
        anexado_em: null,
        valor_recebido: null,
        confirmado_por: null,
      }),
    ).toMatchObject({
      clienteId: "22222222-2222-2222-2222-222222222222",
      valor: 485.5,
      moeda: "USD",
    });
  });

  it("converte campos opcionais das instruções de recebimento", () => {
    expect(
      paraDadosRecebimento({
        moeda: "BRL",
        titular: "Akros",
        banco: "Banco teste",
        agencia: "1234",
        conta: null,
        chave_pix: "pix-teste",
        routing_number: null,
        account_number: null,
        swift: null,
        instrucoes: "Use identificador.",
      }),
    ).toEqual({
      moeda: "BRL",
      titular: "Akros",
      banco: "Banco teste",
      agencia: "1234",
      chavePix: "pix-teste",
      instrucoes: "Use identificador.",
    });
  });
});
