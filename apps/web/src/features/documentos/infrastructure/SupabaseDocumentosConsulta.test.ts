import { describe, expect, it } from "vitest";
import { paraDocumento, paraSolicitacaoAssinatura } from "./SupabaseDocumentosConsulta";

describe("SupabaseDocumentosConsulta — invariante de visibilidade por papel (T051, US6/ADR-0018)", () => {
  // Prova que `paraDocumento` não esconde nem revela nada por conta própria: a mesma linha
  // "restrita" mapeia exatamente igual, não importa quem a esteja lendo. Isso é o que garante
  // que `carregarCliente()` (que não filtra nada em JavaScript) pode confiar inteiramente na RLS
  // de `documentos.documentos` (policy `participante_ve_documento_do_caso_no_seu_papel`,
  // migration 0019): se o Postgres já não devolveu a linha pro PostgREST, `paraDocumento` nunca
  // chega a vê-la; se devolveu, é porque a RLS já autorizou — não há um segundo portão aqui.
  const linhaRestrita = {
    id: "11111111-1111-1111-1111-111111111111",
    cliente_id: "22222222-2222-2222-2222-222222222222",
    fase_id: null,
    nome: "Demonstrativo fiscal da organização",
    tipo: "outro" as const,
    status: "pendente" as const,
    url_mock: null,
    enviado_em: null,
    requisito_id: "requisito-fiscal-organizacao",
    analise: null,
    enviado_apesar_do_alerta: null,
    decisao: null,
  };

  it("mapeia a mesma linha da mesma forma, sem lógica própria de papel/restrição — a marca de restrição não existe no DTO retornado ao cliente, só na RLS do servidor", () => {
    const documento = paraDocumento(linhaRestrita);
    expect(documento).toMatchObject({
      id: linhaRestrita.id,
      clienteId: linhaRestrita.cliente_id,
      requisitoId: linhaRestrita.requisito_id,
    });
    // `restritoAoPapel`/`papelDirigido` (colunas de controle da RLS, migration 0019) não fazem
    // parte do shape de `Documento` (domain/types.ts) nem de `paraDocumento` — não há como este
    // mapeamento decidir "esconder" ou "revelar" um campo por papel, porque ele não enxerga essas
    // colunas. Se um dia alguém adicionar essas colunas ao SELECT/DTO para decidir visibilidade
    // NO CLIENTE, este teste para de proteger a invariante — é o sinal de que a regra migrou
    // para o lugar errado.
    expect(documento).not.toHaveProperty("restritoAoPapel");
    expect(documento).not.toHaveProperty("papelDirigido");
  });
});

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
