// _shared/io-storage-envios.ts — E03-S07 (T060, ADR-0019). Porta de leitura do bucket privado
// `envios`, mesmo padrão porta/adapter de `webhook.ts`/`io-supabase.ts`: só o necessário para
// `finalizar_envio` confirmar que o objeto chegou de verdade antes de prometer "recebido" ao
// cliente — existência, tamanho e assinatura `%PDF-` lida dos PRIMEIROS bytes do objeto (nunca
// pela extensão do nome, ADR-0019 ponto 3). Nenhuma escrita aqui: upload é feito pelo próprio
// browser via TUS, direto no bucket, com a sessão do usuário (ver `envio-tus.ts`).
//
// **Honestidade obrigatória (ver brief desta task)**: o adapter real
// (`criarIOStorageEnvios`) não pôde ser exercitado contra um Storage real neste sandbox (sem
// Docker, sem stack Supabase completa — só Postgres raw). Os testes Deno de
// `envio-comandos.test.ts` usam só um fake desta porta.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clienteServico } from "./integracoes.ts";

export interface ObjetoEnvio {
  tamanhoBytes: number;
  primeirosBytes: Uint8Array;
}

export interface IOStorageEnvios {
  /** `null` quando o objeto não existe no bucket (upload nunca concluído, ou falhou antes de
   *  terminar) — `finalizar_envio` NUNCA confirma recebimento nesse caso (ADR-0019 ponto 3). */
  obterObjeto(caminho: string): Promise<ObjetoEnvio | null>;
}

const BUCKET = "envios";
// `%PDF-` tem 5 bytes; 16 é folga suficiente para a assinatura sem baixar o arquivo inteiro.
const BYTES_ASSINATURA = 16;

let cliente: SupabaseClient | null = null;
const sb = () => (cliente ??= clienteServico());

/** Adapter real, contra `supabase.storage.from("envios")` com `service_role`. Baixa o objeto
 *  inteiro (o SDK de Storage não expõe range-read parcial de forma portável) e lê os primeiros
 *  bytes em memória — aceitável no MVP porque o teto de 20 MB (`TAMANHO_MAXIMO_BYTES`) já limita
 *  o tamanho máximo transitando pela Edge Function nesta chamada. */
export function criarIOStorageEnvios(): IOStorageEnvios {
  return {
    async obterObjeto(caminho) {
      const { data, error } = await sb().storage.from(BUCKET).download(caminho);
      if (error) {
        // supabase-js não distingue "não existe" de outro erro de forma tipada — mas
        // `finalizar_envio` precisa tratar qualquer falha de leitura como "não confirma
        // recebimento ainda" (fail-closed), nunca como sucesso silencioso.
        return null;
      }
      if (!data) return null;

      const bytes = new Uint8Array(await data.arrayBuffer());
      return {
        tamanhoBytes: bytes.byteLength,
        primeirosBytes: bytes.slice(0, BYTES_ASSINATURA),
      };
    },
  };
}

/** `%PDF-` nos primeiros bytes — nunca a extensão do nome do arquivo (ADR-0019 ponto 3). */
export function assinaturaPdfValida(primeirosBytes: Uint8Array): boolean {
  const assinatura = new TextDecoder().decode(primeirosBytes.slice(0, 5));
  return assinatura === "%PDF-";
}
