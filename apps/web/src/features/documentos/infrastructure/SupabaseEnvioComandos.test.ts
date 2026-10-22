import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnvioDocumentoError } from "../application/ports";
import { SupabaseEnvioComandos } from "./SupabaseEnvioComandos";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/shared/supabase/client", () => ({ getSupabase: () => ({ functions: { invoke } }) }));

describe("SupabaseEnvioComandos", () => {
  beforeEach(() => invoke.mockReset());

  it("reserva com CSRF e devolve caminho autorizado pelo servidor", async () => {
    invoke.mockResolvedValue({
      data: { versaoId: "v1", objetoPermitido: "c/v1.pdf", expiraEm: "amanhã" },
      error: null,
    });
    const result = await new SupabaseEnvioComandos().reservar({
      solicitacaoId: "d1",
      nomeArquivo: "passaporte.pdf",
      tamanhoBytes: 10,
      mime: "application/pdf",
    });
    expect(invoke).toHaveBeenCalledWith("envio-comandos", {
      headers: { "x-akros-csrf": "1" },
      body: {
        acao: "reservar_envio",
        solicitacaoId: "d1",
        nomeArquivo: "passaporte.pdf",
        tamanhoBytes: 10,
        mime: "application/pdf",
      },
    });
    expect(result.objetoPermitido).toBe("c/v1.pdf");
  });

  it.each([
    [404, "upload.blockedPhase"],
    [413, "upload.fileTooLarge"],
    [422, "upload.invalidFile"],
  ])(
    "converte HTTP %i em instrução legível sem expor resposta do servidor",
    async (status, chave) => {
      invoke.mockResolvedValue({
        data: null,
        error: Object.assign(new Error("Edge Function returned a non-2xx status code"), {
          context: new Response(JSON.stringify({ erro: "detalhe interno do servidor" }), {
            status,
          }),
        }),
      });
      await expect(
        new SupabaseEnvioComandos().reservar({
          solicitacaoId: "d1",
          nomeArquivo: "a.pdf",
          tamanhoBytes: 1,
          mime: "application/pdf",
        }),
      ).rejects.toMatchObject({ status, message: chave } satisfies Partial<EnvioDocumentoError>);
    },
  );
});
