import { useSessaoStore } from "@/features/sessao/application/store";
import type { HttpRequest, HttpResponse, HttpStack } from "tus-js-client";
// @vitest-environment jsdom
// envio-tus.test.ts — E03-S07 (Fase 5/US2, T063). Cobre interrupção e retomada SEM duplicar o
// objeto no bucket.
//
// **Honestidade obrigatória (ver brief desta task)**: não há servidor TUS nem bucket Storage
// real neste sandbox (sem Docker, sem stack Supabase completa). Este teste usa um `HttpStack`
// fake — abstração que o próprio `tus-js-client` expõe de propósito para ser testável sem rede
// (ver `node_modules/tus-js-client/lib/index.d.ts`, interface `HttpStack`/`HttpRequest`/
// `HttpResponse`) — simulando um servidor TUS em memória dentro do próprio teste. Prova a
// LÓGICA de retomada (HEAD pelo offset atual, PATCH só do restante, nenhum novo "create"), nunca
// o protocolo de rede real contra o Supabase Storage.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("VITE_SUPABASE_URL", "https://fake.test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key-test");

// `Blob.prototype.arrayBuffer()`/`new Response(blob).arrayBuffer()` não são confiáveis no Blob
// do jsdom (achado empírico desta task — devolviam um conteúdo truncado, bem menor que
// `blob.size`). `FileReader.readAsArrayBuffer` é a API que o jsdom implementa de forma completa
// e é exatamente o que o `FileSource` do próprio `tus-js-client` (browser) usa por baixo.
function lerBlob(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(new Uint8Array(leitor.result as ArrayBuffer));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsArrayBuffer(blob);
  });
}

async function paraBytes(body: unknown): Promise<Uint8Array> {
  if (body == null) return new Uint8Array(0);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (typeof Blob !== "undefined" && body instanceof Blob) return lerBlob(body);
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (ArrayBuffer.isView(body)) {
    const vista = body as ArrayBufferView;
    return new Uint8Array(vista.buffer, vista.byteOffset, vista.byteLength);
  }
  throw new Error(`tipo de corpo não suportado no fake HttpStack: ${typeof body}`);
}

class FakeHttpResponse implements HttpResponse {
  constructor(
    private status: number,
    private headers: Record<string, string>,
    private body: string,
  ) {}
  getStatus() {
    return this.status;
  }
  getHeader(header: string) {
    return this.headers[header.toLowerCase()];
  }
  getBody() {
    return this.body;
  }
  getUnderlyingObject() {
    return undefined;
  }
}

/** Servidor TUS fake em memória: um único objeto, offset cresce por PATCH, "create" (POST) só
 *  pode acontecer uma vez por upload — é essa contagem que prova "não duplicou o objeto". */
class FakeTusServidor {
  objeto = new Uint8Array(0);
  uploadUrl = "https://fake.test.supabase.co/storage/v1/upload/resumable/objeto-1";
  chamadasCreate = 0;
  headersCriacao: Record<string, string> = {};
  falharProximoPatch = false;
  /** Capturado do header `Upload-Length` da criação — o HEAD de retomada precisa devolvê-lo de
   *  volta (tus-js-client rejeita HEAD sem `Upload-Length`/`Upload-Offset`). */
  tamanhoTotal = 0;

  criarHttpStack(): HttpStack {
    const servidor = this;
    return {
      getName: () => "FakeHttpStack",
      createRequest(method: string, url: string): HttpRequest {
        const headers: Record<string, string> = {};
        return {
          getMethod: () => method,
          getURL: () => url,
          setHeader: (h, v) => {
            headers[h.toLowerCase()] = v;
          },
          getHeader: (h) => headers[h.toLowerCase()],
          setProgressHandler: () => {},
          getUnderlyingObject: () => undefined,
          abort: () => Promise.resolve(),
          async send(body: unknown): Promise<HttpResponse> {
            if (method === "POST") {
              servidor.chamadasCreate++;
              servidor.headersCriacao = { ...headers };
              servidor.tamanhoTotal = Number(headers["upload-length"]) || servidor.tamanhoTotal;
              const bytes = await paraBytes(body);
              servidor.objeto = Uint8Array.from(bytes);
              return new FakeHttpResponse(
                201,
                {
                  location: servidor.uploadUrl,
                  "tus-resumable": "1.0.0",
                  "upload-offset": String(bytes.length),
                },
                "",
              );
            }
            if (method === "HEAD") {
              return new FakeHttpResponse(
                200,
                {
                  "upload-offset": String(servidor.objeto.length),
                  "upload-length": String(servidor.tamanhoTotal),
                  "tus-resumable": "1.0.0",
                },
                "",
              );
            }
            if (method === "PATCH") {
              if (servidor.falharProximoPatch) {
                servidor.falharProximoPatch = false;
                throw new Error("interrupção simulada de rede");
              }
              const offset = Number(headers["upload-offset"]);
              const novosBytes = await paraBytes(body);
              const combinado = new Uint8Array(offset + novosBytes.length);
              combinado.set(servidor.objeto.slice(0, offset), 0);
              combinado.set(novosBytes, offset);
              servidor.objeto = combinado;
              return new FakeHttpResponse(
                204,
                { "upload-offset": String(combinado.length), "tus-resumable": "1.0.0" },
                "",
              );
            }
            throw new Error(`método não suportado no fake: ${method}`);
          },
        };
      },
    };
  }
}

