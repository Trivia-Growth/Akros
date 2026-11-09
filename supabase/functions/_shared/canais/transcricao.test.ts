import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { LIMITE_TEXTO_ENTRADA } from "./tipos.ts";
import { ErroTranscricao, extensaoDoAudio, transcrever, verificarProvedor } from "./transcricao.ts";

interface Chamada {
  url: string;
  metodo: string;
  headers: Record<string, string>;
  corpo?: BodyInit | null;
}

function falso(respostas: Array<Response | Error>) {
  const chamadas: Chamada[] = [];
  let i = 0;
  const buscador = ((url: string, init: RequestInit = {}) => {
    chamadas.push({ url, metodo: init.method ?? "GET", headers: init.headers as Record<string, string>, corpo: init.body });
    assertEquals(init.redirect, "error", "redirect precisa falhar");
    assert(init.signal, "toda chamada precisa de timeout");
    const r = respostas[Math.min(i++, respostas.length - 1)];
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(r.clone());
  }) as unknown as typeof fetch;
  return { buscador, chamadas };
}

const ok = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });
const AUDIO = new Uint8Array([1, 2, 3, 4]);
const base = { chave: "SEGREDO", modelo: "whisper-large-v3-turbo", idioma: null, audio: AUDIO, mime: "audio/ogg" };

Deno.test("transcrever (Groq): multipart com arquivo .ogg, modelo e Bearer; devolve texto e segundos", async () => {
  const f = falso([ok({ text: "  quero marcar uma consulta  ", usage: { seconds: 7.5 } })]);
  const r = await transcrever({ ...base, buscador: f.buscador, provedor: "groq" });
  assertEquals(r, { texto: "quero marcar uma consulta", segundos: 7.5 });
  const c = f.chamadas[0];
  assertEquals([c.url, c.metodo, c.headers.authorization], ["https://api.groq.com/openai/v1/audio/transcriptions", "POST", "Bearer SEGREDO"]);
  const form = c.corpo as FormData;
  assertEquals([form.get("model"), form.get("response_format"), form.get("language")], ["whisper-large-v3-turbo", "json", null]);
  const arquivo = form.get("file") as File;
  assertEquals([arquivo.name, arquivo.type, arquivo.size], ["audio.ogg", "audio/ogg", 4]);
});

Deno.test("transcrever (OpenRouter): endpoint próprio e idioma quando informado", async () => {
  const f = falso([ok({ text: "oi" })]);
  const r = await transcrever({ ...base, buscador: f.buscador, provedor: "openrouter", modelo: "openai/whisper-large-v3", idioma: "pt" });
  assertEquals(r, { texto: "oi", segundos: null });
  assertEquals(f.chamadas[0].url, "https://openrouter.ai/api/v1/audio/transcriptions");
  assertEquals((f.chamadas[0].corpo as FormData).get("language"), "pt");
});

