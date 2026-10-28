import { describe, expect, it } from "vitest";
import {
  PROVEDORES_TRANSCRICAO,
  type TranscricaoAudio,
  aceiteVale,
  exigeChave,
  passoDaTranscricao,
} from "./transcricao";

const config = (over: Partial<TranscricaoAudio> = {}): TranscricaoAudio => ({
  provedor: "groq",
  modelo: "whisper-large-v3-turbo",
  idioma: null,
  indicio: "abcd",
  ativa: false,
  aceiteEnvioEm: "2026-10-28T10:00:00Z",
  verificadaEm: null,
  ...over,
});

describe("transcrição de áudio — domínio", () => {
  it("um passo principal por estado: configurar, testar, ligar, ligada", () => {
    expect(passoDaTranscricao(null)).toBe("configurar");
    expect(passoDaTranscricao(config())).toBe("testar");
    expect(passoDaTranscricao(config({ verificadaEm: "2026-10-28T11:00:00Z" }))).toBe("ligar");
    expect(passoDaTranscricao(config({ verificadaEm: "2026-10-28T11:00:00Z", ativa: true }))).toBe(
      "ligada",
    );
  });

  it("sem aceite do envio de dados nunca é 'pronta para ligar', mesmo verificada", () => {
    expect(
      passoDaTranscricao(config({ verificadaEm: "2026-10-28T11:00:00Z", aceiteEnvioEm: null })),
    ).toBe("testar");
  });

  it("o aceite vale para UM provedor; outro provedor exige aceite e chave novos", () => {
    expect(aceiteVale(config(), "groq")).toBe(true);
    expect(aceiteVale(config(), "openrouter")).toBe(false);
    expect(aceiteVale(config({ aceiteEnvioEm: null }), "groq")).toBe(false);
    expect(aceiteVale(null, "groq")).toBe(false);
    expect(exigeChave(null, "groq")).toBe(true);
    expect(exigeChave(config(), "groq")).toBe(false);
    expect(exigeChave(config(), "openrouter")).toBe(true);
  });

  it("todo provedor tem o modelo padrão entre os oferecidos; a OpenAI não é oferecida", () => {
    for (const dados of Object.values(PROVEDORES_TRANSCRICAO)) {
      expect(dados.modelos).toContain(dados.modeloPadrao);
    }
    expect(Object.keys(PROVEDORES_TRANSCRICAO)).toEqual(["groq", "openrouter"]);
  });
});
