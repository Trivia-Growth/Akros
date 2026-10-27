// E03-S07 (T034) — cobre o adapter de `CasoComandos` contra a Edge Function `caso-comandos`:
// sucesso traduzindo a linha snake_case devolvida pela RPC, e os quatro formatos de erro que o
// servidor pode devolver (403/422/409 com `{erro}`, e falha de rede sem `error.context`).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CasoComandoError } from "../application/ports";
import { SupabaseCasoComandos } from "./SupabaseCasoComandos";

/** `toMatchObject` com uma instância de Error só compara as chaves enumeráveis do padrão — e
 *  `message` não é enumerável em instâncias de Error/subclasses. Por isso os testes de erro
 *  abaixo usam este helper (status + message explícitos) em vez de comparar contra uma
 *  instância de `CasoComandoError`, que deixaria `message` passar sem checar de verdade. */
async function esperarCasoComandoError(
  promessa: Promise<unknown>,
  status: number,
  message: string,
) {
  await expect(promessa).rejects.toBeInstanceOf(CasoComandoError);
  await promessa.catch((erro: unknown) => {
    expect((erro as CasoComandoError).status).toBe(status);
    expect((erro as CasoComandoError).message).toBe(message);
  });
}

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/shared/supabase/client", () => ({
  getSupabase: () => ({ functions: { invoke } }),
}));

function respostaDeErro(status: number, erro: string) {
  return new Response(JSON.stringify({ erro }), { status });
}

