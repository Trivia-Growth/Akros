import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HttpError } from "./auth.ts";
import { criarManipuladorCanalEvolution, type DepsCanalEvolution } from "./canal-evolution.ts";
import {
  criarHandlersTranscricao,
  type DepsTranscricao,
  type PatchTranscricao,
  type TranscricaoLinha,
} from "./canal-transcricao.ts";
import { ErroCanal } from "./erro-canal.ts";

const ADMIN = "00000000-0000-4000-8000-0000000000aa";
const ID = "44444444-4444-4444-8444-444444444444";
const CHAVE = "gsk_CHAVE-SECRETA-DO-PROVEDOR";
const AGORA = "2026-10-28T12:00:00.000Z";

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });
const MODELOS_GROQ = json({ data: [{ id: "whisper-large-v3-turbo" }, { id: "whisper-large-v3" }] });

function linha(over: Partial<TranscricaoLinha> = {}): TranscricaoLinha {
  return {
    id: ID, ativa: false, provedor: "groq", modelo: "whisper-large-v3-turbo", idioma: null, indicio: "ROVE",
    aceite_envio_em: "2026-10-27T10:00:00.000Z", verificada_em: null, ...over,
  };
}

function montar(inicial: TranscricaoLinha | null = null, opcoes: { http?: Array<Response | Error> } = {}) {
  const m = {
    linha: inicial as TranscricaoLinha | null,
    segredos: new Map<string, Record<string, string>>(inicial ? [[`transcricao:${ID}`, { apiKey: CHAVE }]] : []),
    ordem: [] as string[],
    patches: [] as PatchTranscricao[],
    urls: [] as string[],
  };
  const fila = [...(opcoes.http ?? [MODELOS_GROQ])];
  const deps: DepsTranscricao = {
    buscador: ((url: string) => {
      m.urls.push(url);
      const r = fila.length > 1 ? fila.shift()! : fila[0];
      return r instanceof Error ? Promise.reject(r) : Promise.resolve(r.clone());
    }) as unknown as typeof fetch,
    agora: () => new Date(AGORA),
    transcricao: {
      buscar: () => {
        return Promise.resolve(m.linha);
      },
      salvar: (patch) => {
        m.patches.push(patch);
        m.ordem.push("db:transcricao");
        const { atualizado_por: _ator, aceite_envio_por: _por, ...campos } = patch;
        m.linha = { ...(m.linha ?? linha({ aceite_envio_em: null })), ...campos } as TranscricaoLinha;
        return Promise.resolve(m.linha);
      },
    },
    segredos: {
      obter: <T>(escopo: string) => Promise.resolve((m.segredos.get(escopo) ?? null) as T | null),
      salvar: (escopo, valor) => {
        m.segredos.set(escopo, valor);
        m.ordem.push(`vault:${escopo.split(":")[0]}`);
        return Promise.resolve();
      },
    },
  };
  return { m, h: criarHandlersTranscricao(deps) };
}

const salvar = (extra: Record<string, unknown> = {}) => ({
  acao: "salvar_transcricao" as const, provedor: "groq" as const, modelo: "whisper-large-v3-turbo",
  idioma: null, apiKey: CHAVE, aceiteEnvioDados: true, ...extra,
});

async function codigoDe(promessa: Promise<unknown>): Promise<string> {
  return (await assertRejects(() => promessa, ErroCanal)).codigo;
}

// ───────────────────────── salvar ─────────────────────────
Deno.test("salvar pela primeira vez: grava a linha ANTES do segredo, aceite com autor e data; resposta sem a chave", async () => {
  const { m, h } = montar();
  m.linha = null;
  const r = await h.salvar_transcricao(salvar(), ADMIN);
  assertEquals(m.ordem, ["db:transcricao", "vault:transcricao"], "o escopo do Vault leva o id da linha");
  assertEquals(m.patches[0].aceite_envio_em, AGORA);
  assertEquals(m.patches[0].aceite_envio_por, ADMIN);
  assertEquals(m.patches[0].indicio, "EDOR", "o indício é só o fim da chave");
  assertEquals(m.segredos.get(`transcricao:${ID}`), { apiKey: CHAVE });
  assertEquals(r, { provedor: "groq", modelo: "whisper-large-v3-turbo", idioma: null, indicio: "EDOR", ativa: false, verificada: false });
  assert(!JSON.stringify(r).includes(CHAVE), "a chave nunca volta na resposta");
});

Deno.test("salvar exige chave na primeira vez e aceite do envio de dados", async () => {
  const sem = montar();
  assertEquals(await codigoDe(sem.h.salvar_transcricao(salvar({ apiKey: undefined }), ADMIN)), "chave_obrigatoria");
  assertEquals(await codigoDe(sem.h.salvar_transcricao(salvar({ aceiteEnvioDados: false }), ADMIN)), "aceite_obrigatorio");
  assertEquals(sem.m.patches.length + sem.m.segredos.size, 0, "recusa não grava nada");
});

