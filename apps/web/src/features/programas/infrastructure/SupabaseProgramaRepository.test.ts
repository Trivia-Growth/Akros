import { describe, expect, it } from "vitest";
import { type LinhaProgramaSupabase, paraColunas, paraDominio } from "./SupabaseProgramaRepository";

const linha: LinhaProgramaSupabase = {
  id: "17171717-1717-1717-1717-171717171717",
  codigo: "eb2-niw",
  nome: "EB-2 NIW",
  categoria: "imigrante",
  sujeito: "individuo",
  versao: "2026.1",
  ativo: true,
  fases_template: [
    {
      id: "fase-1",
      ordem: 0,
      titulo: "Preparação",
      descricao: "Primeira fase",
      etapas: [],
    },
  ],
  documentos_exigidos: [],
};

describe("SupabaseProgramaRepository — mapeamento", () => {
  it("E13-S11 AC-1: converte JSONB snake_case para domínio", () => {
    const programa = paraDominio(linha);
    expect(programa).toMatchObject({
      id: linha.id,
      codigo: "eb2-niw",
      fasesTemplate: [{ titulo: "Preparação" }],
      documentosExigidos: [],
    });
  });

  it("E13-S11 AC-1: persiste todo template no contrato de colunas", () => {
    const colunas = paraColunas(paraDominio(linha));
    expect(colunas).toEqual({
      codigo: "eb2-niw",
      nome: "EB-2 NIW",
      categoria: "imigrante",
      sujeito: "individuo",
      versao: "2026.1",
      ativo: true,
      fases_template: linha.fases_template,
      documentos_exigidos: [],
    });
  });

  it("rejeita template remoto que não é lista", () => {
    expect(() => paraDominio({ ...linha, fases_template: {} as never })).toThrow(
      "template inválido",
    );
  });

  it("E03-S07 (US6)/ADR-0018: mapeia papelDirigido/envioConjunto/restrito de uma linha real", () => {
    const programa = paraDominio({
      ...linha,
      documentos_exigidos: [
        {
          id: "req-restrito",
          titulo: "Demonstrativo fiscal da organização",
          obrigatorio: true,
          papelDirigido: "organizacao_aplicante",
          envioConjunto: true,
          restrito: true,
        },
        {
          id: "req-comum",
          titulo: "Passaporte",
          obrigatorio: true,
        },
      ],
    });

    expect(programa.documentosExigidos[0]).toMatchObject({
      papelDirigido: "organizacao_aplicante",
      envioConjunto: true,
      restrito: true,
    });
    // Requisito sem os campos novos não ganha chaves com `undefined`/`false` artificiais —
    // ausente continua ausente.
    expect(programa.documentosExigidos[1]).not.toHaveProperty("papelDirigido");
    expect(programa.documentosExigidos[1]).not.toHaveProperty("envioConjunto");
    expect(programa.documentosExigidos[1]).not.toHaveProperty("restrito");
  });

  it("E03-S07 (US6)/ADR-0018: papelDirigido com valor fora do enum é descartado (dado externo não confiável)", () => {
    const programa = paraDominio({
      ...linha,
      documentos_exigidos: [
        {
          id: "req-invalido",
          titulo: "Documento qualquer",
          obrigatorio: true,
          papelDirigido: "papel-que-nao-existe",
        },
      ],
    });

    expect(programa.documentosExigidos[0]).not.toHaveProperty("papelDirigido");
  });

  it("E03-S07 (US6)/ADR-0018: paraColunas persiste o requisito restrito inteiro como JSONB", () => {
    const programa = paraDominio({
      ...linha,
      documentos_exigidos: [
        {
          id: "req-restrito",
          titulo: "Demonstrativo fiscal da organização",
          obrigatorio: true,
          papelDirigido: "organizacao_aplicante",
          envioConjunto: true,
          restrito: true,
        },
      ],
    });

    const colunas = paraColunas(programa);
    expect(colunas.documentos_exigidos[0]).toMatchObject({
      papelDirigido: "organizacao_aplicante",
      envioConjunto: true,
      restrito: true,
    });
  });

  it("normaliza a linha legada real sem usar seed ou mock", () => {
    const programa = paraDominio({
      ...linha,
      fases_template: [{ id: "fase-legada", ordem: 1, titulo: "Documentação" }],
      documentos_exigidos: [
        { tipo: "curriculo", titulo: "Currículo especializado", obrigatorio: true },
      ],
    });

    expect(programa.fasesTemplate).toEqual([
      expect.objectContaining({ id: "fase-legada", descricao: "", etapas: [] }),
    ]);
    expect(programa.documentosExigidos).toEqual([
      expect.objectContaining({
        faseTemplateId: "fase-legada",
        objetivo: "Currículo especializado",
        emitidoPor: "cliente",
      }),
    ]);
  });
});
