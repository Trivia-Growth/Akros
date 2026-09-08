import { describe, expect, it } from "vitest";
import { calcularDashboardAdmin } from "./SupabaseDashboardAdminConsulta";

describe("SupabaseDashboardAdminConsulta — agregação", () => {
  it("E13-S11 AC-3: não mistura moedas e conta fase atual por UUID", () => {
    const dados = calcularDashboardAdmin({
      leads: [{ estagio: "lead" }, { estagio: "fechado" }],
      clientes: [{ saude: "em_dia" }, { saude: "atrasado" }],
      jornadas: [{ fase_atual_id: "fase-1" }, { fase_atual_id: null }],
      fases: [{ id: "fase-1", titulo: "Estratégia" }],
      pagamentos: [
        { valor: "100", moeda: "BRL", status: "pago" },
        { valor: "200", moeda: "USD", status: "pendente" },
      ],
      reunioes: [
        { id: "reuniao-1", titulo: "Kick-off", inicio: "2026-09-05T12:00:00Z", status: "agendada" },
      ],
      eventos: [{ id: "evento-1", conteudo: "Fase liberada." }],
      pendencias: 3,
    });

    expect(dados.clientesPorFase).toEqual([
      { fase: "Estratégia", quantidade: 1 },
      { fase: "Sem fase ativa", quantidade: 1 },
    ]);
    expect(dados.receita).toEqual([
      { moeda: "BRL", pago: 100, pendente: 0, atrasado: 0 },
      { moeda: "USD", pago: 0, pendente: 200, atrasado: 0 },
    ]);
  });
});
