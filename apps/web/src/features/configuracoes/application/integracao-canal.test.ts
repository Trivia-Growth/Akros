import { describe, expect, it } from "vitest";
import {
  AGENTE_INICIAL,
  CANAL_INICIAL,
  FUNCAO_WEBHOOK,
  corpoDeSalvar,
  gerarTokenVerificacao,
  limparSegredos,
  urlWebhookConta,
} from "./integracao-canal";

const ID = "11111111-1111-4111-8111-111111111111";

describe("integracao-canal — corpo enviado a integracoes-ia-salvar", () => {
  it("Evolution: união por provedor, sem campos de Meta, chave só se digitada", () => {
    const corpo = corpoDeSalvar(
      {
        ...CANAL_INICIAL,
        identificador: " 5511999999999 ",
        baseUrl: "https://evo.exemplo.com",
        instancia: "akros",
        chaveEvolution: "  ",
        phoneNumberId: "999",
      },
      AGENTE_INICIAL,
    );
    expect(corpo.canal).toEqual({
      provedor: "evolution",
      nomeExibicao: "WhatsApp Akros",
      identificador: "5511999999999",
      ativa: true,
      baseUrl: "https://evo.exemplo.com",
      instancia: "akros",
    });
    expect(corpo.canal).not.toHaveProperty("apiKey");
    expect(corpo.canal).not.toHaveProperty("phoneNumberId");
  });

  it("WhatsApp oficial: ids e os três segredos quando digitados", () => {
    const corpo = corpoDeSalvar(
      {
        ...CANAL_INICIAL,
        provedor: "whatsapp_oficial",
        identificador: "+55 11 99999-9999",
        phoneNumberId: "123456789",
        wabaId: "987654321",
        accessToken: "EAAB-token",
        appSecret: "app-secret",
        verifyToken: "token-verificacao",
        baseUrl: "https://nao-deve-ir.com",
      },
      AGENTE_INICIAL,
    );
    expect(corpo.canal).toMatchObject({
      provedor: "whatsapp_oficial",
      phoneNumberId: "123456789",
      wabaId: "987654321",
      accessToken: "EAAB-token",
      appSecret: "app-secret",
      verifyToken: "token-verificacao",
    });
    expect(corpo.canal).not.toHaveProperty("baseUrl");
  });

  it("Instagram: só igAccountId; segredos em branco ficam de fora (mantém os do cofre)", () => {
    const corpo = corpoDeSalvar(
      {
        ...CANAL_INICIAL,
        provedor: "instagram",
        contaId: ID,
        igAccountId: "17841400000000001",
        identificador: "akros",
      },
      { ...AGENTE_INICIAL, agenteId: ID },
    );
    expect(corpo.canal).toEqual({
      provedor: "instagram",
      contaId: ID,
      nomeExibicao: "WhatsApp Akros",
      identificador: "akros",
      ativa: true,
      igAccountId: "17841400000000001",
    });
    expect(corpo.agente).toMatchObject({ agenteId: ID, ativo: false });
    expect(corpo.agente).not.toHaveProperty("apiKeyOpenRouter");
  });

  it("agente: chave OpenRouter só se digitada, textos aparados", () => {
    const corpo = corpoDeSalvar(CANAL_INICIAL, {
      ...AGENTE_INICIAL,
      nomeAgente: " Ana ",
      chaveOpenRouter: " sk-or-1 ",
    });
    expect(corpo.agente).toMatchObject({ nome: "Ana", apiKeyOpenRouter: "sk-or-1" });
  });

  it("limparSegredos zera as credenciais digitadas, preserva o token de verificação (aperto de mão da Meta) e o resto", () => {
    const limpo = limparSegredos({
      ...CANAL_INICIAL,
      chaveEvolution: "a",
      accessToken: "b",
      appSecret: "c",
      verifyToken: "d",
      nomeConta: "Conta",
    });
    expect([limpo.chaveEvolution, limpo.accessToken, limpo.appSecret]).toEqual(["", "", ""]);
    expect(limpo.verifyToken).toBe("d");
    expect(limpo.nomeConta).toBe("Conta");
  });
});

describe("integracao-canal — endereço do webhook e token de verificação", () => {
  it("monta a URL pública por provedor, sem barra duplicada", () => {
    expect(urlWebhookConta("https://p.supabase.co/", "whatsapp_oficial", ID)).toBe(
      `https://p.supabase.co/functions/v1/meta-whatsapp-webhook?conta=${ID}`,
    );
    expect(urlWebhookConta("https://p.supabase.co", "instagram", ID)).toContain(
      "meta-instagram-webhook",
    );
    expect(urlWebhookConta("https://p.supabase.co", "evolution", ID)).toContain(
      "evolution-webhook",
    );
  });

  it("sem URL do projeto ou sem conta não inventa endereço", () => {
    expect(urlWebhookConta(undefined, "instagram", ID)).toBeNull();
    expect(urlWebhookConta("https://p.supabase.co", "instagram", "")).toBeNull();
  });

  it("os nomes das functions batem com os do servidor", () => {
    expect(FUNCAO_WEBHOOK).toEqual({
      evolution: "evolution-webhook",
      whatsapp_oficial: "meta-whatsapp-webhook",
      instagram: "meta-instagram-webhook",
    });
  });

  it("gera token hexadecimal de 32 caracteres, diferente a cada chamada, aceito pelo servidor", () => {
    const a = gerarTokenVerificacao();
    const b = gerarTokenVerificacao();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
});
