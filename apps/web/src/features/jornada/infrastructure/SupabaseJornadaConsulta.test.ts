import { describe, expect, it } from "vitest";
import { paraJornada } from "./SupabaseJornadaConsulta";

describe("SupabaseJornadaConsulta — mapeamento", () => {
  it("E13-S11 AC-2: preserva UUIDs e converte relações normalizadas no agregado", () => {
    const jornada = paraJornada(
      {
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: "22222222-2222-2222-2222-222222222222",
        fase_atual_id: "33333333-3333-3333-3333-333333333333",
        programa_id: "eb2-niw",
        programa_versao: "2026.1",
      },
      [
        {
          id: "33333333-3333-3333-3333-333333333333",
          jornada_id: "11111111-1111-1111-1111-111111111111",
          ordem: 1,
          titulo: "Evidências",
          descricao: "Reunir provas",
          status: "em_andamento",
        },
      ],
      [
        {
          id: "44444444-4444-4444-4444-444444444444",
          fase_id: "33333333-3333-3333-3333-333333333333",
          titulo: "Currículo",
          descricao: "Enviar currículo",
          status: "pendente",
          prazo_medio_dias_uteis: 5,
          documentos_requeridos: ["curriculo"],
          responsavel: "cliente",
          responsavel_detalhe: null,
          desde_em: "2026-09-01T12:00:00Z",
          iniciada_em: null,
          concluida_real_em: null,
        },
      ],
    );

    expect(jornada).toMatchObject({
      clienteId: "22222222-2222-2222-2222-222222222222",
      faseAtualId: "33333333-3333-3333-3333-333333333333",
      programaId: "eb2-niw",
      fases: [
        {
          etapas: [
            {
              id: "44444444-4444-4444-4444-444444444444",
              responsavel: "cliente",
              documentosRequeridos: ["curriculo"],
            },
          ],
        },
      ],
    });
  });

  it("normaliza fase atual e campos opcionais nulos", () => {
    expect(
      paraJornada(
        {
          id: "11111111-1111-1111-1111-111111111111",
          cliente_id: "22222222-2222-2222-2222-222222222222",
          fase_atual_id: null,
          programa_id: null,
          programa_versao: null,
        },
        [],
        [],
      ),
    ).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      clienteId: "22222222-2222-2222-2222-222222222222",
      faseAtualId: "",
      fases: [],
    });
  });
});
