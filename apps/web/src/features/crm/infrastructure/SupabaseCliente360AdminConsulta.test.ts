import { describe, expect, it } from "vitest";
import { paraCliente360, recomporJornadasAdmin } from "./SupabaseCliente360AdminConsulta";

describe("SupabaseCliente360AdminConsulta — UUIDs reais", () => {
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