Deno.test("trocar de provedor exige chave NOVA e novo aceite, e derruba ativa e verificação", async () => {
  const ativa = linha({ ativa: true, verificada_em: AGORA });
  const a = montar(ativa);
  const troca = salvar({ provedor: "openrouter", modelo: "openai/whisper-large-v3" });
  assertEquals(await codigoDe(a.h.salvar_transcricao({ ...troca, apiKey: undefined }, ADMIN)), "chave_obrigatoria");
  assertEquals(await codigoDe(a.h.salvar_transcricao({ ...troca, aceiteEnvioDados: false }, ADMIN)), "aceite_obrigatorio");
  const r = await a.h.salvar_transcricao(troca, ADMIN);
  assertEquals([r.ativa, r.verificada, r.provedor], [false, false, "openrouter"]);
  assertEquals(a.m.patches[0].aceite_envio_em, AGORA, "o aceite é do provedor novo");
});

Deno.test("mudar só o idioma mantém ativa e verificada; mudar modelo ou reenviar a chave derruba as duas", async () => {
  const ativa = linha({ ativa: true, verificada_em: AGORA });
  const idioma = montar(ativa);
  const r1 = await idioma.h.salvar_transcricao(salvar({ apiKey: undefined, idioma: "pt", aceiteEnvioDados: false }), ADMIN);
  assertEquals([r1.ativa, r1.verificada, r1.idioma], [true, true, "pt"]);
  assertEquals(idioma.m.patches[0].aceite_envio_em, undefined, "aceite já registrado para este provedor não é refeito");

  const modelo = montar(ativa);
  const r2 = await modelo.h.salvar_transcricao(salvar({ apiKey: undefined, modelo: "whisper-large-v3", aceiteEnvioDados: false }), ADMIN);
  assertEquals([r2.ativa, r2.verificada], [false, false]);

  const chave = montar(ativa);
  const r3 = await chave.h.salvar_transcricao(salvar({ apiKey: "gsk_OUTRA-CHAVE-9999", aceiteEnvioDados: false }), ADMIN);
  assertEquals([r3.ativa, r3.verificada, r3.indicio], [false, false, "9999"]);
  assertEquals(chave.m.segredos.get(`transcricao:${ID}`), { apiKey: "gsk_OUTRA-CHAVE-9999" });
});

// ───────────────────────── testar ─────────────────────────
Deno.test("testar: chave e modelo verificados na lista do provedor; carimba a verificação", async () => {
  const { m, h } = montar(linha());
  assertEquals(await h.testar_transcricao({ acao: "testar_transcricao" }, ADMIN), { verificada: true });
  assertEquals(m.urls, ["https://api.groq.com/openai/v1/models"]);
  assertEquals(m.linha?.verificada_em, AGORA);
});

Deno.test("testar sem configuração ou sem chave guardada é 409, sem rede", async () => {
  const nada = montar();
  assertEquals(await codigoDe(nada.h.testar_transcricao({ acao: "testar_transcricao" }, ADMIN)), "transcricao_nao_configurada");
  const semChave = montar(linha());
  semChave.m.segredos.clear();
  assertEquals(await codigoDe(semChave.h.testar_transcricao({ acao: "testar_transcricao" }, ADMIN)), "chave_ausente");
  assertEquals(nada.m.urls.length + semChave.m.urls.length, 0);
});

Deno.test("testar: chave recusada ou modelo ausente DESLIGAM; provedor fora do ar só avisa", async () => {
  const ativa = linha({ ativa: true, verificada_em: AGORA });
  for (const [http, codigo] of [
    [[new Response("x", { status: 401 })], "chave_recusada"],
    [[json({ data: [{ id: "outro" }] })], "modelo_indisponivel"],
  ] as Array<[Response[], string]>) {
    const { m, h } = montar(ativa, { http });
    assertEquals(await codigoDe(h.testar_transcricao({ acao: "testar_transcricao" }, ADMIN)), codigo);
    assertEquals([m.linha?.ativa, m.linha?.verificada_em], [false, null], codigo);
  }
  const queda = montar(ativa, { http: [new Response("x", { status: 503 })] });
  assertEquals(await codigoDe(queda.h.testar_transcricao({ acao: "testar_transcricao" }, ADMIN)), "provedor_indisponivel");
  assertEquals([queda.m.linha?.ativa, queda.m.linha?.verificada_em], [true, AGORA], "queda passageira não derruba a transcrição");
});

Deno.test("testar: configuração trocada DURANTE o teste não carimba a prova antiga", async () => {
  const carimbos: PatchTranscricao[] = [];
  let leituras = 0;
  const h = criarHandlersTranscricao({
    buscador: (() => Promise.resolve(MODELOS_GROQ.clone())) as unknown as typeof fetch,
    agora: () => new Date(AGORA),
    transcricao: {
      // 1ª leitura: antes do teste. 2ª: depois — outra pessoa trocou a chave (o indício muda).
      buscar: () => Promise.resolve(++leituras === 1 ? linha() : linha({ indicio: "NOVA" })),
      salvar: (patch) => {
        carimbos.push(patch);
        return Promise.resolve(linha());
      },
    },
    segredos: { obter: <T>() => Promise.resolve({ apiKey: CHAVE } as T), salvar: () => Promise.resolve() },
  });
  assertEquals(await codigoDe(h.testar_transcricao({ acao: "testar_transcricao" }, ADMIN)), "conflito_configuracao");
  assertEquals(carimbos.length, 0, "nada foi carimbado");
});