Deno.test("formatos: cada mime aceito vira extensão; o resto é áudio inválido, sem chamar a rede", async () => {
  assertEquals(
    ["audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "video/mp4"].map(extensaoDoAudio),
    ["ogg", "mp3", "m4a", "wav", "webm", null],
  );
  const f = falso([ok({ text: "x" })]);
  for (const audio of [{ mime: "video/mp4", audio: AUDIO }, { mime: "audio/ogg", audio: new Uint8Array(0) }]) {
    const e = await assertRejects(() => transcrever({ ...base, ...audio, buscador: f.buscador, provedor: "groq" }), ErroTranscricao);
    assertEquals(e.codigo, "audio_invalido");
  }
  assertEquals(f.chamadas.length, 0);
});

Deno.test("falhas do provedor viram códigos e NUNCA carregam o corpo nem a chave", async () => {
  const casos: Array<[Response | Error, string]> = [
    [new Response("SEGREDO no corpo", { status: 401 }), "chave_recusada"],
    [new Response("x", { status: 403 }), "chave_recusada"],
    [new Response("x", { status: 429 }), "limite_do_provedor"],
    [new Response("x", { status: 402 }), "limite_do_provedor"],
    [new Response("x", { status: 404 }), "modelo_indisponivel"],
    [new Response("x", { status: 500 }), "provedor_indisponivel"],
    [new Error("conexão caiu com SEGREDO"), "provedor_indisponivel"],
    [Object.assign(new Error("t"), { name: "TimeoutError" }), "tempo_esgotado"],
    [new Response("<html>", { status: 200 }), "resposta_invalida"],
    [ok([1, 2]), "resposta_invalida"],
    [ok({ text: 5 }), "resposta_invalida"],
    [ok({ text: "   " }), "sem_fala"],
  ];
  for (const [resposta, codigo] of casos) {
    const e = await assertRejects(() => transcrever({ ...base, buscador: falso([resposta]).buscador, provedor: "groq" }), ErroTranscricao);
    assertEquals(e.codigo, codigo);
    assert(!e.message.includes("SEGREDO"), "erro não pode ecoar corpo nem chave");
  }
});

Deno.test("texto acima do limite do registro é cortado (senão a mensagem seria recusada e reentregada para sempre)", async () => {
  const r = await transcrever({ ...base, buscador: falso([ok({ text: "a".repeat(LIMITE_TEXTO_ENTRADA + 500) })]).buscador, provedor: "groq" });
  assertEquals(r.texto.length, LIMITE_TEXTO_ENTRADA);
  assert(r.texto.endsWith("…"));
});

Deno.test("resposta com Content-Length absurdo é recusada antes de ler", async () => {
  const grande = new Response("{}", { status: 200, headers: { "content-length": String(5 * 1024 * 1024) } });
  const e = await assertRejects(() => transcrever({ ...base, buscador: falso([grande]).buscador, provedor: "groq" }), ErroTranscricao);
  assertEquals(e.codigo, "resposta_invalida");
});

Deno.test("verificar (Groq): uma chamada autenticada à lista; modelo ausente é indisponível", async () => {
  const f = falso([ok({ data: [{ id: "whisper-large-v3-turbo" }, { id: "llama" }] })]);
  await verificarProvedor({ buscador: f.buscador, provedor: "groq", modelo: "whisper-large-v3-turbo", chave: "SEGREDO" });
  assertEquals(f.chamadas.map((c) => [c.url, c.headers.authorization]), [["https://api.groq.com/openai/v1/models", "Bearer SEGREDO"]]);
  const e = await assertRejects(
    () => verificarProvedor({ buscador: falso([ok({ data: [{ id: "llama" }] })]).buscador, provedor: "groq", modelo: "whisper-large-v3-turbo", chave: "k" }),
    ErroTranscricao,
  );
  assertEquals(e.codigo, "modelo_indisponivel");
});

Deno.test("verificar (OpenRouter): valida a chave E depois a lista de modelos de transcrição", async () => {
  const f = falso([ok({ data: { label: "k" } }), ok({ data: [{ id: "openai/whisper-large-v3" }] })]);
  await verificarProvedor({ buscador: f.buscador, provedor: "openrouter", modelo: "openai/whisper-large-v3", chave: "SEGREDO" });
  assertEquals(f.chamadas.map((c) => c.url), [
    "https://openrouter.ai/api/v1/key",
    "https://openrouter.ai/api/v1/models?output_modalities=transcription",
  ]);
  const recusada = await assertRejects(
    () => verificarProvedor({ buscador: falso([new Response("x", { status: 401 })]).buscador, provedor: "openrouter", modelo: "m", chave: "k" }),
    ErroTranscricao,
  );
  assertEquals(recusada.codigo, "chave_recusada");
});

Deno.test("verificar: lista malformada é modelo indisponível, não exceção solta", async () => {
  for (const corpo of [{}, { data: "x" }, { data: [null, 3] }]) {
    const e = await assertRejects(
      () => verificarProvedor({ buscador: falso([ok(corpo)]).buscador, provedor: "groq", modelo: "m", chave: "k" }),
      ErroTranscricao,
    );
    assertEquals(e.codigo, "modelo_indisponivel");
  }
});