function arquivoDeteste(tamanhoBytes: number): Blob {
  const bytes = new Uint8Array(tamanhoBytes);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  return new Blob([bytes], { type: "application/pdf" });
}

beforeEach(() => {
  useSessaoStore.getState().definirSessao({
    accessToken: "token-de-teste",
    expiresAt: Date.now() + 3_600_000,
    usuario: { id: "user-1", email: "a@example.com", papel: "cliente" },
  });
});

describe("enviarArquivoAoBucket — caminho TUS (> limite reduzido no teste)", () => {
  it("recupera de uma interrupção automaticamente (retomada pelo offset certo), sem recriar o " +
    "objeto e com os bytes finais íntegros", async () => {
    const { enviarArquivoAoBucket } = await import("./envio-tus");
    const servidor = new FakeTusServidor();
    const TAMANHO = 18; // limites reduzidos no teste: 12 bytes + 6 bytes
    const arquivo = arquivoDeteste(TAMANHO);
    const progresso: Array<[number, number]> = [];

    // Interrompe o 2º fragmento (o 1º já foi aceito na criação, uploadDataDuringCreation) —
    // `tus-js-client` detecta a falha e retoma por conta própria: HEAD para achar o offset
    // (6 MB, já confirmado pelo servidor) e PATCH só do restante (3 MB), nunca recomeçando do
    // zero nem chamando "create" de novo. Isso prova a retomada através da API PÚBLICA real
    // (`enviarArquivoAoBucket`), não de uma simulação paralela de "segunda instância".
    servidor.falharProximoPatch = true;

    // `enviarArquivoAoBucket` usa `retryDelays` reais (produção) — sem timers falsos, o
    // primeiro retry (`retryDelays[0] = 0ms`) já é rápido, mas esperar o `setTimeout` de
    // verdade some tempo de parede sem necessidade num teste. `vi.useFakeTimers` com
    // `advanceTimersByTime: true` deixa o `setTimeout` do retry resolver instantaneamente,
    // sem tocar no `FileReader`/Promises do resto do fluxo (que não usam timer).
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const controle = enviarArquivoAoBucket({
        objetoPermitido: "cliente-1/versao-1.pdf",
        arquivo,
        httpStackParaTeste: servidor.criarHttpStack(),
        limiteTusBytesParaTeste: 8,
        tamanhoFragmentoBytesParaTeste: 12,
        onProgress: (enviados, total) => progresso.push([enviados, total]),
      });
      await controle.promessa; // não rejeita — a interrupção foi absorvida pela retomada interna
    } finally {
      vi.useRealTimers();
    }

    expect(servidor.chamadasCreate).toBe(1); // nunca criou um segundo objeto
    expect(servidor.headersCriacao).toMatchObject({
      authorization: "Bearer token-de-teste",
      apikey: "anon-key-test",
    });
    expect(servidor.objeto.length).toBe(TAMANHO); // íntegro, sem truncar nem duplicar
    expect(servidor.objeto).toEqual(await lerBlob(arquivo));
    // Progresso reportado inclui o ponto pós-interrupção (6 MB) e o final (9 MB) — a UI
    // consegue mostrar que a retomada continuou de onde parou, não do zero.
    expect(progresso.some(([enviados]) => enviados === 12)).toBe(true);
    expect(progresso.at(-1)).toEqual([TAMANHO, TAMANHO]);
  });

  it("sem retomada (upload limpo): um único create, offset final igual ao tamanho do arquivo", async () => {
    const { enviarArquivoAoBucket } = await import("./envio-tus");
    const servidor = new FakeTusServidor();
    const TAMANHO = 14; // limites reduzidos no teste: 12 bytes + 2 bytes
    const arquivo = arquivoDeteste(TAMANHO);

    const controle = enviarArquivoAoBucket({
      objetoPermitido: "cliente-1/versao-2.pdf",
      arquivo,
      httpStackParaTeste: servidor.criarHttpStack(),
      limiteTusBytesParaTeste: 8,
      tamanhoFragmentoBytesParaTeste: 12,
    });
    await controle.promessa;

    expect(servidor.chamadasCreate).toBe(1);
    expect(servidor.objeto.length).toBe(TAMANHO);
  });
});

describe("enviarArquivoAoBucket — caminho simples (≤ 6 MB)", () => {
  it("usa storage.from('envios').upload diretamente, sem TUS", async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    vi.doMock("./client", () => ({
      getSupabase: () => ({ storage: { from: () => ({ upload: uploadMock }) } }),
    }));
    vi.resetModules();
    const { enviarArquivoAoBucket } = await import("./envio-tus");

    const arquivo = arquivoDeteste(1024);
    const progresso: Array<[number, number]> = [];
    const controle = enviarArquivoAoBucket({
      objetoPermitido: "cliente-1/versao-2.pdf",
      arquivo,
      onProgress: (enviados, total) => progresso.push([enviados, total]),
    });
    await controle.promessa;

    expect(uploadMock).toHaveBeenCalledWith("cliente-1/versao-2.pdf", arquivo, {
      contentType: "application/pdf",
      upsert: false,
    });
    expect(progresso).toEqual([[1024, 1024]]);

    vi.doUnmock("./client");
    vi.resetModules();
  });
});
