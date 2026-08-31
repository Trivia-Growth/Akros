import { describe, expect, it } from "vitest";
import { type EventoErro, limparTexto, montarEvento } from "./sanitizar";

describe("sanitizar telemetria (E16-S01 AC-4)", () => {
  it("AC-4: remove e-mail, telefone, documento e token do texto livre", () => {
    const sujo =
      "falha ao salvar joao.silva@example.com, cpf 123.456.789-00, tel (11) 98765-4321, " +
      "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-def_123";
    const limpo = limparTexto(sujo);

    expect(limpo).not.toMatch(/joao\.silva@example\.com/);
    expect(limpo).not.toMatch(/123\.456\.789-00/);
    expect(limpo).not.toMatch(/98765-4321/);
    expect(limpo).not.toMatch(/eyJhbGciOi/);
    expect(limpo).toContain("[email]");
    expect(limpo).toContain("[documento]");
    expect(limpo).toContain("[telefone]");
    expect(limpo).toContain("[token]");
  });

  it("AC-4: o evento é montado por lista de permissão — campo extra não vaza", () => {
    const erro = Object.assign(new Error("boom"), {
      // Campo que alguém pendurou no erro. Um spread levaria junto.
      dadosDoCliente: { email: "vitima@example.com", cpf: "123.456.789-00" },
    });

    const evento = montarEvento({ erro, area: "o portal", rota: "/portal" });
    const chaves = Object.keys(evento).sort();

    expect(chaves).toEqual(
      [
        "area",
        "mensagem",
        "nome",
        "papel",
        "quando",
        "rota",
        "stack",
        "usuarioId",
        "userAgent",
      ].sort(),
    );
    expect(JSON.stringify(evento)).not.toContain("vitima@example.com");
    expect(JSON.stringify(evento)).not.toContain("dadosDoCliente");
  });

  it("AC-4: a rota perde query e fragmento, que carregam id e token", () => {
    const evento = montarEvento({
      erro: new Error("x"),
      area: "o admin",
      rota: "/admin/clientes?id=uuid-do-cliente&token=abc#secao",
    });
    expect(evento.rota).toBe("/admin/clientes");
  });

  it("mensagem de erro sem PII passa intacta — a varredura não destrói contexto útil", () => {
    const evento = montarEvento({
      erro: new TypeError("Cannot read properties of undefined (reading 'fases')"),
      area: "o portal",
      rota: "/portal/jornada",
    });
    expect(evento.mensagem).toBe("Cannot read properties of undefined (reading 'fases')");
    expect(evento.nome).toBe("TypeError");
  });

  it("aceita valor lançado que não é Error", () => {
    const evento: EventoErro = montarEvento({ erro: "string solta", area: "o site", rota: "/" });
    expect(evento.mensagem).toBe("string solta");
    expect(evento.nome).toBe("Error");
  });
});
