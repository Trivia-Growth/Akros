import { describe, expect, it } from "vitest";
import { calcularOperacaoAdmin } from "./SupabaseOperacaoAdminConsulta";

describe("SupabaseOperacaoAdminConsulta — agregação", () => {
  it("E13-S11 AC-3: agrega UUIDs reais por título/responsável, não por ID mock", () => {
    const dados = calcularOperacaoAdmin({
      clientes: [
        { id: "cliente-a", nome: "Ana" },
        { id: "cliente-b", nome: "Bruno" },
      ],
      jornadas: [
        { id: "jornada-a", cliente_id: "cliente-a" },
        { id: "jornada-b", cliente_id: "cliente-b" },
      ],
      fases: [
        { id: "fase-a", jornada_id: "jornada-a" },
        { id: "fase-b", jornada_id: "jornada-b" },
      ],
      etapas: [
        {
          fase_id: "fase-a",
          titulo: "Coletar documentos",
          responsavel: "cliente",
          status: "pendente",
          prazo_medio_dias_uteis: 5,
          desde_em: "2026-08-01T00:00:00Z",
        },
        {
          fase_id: "fase-b",
          titulo: "Coletar documentos",
          responsavel: "cliente",
          status: "pendente",
          prazo_medio_dias_uteis: 5,
          desde_em: "2026-08-11T00:00:00Z",
        },
      ],
      eventosEntrada: [{ cliente_id: "cliente-a", ocorrido_em: "2026-08-01T00:00:00Z" }],
      agora: new Date("2026-09-01T00:00:00Z"),
    });

    expect(dados.gargalos).toEqual([
      { titulo: "Coletar documentos", responsavel: "cliente", casos: 2, mediaDias: 26 },
    ]);
    expect(dados.alertas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clienteId: "cliente-a",
          clienteNome: "Ana",
          tipo: "inatividade",
          dias: 31,
        }),
        expect.objectContaining({
          clienteId: "cliente-a",
          tipo: "etapa_travada",
          etapaTitulo: "Coletar documentos",
        }),
      ]),
    );
  });
});
