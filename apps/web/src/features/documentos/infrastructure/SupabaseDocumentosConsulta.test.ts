import { describe, expect, it } from "vitest";
import { paraDocumento, paraSolicitacaoAssinatura } from "./SupabaseDocumentosConsulta";

describe("SupabaseDocumentosConsulta — mapeamento", () => {
  it("E13-S11 AC-2: preserva UUID e JSONB de análise válido", () => {
    expect(
      paraDocumento({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: "22222222-2222-2222-2222-222222222222",
        fase_id: "33333333-3333-3333-3333-333333333333",
        nome: "Currículo.pdf",
        tipo: "curriculo",
        status: "em_analise",
        url_mock: null,
        enviado_em: "2026-09-05T12:00:00Z",
        requisito_id: "requisito-curriculo",
        analise: {
          tipoDetectado: "curriculo",
          tipoEsperado: "curriculo",
          aderencia: "atende_com_ressalva",
          confianca: 0.8,
          lacunas: [{ descricao: "Incluir publicação", gravidade: "recomendada" }],
          sugestoes: ["Completar seção"],
          analisadoEm: "2026-09-05T12:01:00Z",
          motor: "avaliador-v1",
        },
        enviado_apesar_do_alerta: false,
        decisao: null,
      }),
    ).toMatchObject({
      clienteId: "22222222-2222-2222-2222-222222222222",
      faseId: "33333333-3333-3333-3333-333333333333",
      analise: { lacunas: [{ gravidade: "recomendada" }] },
    });
  });

  it("descarta JSONB inválido e normaliza assinatura", () => {
    expect(
      paraDocumento({
        id: "11111111-1111-1111-1111-111111111111",
        cliente_id: "22222222-2222-2222-2222-222222222222",
        fase_id: null,
        nome: "Contrato.pdf",
        tipo: "contrato",
        status: "pendente",
        url_mock: null,
        enviado_em: null,
        requisito_id: null,
        analise: { aderencia: "invalida" },
        enviado_apesar_do_alerta: null,
        decisao: null,
      }),
    ).not.toHaveProperty("analise");
    expect(
      paraSolicitacaoAssinatura({
        id: "44444444-4444-4444-4444-444444444444",
        documento_id: "11111111-1111-1111-1111-111111111111",
        status: "assinado",
        assinado_por: "Cliente",
        assinado_em: "2026-09-05T12:00:00Z",
      }),
    ).toMatchObject({
      documentoId: "11111111-1111-1111-1111-111111111111",
      assinadoPor: "Cliente",
    });
  });
});