describe("SupabaseCasoComandos", () => {
  beforeEach(() => invoke.mockReset());

  describe("registrarContrato", () => {
    const input = {
      clienteId: "11111111-1111-4111-8111-111111111111",
      programaId: "eb2-niw",
      programaVersao: "2026-01",
      prazoRespostaDiasUteis: 15,
      prioridade: "padrao" as const,
      observacao: "observação de teste",
      condicoes: [
        {
          descricao: "Entrada",
          tipo: "entrada" as const,
          valor: 1000,
          moeda: "USD" as const,
          vencimento: "2026-11-01",
          ordem: 0,
        },
      ],
      idempotencyKey: "idem-contrato-1",
    };

    it("chama a Edge Function com o header CSRF e todos os campos do input, e traduz a linha devolvida", async () => {
      invoke.mockResolvedValue({
        data: {
          id: "22222222-2222-4222-8222-222222222222",
          cliente_id: input.clienteId,
          programa_id: input.programaId,
          programa_versao: input.programaVersao,
          assinado_em: null,
          prazo_resposta_dias_uteis: input.prazoRespostaDiasUteis,
          prioridade: input.prioridade,
          observacao: input.observacao,
          registrado_por: "33333333-3333-4333-8333-333333333333",
          registrado_em: "2026-10-15T12:00:00.000Z",
          substitui_contrato_id: null,
          ativo: true,
        },
        error: null,
      });

      const contrato = await new SupabaseCasoComandos().registrarContrato(input);

      expect(invoke).toHaveBeenCalledWith("caso-comandos", {
        headers: { "x-akros-csrf": "1" },
        body: { acao: "registrar_contrato", ...input },
      });
      expect(contrato).toMatchObject({
        id: "22222222-2222-4222-8222-222222222222",
        clienteId: input.clienteId,
        programaId: input.programaId,
        programaVersao: input.programaVersao,
        prazoRespostaDiasUteis: input.prazoRespostaDiasUteis,
        prioridade: "padrao",
        observacao: input.observacao,
        registradoPor: "33333333-3333-4333-8333-333333333333",
        ativo: true,
      });
    });

    it("erro 403 do servidor vira CasoComandoError com status 403 e a mensagem real", async () => {
      invoke.mockResolvedValue({
        data: null,
        error: Object.assign(new Error("Edge Function returned a non-2xx status code"), {
          context: respostaDeErro(403, "Operação não autorizada"),
        }),
      });

      await esperarCasoComandoError(
        new SupabaseCasoComandos().registrarContrato(input),
        403,
        "Operação não autorizada",
      );
    });

    it("erro 422 do servidor vira CasoComandoError com status 422 e a mensagem real", async () => {
      invoke.mockResolvedValue({
        data: null,
        error: Object.assign(new Error("Edge Function returned a non-2xx status code"), {
          context: respostaDeErro(422, "Dados inválidos para esta operação"),
        }),
      });

      await esperarCasoComandoError(
        new SupabaseCasoComandos().registrarContrato(input),
        422,
        "Dados inválidos para esta operação",
      );
    });

    it("erro 409 (conflito de idempotência/vínculo) vira CasoComandoError com status 409 e a mensagem real", async () => {
      invoke.mockResolvedValue({
        data: null,
        error: Object.assign(new Error("Edge Function returned a non-2xx status code"), {
          context: respostaDeErro(409, "Conflito: já existe um registro equivalente"),
        }),
      });

      await esperarCasoComandoError(
        new SupabaseCasoComandos().registrarContrato(input),
        409,
        "Conflito: já existe um registro equivalente",
      );
    });

    it("sem error.context (falha de rede, não resposta HTTP) vira CasoComandoError 500 com a mensagem original, sem quebrar lendo .json()", async () => {
      invoke.mockResolvedValue({
        data: null,
        error: new Error("Failed to fetch"),
      });

      await esperarCasoComandoError(
        new SupabaseCasoComandos().registrarContrato(input),
        500,
        "Failed to fetch",
      );
    });
  });

  describe("prepararCaso", () => {
    const input = {
      clienteId: "11111111-1111-4111-8111-111111111111",
      contratoId: "22222222-2222-4222-8222-222222222222",
      levantamentoEstado: "incompleto" as const,
      idempotencyKey: "idem-caso-1",
    };

    it("chama a Edge Function com o header CSRF e todos os campos do input, e traduz a linha devolvida", async () => {
      invoke.mockResolvedValue({
        data: {
          id: "44444444-4444-4444-8444-444444444444",
          cliente_id: input.clienteId,
          contrato_id: input.contratoId,
          fase_atual_id: "55555555-5555-4555-8555-555555555555",
        },
        error: null,
      });

      const resultado = await new SupabaseCasoComandos().prepararCaso(input);

      expect(invoke).toHaveBeenCalledWith("caso-comandos", {
        headers: { "x-akros-csrf": "1" },
        body: { acao: "preparar_caso", ...input },
      });
      expect(resultado).toEqual({
        id: "44444444-4444-4444-8444-444444444444",
        clienteId: input.clienteId,
        faseAtualId: "55555555-5555-4555-8555-555555555555",
      });
    });
  });

  it("vincula a pasta pelo comando autenticado do caso", async () => {
    const input = {
      clienteId: "11111111-1111-4111-8111-111111111111",
      jornadaId: "22222222-2222-4222-8222-222222222222",
      integracaoId: "33333333-3333-4333-8333-333333333333",
      folderItemId: "pasta-1",
      idempotencyKey: "vinculo-1",
    };
    invoke.mockResolvedValue({ data: { id: "vinculo-1" }, error: null });
    await new SupabaseCasoComandos().vincularPasta(input);
    expect(invoke).toHaveBeenCalledWith("caso-comandos", {
      headers: { "x-akros-csrf": "1" },
      body: { acao: "vincular_pasta", ...input },
    });
  });

  describe("convidarParticipante", () => {
    const input = {
      clienteId: "11111111-1111-4111-8111-111111111111",
      papel: "beneficiario" as const,
      sujeitoTipo: "titular" as const,
      nomeExibicao: "Ana Beneficiária",
      email: "ana@example.com",
      idempotencyKey: "idem-convite-1",
    };

    it("chama a Edge Function com o header CSRF e todos os campos do input, e traduz a linha devolvida", async () => {
      invoke.mockResolvedValue({
        data: {
          id: "66666666-6666-4666-8666-666666666666",
          cliente_id: input.clienteId,
          papel: input.papel,
          sujeito_tipo: input.sujeitoTipo,
          familiar_id: null,
          organizacao_id: null,
          nome_exibicao: input.nomeExibicao,
          email: input.email,
          auth_user_id: null,
          estado: "ativo",
          convidado_por: "33333333-3333-4333-8333-333333333333",
          convidado_em: "2026-10-16T12:00:00.000Z",
          revogado_por: null,
          revogado_em: null,
        },
        error: null,
      });

      const participante = await new SupabaseCasoComandos().convidarParticipante(input);

      expect(invoke).toHaveBeenCalledWith("caso-comandos", {
        headers: { "x-akros-csrf": "1" },
        body: { acao: "convidar_participante", ...input },
      });
      expect(participante).toMatchObject({
        id: "66666666-6666-4666-8666-666666666666",
        clienteId: input.clienteId,
        papel: "beneficiario",
        sujeitoTipo: "titular",
        nomeExibicao: input.nomeExibicao,
        email: input.email,
        estado: "ativo",
        convidadoPor: "33333333-3333-4333-8333-333333333333",
      });
      expect(participante).not.toHaveProperty("authUserId");
      expect(participante).not.toHaveProperty("familiarId");
    });

    it("erro 422 do servidor (papel fora do conjunto do programa) vira CasoComandoError 422", async () => {
      invoke.mockResolvedValue({
        data: null,
        error: Object.assign(new Error("Edge Function returned a non-2xx status code"), {
          context: respostaDeErro(422, "Dados inválidos para esta operação"),
        }),
      });

      await esperarCasoComandoError(
        new SupabaseCasoComandos().convidarParticipante(input),
        422,
        "Dados inválidos para esta operação",
      );
    });
  });

  describe("revogarParticipante", () => {
    const input = {
      participanteId: "66666666-6666-4666-8666-666666666666",
      idempotencyKey: "idem-revoga-1",
    };

    it("chama a Edge Function com o header CSRF e todos os campos do input, e traduz a linha devolvida", async () => {
      invoke.mockResolvedValue({
        data: {
          id: input.participanteId,
          cliente_id: "11111111-1111-4111-8111-111111111111",
          papel: "beneficiario",
          sujeito_tipo: "titular",
          familiar_id: null,
          organizacao_id: null,
          nome_exibicao: "Ana Beneficiária",
          email: "ana@example.com",
          auth_user_id: null,
          estado: "revogado",
          convidado_por: "33333333-3333-4333-8333-333333333333",
          convidado_em: "2026-10-16T12:00:00.000Z",
          revogado_por: "33333333-3333-4333-8333-333333333333",
          revogado_em: "2026-10-16T13:00:00.000Z",
        },
        error: null,
      });

      const participante = await new SupabaseCasoComandos().revogarParticipante(input);

      expect(invoke).toHaveBeenCalledWith("caso-comandos", {
        headers: { "x-akros-csrf": "1" },
        body: { acao: "revogar_participante", ...input },
      });
      expect(participante).toMatchObject({
        id: input.participanteId,
        estado: "revogado",
        revogadoPor: "33333333-3333-4333-8333-333333333333",
        revogadoEm: "2026-10-16T13:00:00.000Z",
      });
    });

    it("erro 403 (não-admin) vira CasoComandoError 403", async () => {
      invoke.mockResolvedValue({
        data: null,
        error: Object.assign(new Error("Edge Function returned a non-2xx status code"), {
          context: respostaDeErro(403, "Operação não autorizada"),
        }),
      });

      await esperarCasoComandoError(
        new SupabaseCasoComandos().revogarParticipante(input),
        403,
        "Operação não autorizada",
      );
    });
  });
});
