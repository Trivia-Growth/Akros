import { describe, expect, it } from "vitest";
import { paraConversa, paraEmail } from "./SupabaseComunicacaoAdminConsulta";

describe("SupabaseComunicacaoAdminConsulta — mapeamento", () => {
  it("E13-S11 AC-3: preserva UUID e descarta mensagens JSONB inválidas", () => {
    expect(
      paraConversa({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: "22222222-2222-2222-2222-222222222222",
        cliente_nome: "Cliente",
        canal: "whatsapp_oficial",
        mensagens: [
          {
            id: "mensagem-1",
            autor: "cliente",
            texto: "Olá",
            enviadoEm: "2026-09-05T12:00:00Z",
            lida: false,
          },
          { texto: "incompleta" },
        ],
        atendido_por_ia: true,
        custo_ia: "0.0310",
      }),
    ).toMatchObject({
      clienteId: "22222222-2222-2222-2222-222222222222",
      custoIA: 0.031,
      mensagens: [{ id: "mensagem-1" }],
    });
  });

  it("E13-S15: conversa não identificada e anexos (baixado, não baixado, vídeo, anexo inválido)", () => {
    const base = {
      id: "11111111-1111-1111-1111-111111111111",
      cliente_id: null,
      cliente_nome: "Contato não identificado",
      canal: "evolution" as const,
      atendido_por_ia: false,
      custo_ia: null,
    };
    const msg = (id: string, extra: Record<string, unknown>) => ({
      id,
      autor: "cliente",
      texto: "",
      enviadoEm: "2026-10-27T12:00:00Z",
      lida: false,
      ...extra,
    });
    const conversa = paraConversa({
      ...base,
      identificacao: "nao_identificada",
      mensagens: [
        msg("m1", {
          tipo: "arquivo",
          midiaNome: "contrato.pdf",
          anexo: { caminho: "c/m1", mime: "application/pdf", tamanhoBytes: 2048, baixado: true },
        }),
        msg("m2", {
          tipo: "imagem",
          anexo: {
            caminho: "c/forjado",
            mime: "image/jpeg",
            tamanhoBytes: 99,
            baixado: false,
            motivo: "tamanho",
          },
        }),
        msg("m3", {
          tipo: "video",
          anexo: { mime: "video/mp4", tamanhoBytes: null, baixado: false, motivo: "download" },
        }),
        msg("m4", { tipo: "arquivo", anexo: { mime: 42, baixado: "sim" } }),
      ],
    });
    expect(conversa.identificacao).toBe("nao_identificada");
    expect(conversa.clienteId).toBeUndefined();
    const [m1, m2, m3, m4] = conversa.mensagens;
    expect(m1.anexo).toEqual({
      caminho: "c/m1",
      mime: "application/pdf",
      tamanhoBytes: 2048,
      baixado: true,
    });
    expect(m2.anexo).toEqual({
      mime: "image/jpeg",
      tamanhoBytes: 99,
      baixado: false,
      motivo: "tamanho",
    });
    expect(m2.anexo).not.toHaveProperty("caminho");
    expect([m3.tipo, m3.anexo?.motivo]).toEqual(["video", "download"]);
    expect(m4.anexo).toBeUndefined();
  });

  it("ADR-0022: lê a marca de transcrição do áudio; estado ou forma inválidos são ignorados", () => {
    const conversa = paraConversa({
      id: "11111111-1111-1111-1111-111111111111",
      cliente_id: "22222222-2222-2222-2222-222222222222",
      cliente_nome: "Maria",
      canal: "evolution",
      atendido_por_ia: false,
      custo_ia: null,
      mensagens: [
        {
          id: "a1",
          autor: "cliente",
          texto: "quero marcar uma consulta",
          enviadoEm: "2026-10-28T12:00:00Z",
          lida: false,
          tipo: "audio",
          anexo: {
            caminho: "c/a1",
            mime: "audio/ogg",
            tamanhoBytes: 9000,
            baixado: true,
            // provedor e modelo ficam no banco, não na tela: o parser só leva o que a tela usa
            transcricao: {
              estado: "concluida",
              provedor: "groq",
              modelo: "whisper-large-v3-turbo",
            },
          },
        },
        {
          id: "a2",
          autor: "cliente",
          texto: "",
          enviadoEm: "2026-10-28T12:01:00Z",
          lida: false,
          tipo: "audio",
          anexo: {
            caminho: "c/a2",
            mime: "audio/ogg",
            tamanhoBytes: 9000,
            baixado: true,
            transcricao: { estado: "falhou", motivo: "provedor_indisponivel" },
          },
        },
        {
          id: "a3",
          autor: "cliente",
          texto: "",
          enviadoEm: "2026-10-28T12:02:00Z",
          lida: false,
          tipo: "audio",
          anexo: {
            mime: "audio/ogg",
            tamanhoBytes: 1,
            baixado: false,
            transcricao: { estado: "inventado" },
          },
        },
        {
          id: "a4",
          autor: "cliente",
          texto: "",
          enviadoEm: "2026-10-28T12:03:00Z",
          lida: false,
          tipo: "audio",
          anexo: { mime: "audio/ogg", tamanhoBytes: 1, baixado: false, transcricao: "concluida" },
        },
      ],
    });
    const [a1, a2, a3, a4] = conversa.mensagens;
    expect(a1.anexo?.transcricao).toEqual({ estado: "concluida" });
    expect(a2.anexo?.transcricao).toEqual({ estado: "falhou", motivo: "provedor_indisponivel" });
    expect(a3.anexo).not.toHaveProperty("transcricao");
    expect(a4.anexo).not.toHaveProperty("transcricao");
  });

  it("conversa sem a coluna nova continua 'identificada'", () => {
    expect(
      paraConversa({
        id: "1",
        cliente_id: null,
        cliente_nome: "x",
        canal: "evolution",
        mensagens: [],
        atendido_por_ia: false,
        custo_ia: null,
      }).identificacao,
    ).toBe("identificada");
  });

  it("normaliza thread sem vínculo e mensagens de e-mail inválidas", () => {
    expect(
      paraEmail({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: null,
        cliente_nome: null,
        conta_email_id: null,
        assunto: "Assunto",
        mensagens: [
          {
            id: "email-1",
            de: "a@b.com",
            corpo: "Olá",
            recebidoEm: "2026-09-05T12:00:00Z",
            direcao: "entrada",
            lida: true,
          },
        ],
      }),
    ).toMatchObject({ assunto: "Assunto", contaEmailId: "", mensagens: [{ id: "email-1" }] });
  });
});
