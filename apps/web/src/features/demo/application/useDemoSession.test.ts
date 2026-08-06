import { beforeEach, describe, expect, it } from "vitest";
import { PERSONA_PADRAO, useDemoSession } from "./useDemoSession";

describe("useDemoSession (E05-S01)", () => {
  beforeEach(() => {
    useDemoSession.setState({
      personaId: PERSONA_PADRAO,
      papel: "cliente",
      cenarioAtivo: "padrao",
    });
  });

  it("AC-2: setPersona troca a persona ativa", () => {
    useDemoSession.getState().setPersona("cliente-renata");
    expect(useDemoSession.getState().personaId).toBe("cliente-renata");
  });

  it("AC-3: setPapel alterna entre cliente e admin", () => {
    expect(useDemoSession.getState().papel).toBe("cliente");
    useDemoSession.getState().setPapel("admin");
    expect(useDemoSession.getState().papel).toBe("admin");
  });

  it("estado inicial usa a persona padrão", () => {
    expect(useDemoSession.getState().personaId).toBe(PERSONA_PADRAO);
  });
});
