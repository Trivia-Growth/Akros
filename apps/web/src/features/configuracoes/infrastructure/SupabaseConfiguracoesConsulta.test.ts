import { describe, expect, it } from "vitest";
import { paraContaAgenda } from "./SupabaseConfiguracoesConsulta";

describe("SupabaseConfiguracoesConsulta — contrato público", () => {
  it("E13-S11 AC-1: mapeia uma conta sem expor segredo", () => {
    const conta = paraContaAgenda(
      {
        id: "17171717-1717-1717-1717-171717171717",
        provedor: "google",
        nome_exibicao: "Agenda Akros",
        ativa: true,
        conectado_em: "2026-09-05T00:00:00Z",
        escopos: ["agenda", "email"],
        dono_id: "18181818-1818-1818-1818-181818181818",
        email_endereco: "agenda@example.com",
        pasta_raiz: null,
        credenciais_configuradas: true,
        metadados_publicos: { clientId: "public-client", calendarId: "agenda@example.com" },
      },
      ["19191919-1919-1919-1919-191919191919"],
    );

    expect(conta).toMatchObject({
      nomeExibicao: "Agenda Akros",
      compartilhadoComIds: ["19191919-1919-1919-1919-191919191919"],
      credenciais: {
        provedor: "google",
        dados: { clientId: "public-client", calendarId: "agenda@example.com" },
      },
    });
    expect(conta.credenciais.dados).not.toHaveProperty("clientSecretFinal");
    expect(conta.credenciais.dados).not.toHaveProperty("refreshTokenFinal");
  });
});
