import { describe, expect, it } from "vitest";
import {
  paraCliente360,
  paraContrato,
  recomporJornadasAdmin,
} from "./SupabaseCliente360AdminConsulta";

describe("SupabaseCliente360AdminConsulta — UUIDs reais", () => {
  it("preserva origem e conferência da situação importada", () => {
    const jornadas = recomporJornadasAdmin({
      jornadas: [
        {
          id: "jornada-a",
          cliente_id: "cliente-a",
          fase_atual_id: null,
          programa_id: null,
          programa_versao: null,
          origem_situacao_inicial: "importado",
          conferido_por: "admin-a",
          conferido_em: "2026-10-27T12:00:00Z",
        },
      ],
      fases: [],
      etapas: [],
    });
    expect(jornadas[0]).toMatchObject({
      origemSituacaoInicial: "importado",
      conferidoPor: "admin-a",
      conferidoEm: "2026-10-27T12:00:00Z",
    });
  });

  it("E13-S11 AC-3: preserva UUID remoto sem mapa de fixture", () => {
    expect(
      paraCliente360({
        id: "11111111-1111-1111-1111-111111111111",
        lead_origem_id: null,
        nome: "Ana",
        email: "ana@example.com",
        telefone: "+55 11 99999-9999",
        tipo_visto: "EB-2 NIW",
        case_manager: "Akros",
        saude: "em_dia",
        programa_id: null,
        programa_versao: null,
        pasta_drive_nome: null,
        perfil_imigratorio: null,
        created_at: "2026-09-05T12:00:00Z",
      }),
    ).toMatchObject({ id: "11111111-1111-1111-1111-111111111111", nome: "Ana" });
  });

  it("recompõe fases e etapas somente da jornada UUID correspondente", () => {
    const jornadas = recomporJornadasAdmin({
      jornadas: [
        {
          id: "jornada-a",
          cliente_id: "cliente-a",
          fase_atual_id: "fase-a",
          programa_id: null,
          programa_versao: null,
        },
      ],
      fases: [
        {
          id: "fase-a",
          jornada_id: "jornada-a",
          ordem: 1,
          titulo: "Estratégia",
          descricao: "",
          status: "em_andamento",
        },
        {
          id: "fase-b",
          jornada_id: "jornada-b",
          ordem: 1,
          titulo: "Outra",
          descricao: "",
          status: "bloqueada",
        },
      ],
      etapas: [
        {
          id: "etapa-a",
          fase_id: "fase-a",
          titulo: "Documento",
          descricao: "",
          status: "pendente",
          prazo_medio_dias_uteis: null,
          documentos_requeridos: null,
          responsavel: "cliente",
          responsavel_detalhe: null,
          desde_em: null,
          iniciada_em: null,
          concluida_real_em: null,
        },
      ],
    });

    expect(jornadas).toHaveLength(1);
    expect(jornadas[0]?.fases).toMatchObject([{ id: "fase-a", etapas: [{ id: "etapa-a" }] }]);
  });
});

// E03-S07/T036-T041 — achado da revisão adversarial: paraContrato não tinha teste próprio (a
// tela cobre só via smoke test, que mocka o hook e nunca exercita este mapeamento snake→camel
// nem o filtro/ordenação de condições).
describe("SupabaseCliente360AdminConsulta — paraContrato", () => {
  const linhaContrato = {
    id: "contrato-a",
    cliente_id: "cliente-a",
    programa_id: "eb2-niw",
    programa_versao: "v1",
    assinado_em: null,
    prazo_resposta_dias_uteis: 30,
    prioridade: "padrao" as const,
    observacao: null,
    registrado_por: "admin-1",
    registrado_em: "2026-10-01T12:00:00Z",
    ativo: true,
  };

  it("mapeia snake_case para o domínio e filtra condições só deste contrato, ordenadas por `ordem`", () => {
    const condicoes = [
      {
        id: "condicao-2",
        contrato_id: "contrato-a",
        descricao: "Segunda parcela",
        tipo: "parcela" as const,
        valor: 2000,
        moeda: "BRL" as const,
        vencimento: "2026-12-01",
        ordem: 2,
      },
      {
        id: "condicao-outro-contrato",
        contrato_id: "contrato-b",
        descricao: "Não deveria aparecer",
        tipo: "entrada" as const,
        valor: 999,
        moeda: "BRL" as const,
        vencimento: "2026-11-01",
        ordem: 1,
      },
      {
        id: "condicao-1",
        contrato_id: "contrato-a",
        descricao: "Entrada",
        tipo: "entrada" as const,
        valor: 1000,
        moeda: "BRL" as const,
        vencimento: "2026-11-01",
        ordem: 1,
      },
    ];

    const contrato = paraContrato(linhaContrato, condicoes);

    expect(contrato).toMatchObject({
      id: "contrato-a",
      clienteId: "cliente-a",
      programaId: "eb2-niw",
      programaVersao: "v1",
      prazoRespostaDiasUteis: 30,
      prioridade: "padrao",
      registradoPor: "admin-1",
      ativo: true,
    });
    expect(contrato.assinadoEm).toBeUndefined();
    expect(contrato.observacao).toBeUndefined();
    // Só as condições de "contrato-a" entram, e na ordem de `ordem` (1, depois 2) — não na
    // ordem em que vieram do banco.
    expect(contrato.condicoes).toHaveLength(2);
    expect(contrato.condicoes.map((c) => c.id)).toEqual(["condicao-1", "condicao-2"]);
  });

  it("devolve lista de condições vazia quando nenhuma condição referencia o contrato", () => {
    const contrato = paraContrato(linhaContrato, []);
    expect(contrato.condicoes).toEqual([]);
  });

  it("preserva campos opcionais quando presentes (assinadoEm, observacao)", () => {
    const contrato = paraContrato(
      { ...linhaContrato, assinado_em: "2026-10-05", observacao: "Cliente prioritário" },
      [],
    );
    expect(contrato.assinadoEm).toBe("2026-10-05");
    expect(contrato.observacao).toBe("Cliente prioritário");
  });
});
