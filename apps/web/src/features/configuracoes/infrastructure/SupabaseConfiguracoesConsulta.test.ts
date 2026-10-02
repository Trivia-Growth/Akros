import { describe, expect, it } from "vitest";
import { paraContaAgenda, paraContaCanal } from "./SupabaseConfiguracoesConsulta";

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

describe("SupabaseConfiguracoesConsulta — contas de canal (E13-S13)", () => {
  const base = {
    id: "17171717-1717-4717-8717-171717171717",
    nome_exibicao: "Canal",
    identificador: "x",
    ativa: true,
    conectado_em: "2026-10-01T00:00:00Z",
    credenciais_configuradas: true,
  };

  it("WhatsApp oficial expõe só ids públicos", () => {
    const conta = paraContaCanal({
      ...base,
      provedor: "whatsapp_oficial",
      metadados_publicos: { phoneNumberId: "222", wabaId: "111" },
    });
    expect(conta.meta).toEqual({
      phoneNumberId: "222",
      wabaId: "111",
      credenciaisConfiguradas: true,
    });
    expect(conta.evolution).toBeUndefined();
  });

  it("Instagram expõe o id da conta", () => {
    const conta = paraContaCanal({
      ...base,
      provedor: "instagram",
      metadados_publicos: { igAccountId: "17841" },
    });
    expect(conta.meta).toEqual({ igAccountId: "17841", credenciaisConfiguradas: true });
  });

  it("metadados incompletos não inventam dados e Evolution segue como antes", () => {
    expect(
      paraContaCanal({ ...base, provedor: "whatsapp_oficial", metadados_publicos: { wabaId: "1" } })
        .meta,
    ).toBeUndefined();
    const evo = paraContaCanal({
      ...base,
      provedor: "evolution",
      metadados_publicos: { baseUrl: "https://e.com", instancia: "i" },
    });
    expect(evo.evolution).toEqual({
      baseUrl: "https://e.com",
      instancia: "i",
      credenciaisConfiguradas: true,
    });
  });
});
