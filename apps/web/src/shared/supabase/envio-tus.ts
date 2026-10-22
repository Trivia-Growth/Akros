import { useSessaoStore } from "@/features/sessao/application/store";
// envio-tus.ts — E03-S07 (Fase 5/US2, T062, ADR-0019). Escreve o PDF reservado diretamente no
// bucket `envios`, com a sessão Supabase ATUAL do usuário logado (nunca service_role) — o
// servidor só autoriza o `objeto_permitido` via a policy `upload_so_com_reserva_ativa`
// (storage.objects, migration 0020); este módulo não reautoriza nada, só escreve.
//
// Acima de 6 MB usa TUS (retomável, biblioteca `tus-js-client`, a mesma que a documentação
// oficial do Supabase Storage "resumable upload" recomenda); igual ou abaixo disso, upload
// simples direto (`storage.from("envios").upload`) — overhead de sessão/checkpoint do TUS não
// compensa para arquivo pequeno.
//
// **Honestidade obrigatória (ver brief desta task)**: TUS real contra um bucket Storage real NÃO
// é exercitável neste sandbox (sem Docker, sem stack Supabase completa). `envio-tus.test.ts`
// prova a lógica de interrupção/retomada com um `HttpStack` fake (`tus-js-client` expõe essa
// abstração de propósito) — nunca contra um servidor TUS de verdade.
import * as tus from "tus-js-client";
import { getSupabase } from "./client";

const BUCKET = "envios";
/** Acima deste tamanho usa TUS; igual ou abaixo, upload simples. Mesmo critério de design-
 *  tecnico.md §3 ("TUS acima de 6 MB"). */
export const LIMITE_UPLOAD_SIMPLES_BYTES = 6 * 1024 * 1024;
/** Fragmento do TUS — mesmo valor do limite acima (Supabase Storage aceita até 6 MB por
 *  fragmento no protocolo resumable). */
const TAMANHO_FRAGMENTO_BYTES = 6 * 1024 * 1024;

export interface EnvioArquivoOpts {
  /** Caminho exato devolvido pela reserva (`reservar_envio`) — nunca escolhido pelo cliente. */
  objetoPermitido: string;
  arquivo: Blob;
  onProgress?: (bytesEnviados: number, bytesTotais: number) => void;
  /** Só para teste — injeta um `HttpStack` fake no caminho TUS, sem servidor real. */
  httpStackParaTeste?: tus.HttpStack;
  /** Só para teste — reduz os limites para cobrir chunking com payload pequeno em memória. */
  limiteTusBytesParaTeste?: number;
  tamanhoFragmentoBytesParaTeste?: number;
}

export interface ControleEnvio {
  promessa: Promise<void>;
  abortar: () => void;
}

function urlSupabase(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("VITE_SUPABASE_URL é obrigatória para enviar arquivo ao bucket.");
  return url;
}

function tokenSessao(): string {
  const token = useSessaoStore.getState().sessao?.accessToken;
  if (!token) throw new Error("Sessão ausente — não é possível enviar arquivo.");
  return token;
}

function anonKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!key) throw new Error("VITE_SUPABASE_ANON_KEY é obrigatória para enviar arquivo ao bucket.");
  return key;
}

function enviarSimples(opts: EnvioArquivoOpts): ControleEnvio {
  const promessa = (async () => {
    const { error } = await getSupabase()
      .storage.from(BUCKET)
      .upload(opts.objetoPermitido, opts.arquivo, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (error) throw error;
    opts.onProgress?.(opts.arquivo.size, opts.arquivo.size);
  })();
  // Upload simples do supabase-js não expõe cancelamento parcial — arquivo pequeno (≤ 6 MB) não
  // justifica a complexidade de um AbortController aqui; abortar() é melhor-esforço (no-op).
  return { promessa, abortar: () => {} };
}

function enviarPorTus(opts: EnvioArquivoOpts): ControleEnvio {
  let upload: tus.Upload;
  const promessa = new Promise<void>((resolve, reject) => {
    upload = new tus.Upload(opts.arquivo, {
      endpoint: `${urlSupabase()}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${tokenSessao()}`,
        apikey: anonKey(),
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: opts.tamanhoFragmentoBytesParaTeste ?? TAMANHO_FRAGMENTO_BYTES,
      metadata: {
        bucketName: BUCKET,
        objectName: opts.objetoPermitido,
        contentType: "application/pdf",
      },
      httpStack: opts.httpStackParaTeste,
      onProgress: (bytesEnviados, bytesTotais) => opts.onProgress?.(bytesEnviados, bytesTotais),
      onSuccess: () => resolve(),
      onError: (erro) => reject(erro),
    });

    // Retomada: se já existe um upload anterior para o mesmo arquivo (mesma fingerprint —
    // nome/tamanho/tipo/data), continua dele em vez de recomeçar do zero — é isto que evita
    // duplicar o objeto no bucket numa reconexão (T063).
    upload.findPreviousUploads().then((previas) => {
      if (previas.length > 0) upload.resumeFromPreviousUpload(previas[0]);
      upload.start();
    });
  });

  return {
    promessa,
    abortar: () => {
      void upload?.abort();
    },
  };
}

export function enviarArquivoAoBucket(opts: EnvioArquivoOpts): ControleEnvio {
  if (opts.arquivo.size <= (opts.limiteTusBytesParaTeste ?? LIMITE_UPLOAD_SIMPLES_BYTES)) {
    return enviarSimples(opts);
  }
  return enviarPorTus(opts);
}