// ───────────────────────── ligar ─────────────────────────
Deno.test("ligar exige aceite e verificação; desligar é sempre permitido", async () => {
  const naoVerificada = montar(linha());
  assertEquals(await codigoDe(naoVerificada.h.definir_transcricao_ativa({ acao: "definir_transcricao_ativa", ativa: true }, ADMIN)), "transcricao_nao_verificada");
  const semAceite = montar(linha({ aceite_envio_em: null, verificada_em: AGORA }));
  assertEquals(await codigoDe(semAceite.h.definir_transcricao_ativa({ acao: "definir_transcricao_ativa", ativa: true }, ADMIN)), "transcricao_nao_verificada");
  const pronta = montar(linha({ verificada_em: AGORA }));
  assertEquals(await pronta.h.definir_transcricao_ativa({ acao: "definir_transcricao_ativa", ativa: true }, ADMIN), { ativa: true });
  assertEquals(pronta.m.linha?.ativa, true);
  assertEquals(await pronta.h.definir_transcricao_ativa({ acao: "definir_transcricao_ativa", ativa: false }, ADMIN), { ativa: false });
  assertEquals(await codigoDe(montar().h.definir_transcricao_ativa({ acao: "definir_transcricao_ativa", ativa: false }, ADMIN)), "transcricao_nao_configurada");
});

// ───────────────────────── pela porta HTTP de canal-evolution ─────────────────────────
function porta(inicial: TranscricaoLinha | null) {
  const { m } = montar(inicial);
  const logs: string[] = [];
  const original = console.warn;
  const originalLog = console.log;
  console.warn = (...a: unknown[]) => void logs.push(a.join(" "));
  console.log = (...a: unknown[]) => void logs.push(a.join(" "));
  const deps = {
    limite: () => Promise.resolve({ permitido: true, reiniciaEm: null }),
    autenticarAdmin: () => Promise.resolve({ userId: ADMIN }),
    exigirCsrf: (req: Request) => {
      if (req.headers.get("X-Akros-Csrf") !== "1") throw new HttpError(401, "Requisição sem proteção CSRF");
    },
    cors: () => ({}),
    buscador: (() => Promise.resolve(MODELOS_GROQ.clone())) as unknown as typeof fetch,
    agora: () => new Date(AGORA),
    transcricao: {
      buscar: () => Promise.resolve(m.linha),
      salvar: (p: PatchTranscricao) => {
        m.linha = { ...(m.linha ?? linha({ aceite_envio_em: null })), ...p } as TranscricaoLinha;
        return Promise.resolve(m.linha);
      },
    },
    segredos: {
      obter: <T>(escopo: string) => Promise.resolve((m.segredos.get(escopo) ?? null) as T | null),
      salvar: (escopo: string, valor: Record<string, string>) => {
        m.segredos.set(escopo, valor);
        return Promise.resolve();
      },
    },
  } as unknown as DepsCanalEvolution;
  const chamar = async (corpo: unknown, csrf = true) => {
    const r = await criarManipuladorCanalEvolution(deps)(
      new Request("https://p.supabase.co/functions/v1/canal-evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrf ? { "X-Akros-Csrf": "1" } : {}) },
        body: JSON.stringify(corpo),
      }),
    );
    return { status: r.status, texto: await r.text() };
  };
  return { chamar, logs, restaurar: () => { console.warn = original; console.log = originalLog; } };
}

Deno.test("pela porta HTTP: schema estrito, CSRF obrigatório e a chave não aparece em resposta nem em log", async () => {
  const p = porta(null);
  try {
    assertEquals((await p.chamar(salvar(), false)).status, 401);
    assertEquals((await p.chamar({ ...salvar(), extra: 1 })).status, 400, "campo desconhecido é recusado");
    assertEquals((await p.chamar(salvar({ provedor: "openai" }))).status, 400, "OpenAI (whisper-1 descontinuado) não é provedor aceito");
    assertEquals((await p.chamar(salvar({ modelo: "x; drop table" }))).status, 400);
    const ok = await p.chamar(salvar());
    assertEquals(ok.status, 200);
    assertEquals((await p.chamar({ acao: "testar_transcricao" })).status, 200);
    assertEquals((await p.chamar({ acao: "definir_transcricao_ativa", ativa: true })).status, 200);
    const tudo = [ok.texto, ...p.logs].join("\n");
    assert(!tudo.includes(CHAVE), "chave vazou em resposta ou log");
  } finally {
    p.restaurar();
  }
});
