import { describe, expect, it } from "vitest";
import { paraReuniao, paraTranscricao } from "./SupabaseAgendaConsulta";

describe("SupabaseAgendaConsulta — mapeamento", () => {
  it("E13-S11 AC-2: preserva UUID do cliente em reunião real", () => {
    expect(
      paraReuniao({
        id: "17171717-1717-1717-1717-171717171717",
        cliente_id: "18181818-1818-1818-1818-181818181818",
        titulo: "Kick-off",
        inicio: "2026-09-05T12:00:00Z",
        fim: "2026-09-05T12:30:00Z",
        canal: "calendly",
        status: "agendada",
        criada_por: null,
      }),
    ).toMatchObject({
      clienteId: "18181818-1818-1818-1818-181818181818",
      canal: "calendly",
      status: "agendada",
    });
  });

  it("normaliza action_items nulo para lista vazia", () => {
    expect(
      paraTranscricao({
        id: "19191919-1919-1919-1919-191919191919",
        reuniao_id: "17171717-1717-1717-1717-171717171717",
        texto: "Transcrição",
        resumo: "Resumo",
        action_items: null,
        provedor: "fireflies",
        created_at: "2026-09-05T12:30:00Z",
      }),
    ).toMatchObject({ actionItems: [], criadoEm: "2026-09-05T12:30:00Z" });
  });
});
