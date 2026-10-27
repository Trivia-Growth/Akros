import { useSessaoStore } from "@/features/sessao/application/store";
import { afterEach, expect, it, vi } from "vitest";
import { SupabaseArquivoDownload } from "./SupabaseArquivoDownload";

afterEach(() => {
  useSessaoStore.getState().definirSessao(null);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("baixa PDF autorizado como bytes, usando sessão atual", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://projeto.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-key");
  useSessaoStore.getState().definirSessao({
    accessToken: "token-atual",
    expiresAt: 9999999999,
    usuario: { id: "cliente", email: "cliente@example.test", papel: "cliente" },
  });
  const resposta = new Blob([new Uint8Array([37, 80, 68, 70, 45, 255])], {
    type: "application/pdf",
  });
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(resposta, { status: 200, headers: { "Content-Type": "application/pdf" } }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const arquivo = await new SupabaseArquivoDownload().baixar("versao-1");
  expect(new Uint8Array(await arquivo.arrayBuffer())).toEqual(
    new Uint8Array([37, 80, 68, 70, 45, 255]),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "https://projeto.supabase.co/functions/v1/arquivo-baixar?versaoId=versao-1",
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: "Bearer token-atual",
        apikey: "public-key",
      }),
    }),
  );
});

it("não retorna arquivo quando servidor nega o acesso", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://projeto.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-key");
  useSessaoStore.getState().definirSessao({
    accessToken: "token-atual",
    expiresAt: 9999999999,
    usuario: { id: "cliente", email: "cliente@example.test", papel: "cliente" },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Negado", { status: 404 })));
  await expect(new SupabaseArquivoDownload().baixar("outra-versao")).rejects.toThrow();
});

it("sem sessão, não envia requisição", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://projeto.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-key");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(new SupabaseArquivoDownload().baixar("versao-1")).rejects.toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});
