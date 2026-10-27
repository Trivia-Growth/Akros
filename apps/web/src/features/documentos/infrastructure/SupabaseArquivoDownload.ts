import { useSessaoStore } from "@/features/sessao/application/store";
import type { ArquivoDownloadPort } from "../application/ports";

export class SupabaseArquivoDownload implements ArquivoDownloadPort {
  async baixar(versaoId: string): Promise<Blob> {
    const token = useSessaoStore.getState().sessao?.accessToken;
    const url = import.meta.env.VITE_SUPABASE_URL;
    const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !url || !chave) throw new Error("Download indisponível");
    const endpoint = new URL(`${url.replace(/\/$/, "")}/functions/v1/arquivo-baixar`);
    endpoint.searchParams.set("versaoId", versaoId);
    const resposta = await fetch(endpoint.toString(), {
      headers: { Authorization: `Bearer ${token}`, apikey: chave },
    });
    if (
      !resposta.ok ||
      !resposta.headers.get("content-type")?.toLowerCase().startsWith("application/pdf")
    ) {
      throw new Error("Download indisponível");
    }
    return await resposta.blob();
  }
}
