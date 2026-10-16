import { describe, expect, it } from "vitest";
import type { Contrato, ContratoCondicao } from "./contrato";
import { condicoesValidas, derivarCobrancas, prazoRespostaValido } from "./contrato";

function condicao(parciais: Partial<ContratoCondicao> = {}): ContratoCondicao {
  return {
    id: "condicao-1",
    descricao: "Entrada",
    tipo: "entrada",
    valor: 1000,
    moeda: "BRL",
    vencimento: "2026-01-01",
    ordem: 0,
    ...parciais,
  };
}

function contrato(parciais: Partial<Contrato> = {}): Contrato {
  return {
    id: "contrato-1",
    clienteId: "cliente-1",
    programaId: "programa-1",
    programaVersao: "v1",
    prazoRespostaDiasUteis: 5,
    prioridade: "padrao",
    condicoes: [],
    registradoPor: "usuario-1",
    registradoEm: "2026-01-01T00:00:00.000Z",
    ativo: true,
    ...parciais,
  };
}

describe("contrato — derivarCobrancas", () => {
  it("devolve exatamente as condições do contrato, na mesma ordem", () => {
    const condicoes = [
      condicao({ id: "c1", ordem: 0 }),
      condicao({ id: "c2", ordem: 1, tipo: "parcela" }),
      condicao({ id: "c3", ordem: 2, tipo: "taxa_federal" }),
    ];
    const resultado = derivarCobrancas(contrato({ condicoes }));
    expect(resultado).toEqual(condicoes);
    expect(resultado.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });
});

describe("contrato — prioridade", () => {
  it("prioridade 'prioritaria' é aceita e preservada, não normalizada para 'padrao'", () => {
    const registrado = contrato({ prioridade: "prioritaria" });
    expect(registrado.prioridade).toBe("prioritaria");
  });
});

describe("contrato — prazoRespostaValido", () => {
  it("0 é inválido (fora do CHECK 1–60)", () => {
    expect(prazoRespostaValido(0)).toBe(false);
  });

  it("61 é inválido (fora do CHECK 1–60)", () => {
    expect(prazoRespostaValido(61)).toBe(false);
  });

  it("1 é válido (limite inferior inclusive)", () => {
    expect(prazoRespostaValido(1)).toBe(true);
  });

  it("60 é válido (limite superior inclusive)", () => {
    expect(prazoRespostaValido(60)).toBe(true);
  });
});

describe("contrato — condicoesValidas", () => {
  it("condição com valor 0 é inválida", () => {
    expect(condicoesValidas([condicao({ valor: 0 })])).toBe(false);
  });

  it("condição com valor negativo é inválida", () => {
    expect(condicoesValidas([condicao({ valor: -10 })])).toBe(false);
  });

  it("lista vazia é válida (contrato pode não ter condição financeira ainda)", () => {
    expect(condicoesValidas([])).toBe(true);
  });

  it("todas as condições com valor positivo são válidas", () => {
    expect(condicoesValidas([condicao({ valor: 500 }), condicao({ valor: 1 })])).toBe(true);
  });
});
