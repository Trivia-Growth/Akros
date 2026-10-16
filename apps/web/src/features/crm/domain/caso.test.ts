import { describe, expect, it } from "vitest";
import type { SituacaoCaso } from "./caso";
import { calcularProximaAcao, contarPendenciasPorResponsavel } from "./caso";
import type { Contrato } from "./contrato";

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

function situacao(parciais: Partial<SituacaoCaso> = {}): SituacaoCaso {
  return {
    clienteId: "cliente-1",
    levantamentoEstado: "conferido",
    pendenciasCliente: 0,
    pendenciasAkros: 0,
    pendenciasTerceiro: 0,
    ...parciais,
  };
}

describe("caso — calcularProximaAcao (FR-001/FR-002/FR-013/FR-022)", () => {
  it("sem contrato → ação de registrar contrato do caso (responsável Akros)", () => {
    const resultado = calcularProximaAcao(situacao({ contrato: undefined }));
    expect(resultado).toEqual({
      texto: "Registrar contrato do caso",
      responsavel: "akros",
    });
  });

  it("com contrato, levantamento 'incompleto', TODAS as pendências zeradas → " +
    "ainda retorna ação de concluir levantamento, nunca undefined (FR-013)", () => {
    const resultado = calcularProximaAcao(
      situacao({
        contrato: contrato(),
        levantamentoEstado: "incompleto",
        pendenciasCliente: 0,
        pendenciasAkros: 0,
        pendenciasTerceiro: 0,
      }),
    );
    expect(resultado).toEqual({
      texto: "Concluir levantamento inicial",
      responsavel: "akros",
    });
  });

  it("com contrato, levantamento 'conferido', todas as pendências 0 → undefined (nada pendente)", () => {
    const resultado = calcularProximaAcao(
      situacao({
        contrato: contrato(),
        levantamentoEstado: "conferido",
        pendenciasCliente: 0,
        pendenciasAkros: 0,
        pendenciasTerceiro: 0,
      }),
    );
    expect(resultado).toBeUndefined();
  });

  it("com pendência de cliente > 0 → responsável é o cliente", () => {
    const resultado = calcularProximaAcao(
      situacao({
        contrato: contrato(),
        levantamentoEstado: "conferido",
        pendenciasCliente: 2,
      }),
    );
    expect(resultado?.responsavel).toBe("cliente");
  });

  it("com pendência de Akros > 0 (sem pendência de cliente) → responsável é a equipe Akros", () => {
    const resultado = calcularProximaAcao(
      situacao({
        contrato: contrato(),
        levantamentoEstado: "conferido",
        pendenciasAkros: 1,
      }),
    );
    expect(resultado?.responsavel).toBe("akros");
  });
});

describe("caso — contarPendenciasPorResponsavel", () => {
  it("repassa os três campos corretamente", () => {
    const resultado = contarPendenciasPorResponsavel(
      situacao({ pendenciasCliente: 3, pendenciasAkros: 1, pendenciasTerceiro: 2 }),
    );
    expect(resultado).toEqual({ cliente: 3, akros: 1, terceiro: 2 });
  });
});
