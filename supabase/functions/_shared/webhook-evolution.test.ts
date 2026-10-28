import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DepsAgente } from "./agente.ts";
import type { EntradaCanal } from "./canais/tipos.ts";
import type { RegraAgente } from "./openrouter.ts";
import { criarManipuladorEvolution } from "./webhook-evolution.ts";
import type { ConfigTranscricao, ContaCanal, IOEvolution } from "./webhook.ts";

const CONTA_ID = "11111111-1111-4111-8111-111111111111";
const TOKEN = "WHTOKEN";
const REGRA: RegraAgente = {
  id: "ag", nome_agente: "Ana", funcao: "triagem", alma: "x", saudacao: "o",
  mensagem_handoff: "Encaminho à equipe.", llm: { provedor: "openrouter", modelo: "m" },
};
const CONTA_OK: ContaCanal = {
  id: CONTA_ID,
  ativa: true,
  credenciais_configuradas: true,
  metadados_publicos: {},
  nome_instancia: "akros-instancia",
  estado_conexao: "conectado_verificado",
  identificador: "5511988881001",
};
const SERVIDOR = { urlBase: "https://evo.exemplo.com", apiKey: "GLOBALKEY" };

interface Chamada {
  url: string;
  metodo: string;
  headers: Record<string, string>;
  corpo: unknown;
}

interface Espiao {
  consultasBanco: number;
  registrados: EntradaCanal[];
  concluidos: string[];
  chamadas: Chamada[];
  conexoes: Array<{ estado: string; codigo: string | null }>;
  anexos: Array<{ origemId: string; mime: string; tamanho: number }>;
  iaChamada: number;
  vinculos: string[];
}

interface Opcoes {
  conta?: ContaCanal | null;
  segredo?: unknown;
  servidor?: typeof SERVIDOR | null;
  limite?: boolean;
  registrarFalha?: boolean;
  iaFalha?: boolean;
  jaRecebida?: boolean;
  cliente?: { id: string; nome: string } | null;
  /** Histórico da conversa (mensagens do banco) para a trava de encaminhamento repetido. */
  historico?: unknown[];
  /** Respostas da Evolution (e do provedor de transcrição) por trecho de URL. */
  evolution?: Record<string, () => Response>;
  /** Transcrição: config ligada, `null` = desligada, `"erro"` = falha ao ler a configuração. */
  transcricao?: ConfigTranscricao | null | "erro";
  limiteTranscricao?: boolean;
}

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

function montar(a: Opcoes = {}): { io: IOEvolution; e: Espiao } {
  const e: Espiao = {
    consultasBanco: 0, registrados: [], concluidos: [], chamadas: [], conexoes: [], anexos: [], iaChamada: 0, vinculos: [],
  };
  const respostas: Record<string, () => Response> = {
    "/message/sendText/": () => json({ key: { id: "OUT" } }, 201),
    ...a.evolution,
  };
  const buscador = ((url: string, init: RequestInit = {}) => {
    e.chamadas.push({
      url,
      metodo: init.method ?? "GET",
      headers: init.headers as Record<string, string>,
      corpo: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });
    const chave = Object.keys(respostas).find((k) => url.includes(k));
    return Promise.resolve(chave ? respostas[chave]() : new Response("{}", { status: 404 }));
  }) as unknown as typeof fetch;

  const io: IOEvolution = {
    buscador,
    limite: () => Promise.resolve({ permitido: a.limite ?? true, reiniciaEm: null }),
    carregarConta: () => {
      e.consultasBanco++;
      return Promise.resolve(a.conta === undefined ? CONTA_OK : a.conta);
    },
    segredo: <T>() => {
      e.consultasBanco++;
      return Promise.resolve((a.segredo === undefined ? { webhookToken: TOKEN } : a.segredo) as T | null);
    },
    servidorEvolution: () => Promise.resolve(a.servidor === undefined ? SERVIDOR : a.servidor),
    atualizarConexao: (_id, estado, codigo) => {
      e.conexoes.push({ estado, codigo });
      return Promise.resolve();
    },
    jaRecebida: () => Promise.resolve(a.jaRecebida ?? false),
    guardarAnexo: ({ origemId, mime, bytes }) => {
      e.anexos.push({ origemId, mime, tamanho: bytes.byteLength });
      return Promise.resolve(`${CONTA_ID}/${origemId}`);
    },
    validarUrl: () => Promise.resolve(),
    transcricao: () => {
      if (a.transcricao === "erro") return Promise.reject(new Error("banco"));
      return Promise.resolve(a.transcricao ?? null);
    },
    limiteTranscricao: () => Promise.resolve({ permitido: a.limiteTranscricao ?? true, reiniciaEm: null }),
    criarDeps: ({ enviar }): DepsAgente => ({
      vincularCliente: (contato) => {
        e.vinculos.push(contato);
        return Promise.resolve(a.cliente ?? null);
      },
      registrar: ({ entrada }) => {
        if (a.registrarFalha) return Promise.reject(new Error("banco"));
        e.registrados.push(entrada);
        return Promise.resolve({ processar: true, conversaId: "c1" });
      },
      concluir: ({ status }) => {
        e.concluidos.push(status);
        return Promise.resolve();
      },
      agenteDaConta: () => Promise.resolve(REGRA),
      chaveOpenRouter: () => Promise.resolve("sk"),
      historico: () => Promise.resolve(a.historico ?? []),
      gerarResposta: () => {
        e.iaChamada++;
        return a.iaFalha ? Promise.reject(new Error("ia")) : Promise.resolve({ texto: "Resposta do agente", custo: null });
      },
      enviar,
      log: () => {},
    }),
  };
  return { io, e };
}

const URL_EVO = `https://p.supabase.co/functions/v1/evolution-webhook?conta=${CONTA_ID}`;
const evento = (mensagem: Record<string, unknown>, key: Record<string, unknown> = {}, id = "3EB0") => ({
  event: "messages.upsert",
  data: {
    key: { remoteJid: "5511988881001@s.whatsapp.net", fromMe: false, id, ...key },
    pushName: "Maria",
    message: mensagem,
    messageTimestamp: 1790000000,
  },
});
const texto = (t = "Oi") => evento({ conversation: t });
const req = (payload: unknown, token: string | null = TOKEN, method = "POST") =>
  new Request(URL_EVO, { method, body: method === "POST" ? JSON.stringify(payload) : undefined, headers: token === null ? {} : { "x-akros-webhook": token } });
const POST = (io: IOEvolution, payload: unknown, token: string | null = TOKEN) => criarManipuladorEvolution(io)(req(payload, token));

// ───────────────────────── autenticação, limites e canal ─────────────────────────
Deno.test("token ausente ou errado é 401 e NADA é lido nem processado", async () => {
  const { io, e } = montar();
  assertEquals((await POST(io, texto(), null)).status, 401);
  assertEquals((await POST(io, texto(), "outro")).status, 401);
  assertEquals((await POST(montar({ segredo: null }).io, texto())).status, 401);
  assertEquals((await POST(montar({ segredo: { webhookToken: "" } }).io, texto(), "")).status, 401);
  assertEquals([e.registrados.length, e.chamadas.length], [0, 0]);
  // corpo inválido SEM token continua 401 (o JSON nem foi aberto)
  const ruim = new Request(URL_EVO, { method: "POST", body: "{{{" });
  assertEquals((await criarManipuladorEvolution(io)(ruim)).status, 401);
});

Deno.test("conta inexistente é 404; UUID inválido nem consulta o banco; limite é 429; método errado é 405", async () => {
  assertEquals((await POST(montar({ conta: null }).io, texto())).status, 404);
  const a = montar();
  assertEquals((await criarManipuladorEvolution(a.io)(new Request("https://p/f?conta=nao-uuid", { method: "POST" }))).status, 404);
  assertEquals(a.e.consultasBanco, 0);
  const lim = montar({ limite: false });
  const r = await POST(lim.io, texto());
  assertEquals(r.status, 429);
  assertEquals(lim.e.consultasBanco, 0, "rate limit vem antes de qualquer consulta");
  assertEquals((await criarManipuladorEvolution(montar().io)(req(null, TOKEN, "GET"))).status, 405);
});

Deno.test("JSON inválido autenticado é 400 e corpo acima do limite é 413", async () => {
  const { io } = montar();
  const ruim = new Request(URL_EVO, { method: "POST", body: "{{{", headers: { "x-akros-webhook": TOKEN } });
  assertEquals((await criarManipuladorEvolution(io)(ruim)).status, 400);
  const grande = new Request(URL_EVO, { method: "POST", body: "x".repeat(70 * 1024), headers: { "x-akros-webhook": TOKEN } });
  assertEquals((await criarManipuladorEvolution(io)(grande)).status, 413);
});

Deno.test("a resposta ao provedor nunca descreve o motivo", async () => {
  for (const r of [await POST(montar().io, texto(), "x"), await POST(montar().io, texto())]) {
    const corpo = await r.json();
    assertEquals(Object.keys(corpo), ["ok"]);
  }
});

// ───────────────────────── texto ─────────────────────────
Deno.test("texto: agente responde por sendText com a chave do servidor, no formato v2 e só dígitos", async () => {
  const { io, e } = montar();
  assertEquals((await POST(io, texto())).status, 200);
  const envio = e.chamadas.find((c) => c.url.includes("/message/sendText/"));
  assert(envio);
  assertEquals(envio.url, "https://evo.exemplo.com/message/sendText/akros-instancia");
  assertEquals(envio.headers.apikey, "GLOBALKEY");
  assertEquals(envio.corpo, { number: "5511988881001", text: "Resposta do agente" });
  assertEquals(e.concluidos, ["respondido"]);
  assertEquals(e.registrados[0].identificacao, "identificada");
  assertEquals(e.registrados[0].encaminhar, false);
});

Deno.test("pedido por humano/advogado recebe o encaminhamento sem chamar a IA", async () => {
  const { io, e } = montar();
  await POST(io, texto("quero falar com um advogado"));
  assertEquals(e.iaChamada, 0);
  assertEquals(e.concluidos, ["handoff"]);
});

Deno.test("canal ainda não conectado/verificado registra e NÃO responde", async () => {
  for (const estado of ["aguardando_pareamento", "desconectado", "configuracao_incompleta"]) {
    const { io, e } = montar({ conta: { ...CONTA_OK, estado_conexao: estado } });
    await POST(io, texto());
    assertEquals([e.registrados.length, e.concluidos, e.chamadas.some((c) => c.url.includes("sendText"))], [1, ["ignorado"], false], estado);
  }
  const inativa = montar({ conta: { ...CONTA_OK, ativa: false } });
  await POST(inativa.io, texto());
  assertEquals(inativa.e.concluidos, ["ignorado"]);
  const semServidor = montar({ servidor: null });
  await POST(semServidor.io, texto());
  assertEquals([semServidor.e.registrados.length, semServidor.e.concluidos], [1, ["ignorado"]]);
});

Deno.test("reentrega processa de novo? não: falha ao registrar é 500 (reenvia); falha da IA ainda é 200", async () => {
  assertEquals((await POST(montar({ registrarFalha: true }).io, texto())).status, 500);
  const ia = montar({ iaFalha: true });
  assertEquals((await POST(ia.io, texto())).status, 200);
  assertEquals(ia.e.concluidos, ["falhou"]);
});

Deno.test("telefone com um único cliente vincula; vínculo é tentado só para contato identificado", async () => {
  const { io, e } = montar({ cliente: { id: "cli", nome: "Maria Silva" } });
  await POST(io, texto());
  assertEquals(e.vinculos, ["5511988881001"]);
});

// ───────────────────────── ignorados (e só eles) ─────────────────────────
Deno.test("grupo, própria conta, reação e protocolo: 200 sem registrar nem responder", async () => {
  const { io, e } = montar();
  for (
    const p of [
      evento({ conversation: "x" }, { remoteJid: "1203@g.us" }),
      evento({ conversation: "x" }, { fromMe: true }),
      evento({ reactionMessage: { text: "👍" } }),
      evento({ protocolMessage: { type: 0 } }),
      { event: "presence.update", data: {} },
    ]
  ) {
    assertEquals((await POST(io, p)).status, 200);
  }
  assertEquals([e.registrados.length, e.chamadas.length], [0, 0]);
});

// ───────────────────────── eventos de conexão ─────────────────────────
const conexao = (state: string) => ({ event: "connection.update", instance: "akros-instancia", data: { state } });
const pareado = (numero: string) => ({
  "/instance/fetchInstances": () => json([{ name: "akros-instancia", ownerJid: `${numero}:7@s.whatsapp.net` }]),
});

Deno.test("close derruba quem estava conectado; durante o pareamento é o ciclo normal do QR", async () => {
  const a = montar();
  await POST(a.io, conexao("close"));
  assertEquals(a.e.conexoes, [{ estado: "desconectado", codigo: "sessao_encerrada" }]);
  const b = montar({ conta: { ...CONTA_OK, estado_conexao: "aguardando_pareamento" } });
  await POST(b.io, conexao("close"));
  assertEquals(b.e.conexoes, []);
  assertEquals(b.e.registrados.length, 0, "evento de conexão nunca vira mensagem");
});

Deno.test("open só marca conectado se o número pareado for o cadastrado (nono dígito tolerado)", async () => {
  const igual = montar({ conta: { ...CONTA_OK, estado_conexao: "aguardando_pareamento" }, evolution: pareado("551188881001") });
  await POST(igual.io, conexao("open"));
  assertEquals(igual.e.conexoes, [{ estado: "conectado_verificado", codigo: null }]);

  const outro = montar({ conta: { ...CONTA_OK, estado_conexao: "aguardando_pareamento" }, evolution: pareado("5511977770000") });
  await POST(outro.io, conexao("open"));
  assertEquals(outro.e.conexoes, [{ estado: "aguardando_pareamento", codigo: "numero_divergente" }]);

  const trocou = montar({ evolution: pareado("5511977770000") });
  await POST(trocou.io, conexao("open"));
  assertEquals(trocou.e.conexoes, [{ estado: "desconectado", codigo: "numero_divergente" }]);

  const jaOk = montar({ evolution: pareado("5511988881001") });
  await POST(jaOk.io, conexao("open"));
  assertEquals(jaOk.e.conexoes, [], "já conectado e conferido: sem escrita à toa");
});

Deno.test("falha ao conferir o número no open não derruba o webhook nem muda o estado", async () => {
  const { io, e } = montar({
    conta: { ...CONTA_OK, estado_conexao: "aguardando_pareamento" },
    evolution: { "/instance/fetchInstances": () => new Response("x", { status: 500 }) },
  });
  assertEquals((await POST(io, conexao("open"))).status, 200);
  assertEquals(e.conexoes, []);
});

Deno.test("QR atualizado, atualização de mensagem e envio são reconhecidos sem efeito", async () => {
  const { io, e } = montar();
  for (const nome of ["qrcode.updated", "messages.update", "send.message"]) {
    assertEquals((await POST(io, { event: nome, data: {} })).status, 200);
  }
  assertEquals([e.registrados.length, e.conexoes.length, e.chamadas.length], [0, 0, 0]);
});

// ───────────────────────── @lid (remetente sem número) ─────────────────────────
const lid = (extra: Record<string, unknown> = {}, id = "L1") =>
  evento({ conversation: "Oi, sou eu" }, { remoteJid: "9988776655@lid", ...extra }, id);
const historico = (...registros: unknown[]) => ({ "/chat/findMessages/": () => json({ messages: { records: registros } }) });
const reg = (extra: Record<string, unknown>) => ({ key: { remoteJid: "9988776655@lid", fromMe: false, ...extra } });

Deno.test("@lid com telefone alternativo no evento: identificada e respondida nesse telefone", async () => {
  const { io, e } = montar();
  await POST(io, lid({ remoteJidAlt: "5511966660000@s.whatsapp.net" }));
  assertEquals([e.registrados[0].contatoExterno, e.registrados[0].identificacao], ["5511966660000", "identificada"]);
  assertEquals(e.chamadas.find((c) => c.url.includes("sendText"))?.corpo, { number: "5511966660000", text: "Resposta do agente" });
});

Deno.test("@lid sem alternativo: um único par comprovado no histórico da instância identifica", async () => {
  const { io, e } = montar({ evolution: historico(reg({ remoteJidAlt: "5511966660000@s.whatsapp.net" })) });
  await POST(io, lid());
  assertEquals([e.registrados[0].contatoExterno, e.registrados[0].identificacao], ["5511966660000", "identificada"]);
});

Deno.test("@lid sem prova (histórico vazio, ambíguo ou fora do ar): GUARDA como não identificada, sem vínculo e sem resposta", async () => {
  for (
    const evolution of [
      historico(),
      historico(reg({ remoteJidAlt: "5511966660000@s.whatsapp.net" }), reg({ remoteJidAlt: "5511955550000@s.whatsapp.net" })),
      { "/chat/findMessages/": () => new Response("x", { status: 500 }) },
    ]
  ) {
    const { io, e } = montar({ evolution, cliente: { id: "cli", nome: "Não deve vincular" } });
    assertEquals((await POST(io, lid())).status, 200);
    assertEquals(e.registrados.length, 1, "a mensagem NÃO é descartada");
    assertEquals([e.registrados[0].identificacao, e.registrados[0].contatoExterno], ["nao_identificada", "lid:9988776655"]);
    assertEquals(e.vinculos, [], "não tenta vincular a cliente");
    assertEquals(e.concluidos, ["ignorado"]);
    assertEquals(e.chamadas.some((c) => c.url.includes("sendText")), false, "ninguém responde por palpite");
  }
});

Deno.test("telefones conflitantes no evento: guardada como não identificada", async () => {
  const { io, e } = montar();
  await POST(io, evento({ conversation: "Oi" }, {
    remoteJid: "5511988881001@s.whatsapp.net",
    remoteJidAlt: "5511977770000@s.whatsapp.net",
  }));
  assertEquals(e.registrados[0].identificacao, "nao_identificada");
  assert(e.registrados[0].contatoExterno.startsWith("conflito:"));
});

// ───────────────────────── anexos ─────────────────────────
const midia = (corpo: Record<string, unknown> = {}) => ({
  "/chat/getBase64FromMediaMessage/": () => json({ base64: "QUJDREVG", mimetype: "application/pdf", fileName: "a.pdf", ...corpo }),
});
const documento = (extra: Record<string, unknown> = {}, id = "D1", key: Record<string, unknown> = {}) =>
  evento({ documentMessage: { mimetype: "application/pdf", fileName: "passaporte.pdf", caption: "segue", fileLength: 6, ...extra } }, key, id);

Deno.test("documento: baixa, guarda no bucket, registra com anexo e envia SÓ o encaminhamento (sem IA)", async () => {
  const { io, e } = montar({ evolution: midia() });
  assertEquals((await POST(io, documento())).status, 200);
  assertEquals(e.anexos, [{ origemId: "D1", mime: "application/pdf", tamanho: 6 }]);
  const entrada = e.registrados[0];
  assertEquals([entrada.tipo, entrada.texto, entrada.encaminhar, entrada.identificacao], ["arquivo", "segue", true, "identificada"]);
  assertEquals(entrada.anexo, {
    nome: "passaporte.pdf", mime: "application/pdf", tamanhoBytes: 6, baixado: true, caminho: `${CONTA_ID}/D1`,
  });
  assertEquals(e.iaChamada, 0);
  assertEquals(e.concluidos, ["handoff"]);
  assertEquals(e.chamadas.find((c) => c.url.includes("sendText"))?.corpo, { number: "5511988881001", text: "Encaminho à equipe." });
  const baixa = e.chamadas.find((c) => c.url.includes("getBase64FromMediaMessage"));
  assertEquals(baixa?.corpo, { message: { key: { id: "D1" } }, convertToMp4: false });
});

Deno.test("imagem, áudio e vídeo também são guardados com o tipo certo", async () => {
  const casos: Array<[Record<string, unknown>, string, string]> = [
    [{ imageMessage: { mimetype: "image/jpeg", fileLength: 4 } }, "imagem", "image/jpeg"],
    [{ audioMessage: { mimetype: "audio/ogg; codecs=opus", fileLength: 4 } }, "audio", "audio/ogg"],
    [{ videoMessage: { mimetype: "video/mp4", fileLength: 4 } }, "video", "video/mp4"],
  ];
  for (const [mensagem, tipo, mime] of casos) {
    const { io, e } = montar({ evolution: midia({ mimetype: mime }) });
    await POST(io, evento(mensagem, {}, `M-${tipo}`));
    assertEquals([e.registrados[0].tipo, e.registrados[0].anexo?.baixado, e.anexos[0].mime], [tipo, true, mime], tipo);
  }
});

Deno.test("anexo acima do limite ou de tipo não permitido: mensagem registrada 'não baixado', sem download", async () => {
  const grande = montar({ evolution: midia() });
  await POST(grande.io, documento({ fileLength: 99 * 1024 * 1024 }));
  assertEquals(grande.e.registrados[0].anexo, { nome: "passaporte.pdf", mime: "application/pdf", tamanhoBytes: 99 * 1024 * 1024, baixado: false, motivo: "tamanho" });
  assertEquals(grande.e.chamadas.some((c) => c.url.includes("getBase64")), false);

  const exe = montar({ evolution: midia() });
  await POST(exe.io, documento({ mimetype: "application/x-msdownload", fileName: "virus.exe" }));
  assertEquals(exe.e.registrados[0].anexo?.motivo, "tipo");
  assertEquals(exe.e.anexos.length, 0);
  assertEquals(exe.e.concluidos, ["handoff"]);
});

Deno.test("mime real diferente do declarado também passa pela lista de tipos", async () => {
  const { io, e } = montar({ evolution: midia({ mimetype: "text/html" }) });
  await POST(io, documento());
  assertEquals(e.registrados[0].anexo?.motivo, "tipo");
  assertEquals(e.anexos.length, 0);
});

Deno.test("falha ao baixar (500, base64 inválido, bucket fora do ar): ainda registra, motivo 'download'", async () => {
  const falhas: Array<Opcoes["evolution"]> = [
    { "/chat/getBase64FromMediaMessage/": () => new Response("x", { status: 500 }) },
    midia({ base64: "@@@ não é base64 @@@" }),
  ];
  for (const evolution of falhas) {
    const { io, e } = montar({ evolution });
    assertEquals((await POST(io, documento())).status, 200);
    assertEquals(e.registrados[0].anexo?.baixado, false);
    assertEquals(e.registrados[0].anexo?.motivo, "download");
    assertEquals(e.concluidos, ["handoff"]);
  }
  const { io, e } = montar({ evolution: midia() });
  io.guardarAnexo = () => Promise.reject(new Error("bucket"));
  await POST(io, documento());
  assertEquals(e.registrados[0].anexo?.motivo, "download");
});

Deno.test("sem servidor compatível: anexo é registrado 'não baixado' (nada some)", async () => {
  const { io, e } = montar({ servidor: null });
  await POST(io, documento());
  assertEquals([e.registrados.length, e.registrados[0].anexo?.motivo, e.concluidos], [1, "download", ["ignorado"]]);
});

Deno.test("reentrega da mídia: não baixa nem registra de novo", async () => {
  const { io, e } = montar({ evolution: midia(), jaRecebida: true });
  assertEquals((await POST(io, documento())).status, 200);
  assertEquals([e.registrados.length, e.anexos.length, e.chamadas.length], [0, 0, 0]);
});

Deno.test("anexo de remetente não identificado: guardado, sem resposta e sem vínculo", async () => {
  const { io, e } = montar({ evolution: { ...midia(), ...historico() } });
  await POST(io, evento({ documentMessage: { mimetype: "application/pdf", fileName: "x.pdf", fileLength: 6 } }, { remoteJid: "9988776655@lid" }, "D9"));
  assertEquals(e.registrados[0].identificacao, "nao_identificada");
  assertEquals(e.registrados[0].anexo?.baixado, true);
  assertEquals(e.concluidos, ["ignorado"]);
  assertEquals(e.chamadas.some((c) => c.url.includes("sendText")), false);
});

Deno.test("figurinha: aviso em texto + encaminhamento, sem IA", async () => {
  const { io, e } = montar();
  await POST(io, evento({ stickerMessage: {} }, {}, "S1"));
  assertEquals([e.registrados[0].texto, e.registrados[0].encaminhar, e.iaChamada, e.concluidos], ["[Figurinha recebida]", true, 0, ["handoff"]]);
});

// SC-009: nenhuma mensagem individual some em silêncio.
Deno.test("SC-009: todo tipo de mensagem individual vira mensagem registrada", async () => {
  const tipos: Array<[string, Record<string, unknown>]> = [
    ["texto", { conversation: "oi" }],
    ["texto estendido", { extendedTextMessage: { text: "oi" } }],
    ["imagem", { imageMessage: { mimetype: "image/png" } }],
    ["documento", { documentMessage: { mimetype: "application/pdf" } }],
    ["áudio", { audioMessage: { mimetype: "audio/ogg" } }],
    ["vídeo", { videoMessage: { mimetype: "video/mp4" } }],
    ["figurinha", { stickerMessage: {} }],
    ["contato", { contactMessage: {} }],
    ["localização", { locationMessage: {} }],
    ["enquete", { pollCreationMessage: {} }],
    ["efêmera", { ephemeralMessage: { message: { conversation: "oi" } } }],
  ];
  for (const [nome, mensagem] of tipos) {
    const { io, e } = montar({ evolution: midia({ mimetype: "image/png" }) });
    assertEquals((await POST(io, evento(mensagem, {}, `T-${nome}`))).status, 200, nome);
    assertEquals(e.registrados.length, 1, `${nome} precisa virar mensagem`);
  }
});

// ───────────────────────── encaminhamento repetido ─────────────────────────
const AVISO = { autor: "agente_ia", texto: "Encaminho à equipe." };

Deno.test("cliente que manda várias fotos recebe UM encaminhamento (não dez)", async () => {
  const recente = { ...AVISO, enviadoEm: new Date(Date.now() - 60_000).toISOString() };
  const { io, e } = montar({ evolution: midia(), historico: [recente] });
  assertEquals((await POST(io, evento({ imageMessage: { mimetype: "image/jpeg", fileLength: 6 } }, {}, "F2"))).status, 200);
  assertEquals(e.registrados.length, 1, "a foto É registrada");
  assertEquals(e.chamadas.some((c) => c.url.includes("/message/sendText/")), false, "mas o aviso não se repete");
  assertEquals(e.concluidos, ["handoff"]);
});

Deno.test("passada a janela de 10 minutos, ou com outra resposta no meio, o encaminhamento volta a sair", async () => {
  const antigo = { ...AVISO, enviadoEm: new Date(Date.now() - 11 * 60_000).toISOString() };
  const a = montar({ evolution: midia(), historico: [antigo] });
  await POST(a.io, evento({ imageMessage: { mimetype: "image/jpeg", fileLength: 6 } }, {}, "F3"));
  assertEquals(a.e.chamadas.some((c) => c.url.includes("/message/sendText/")), true);

  const outra = { autor: "agente_ia", texto: "Outra resposta", enviadoEm: new Date().toISOString() };
  const b = montar({ evolution: midia(), historico: [{ ...AVISO, enviadoEm: new Date().toISOString() }, outra] });
  await POST(b.io, evento({ stickerMessage: {} }, {}, "S2"));
  assertEquals(b.e.chamadas.some((c) => c.url.includes("/message/sendText/")), true, "a última fala do agente não foi o aviso");
});

// ───────────────────────── transcrição de áudio (ADR-0022) ─────────────────────────
const GROQ: ConfigTranscricao = { provedor: "groq", modelo: "whisper-large-v3-turbo", idioma: null, chave: "gsk_CHAVE-DO-PROVEDOR" };
const URL_GROQ = "api.groq.com/openai/v1/audio/transcriptions";
const audioOgg = (extra: Record<string, unknown> = {}) => ({ audioMessage: { mimetype: "audio/ogg; codecs=opus", fileLength: 6, ptt: true, ...extra } });
const midiaAudio = () => midia({ mimetype: "audio/ogg; codecs=opus", fileName: null });
const fala = (texto: string) => ({ [URL_GROQ]: () => json({ text: texto, usage: { seconds: 4 } }) });

Deno.test("áudio com transcrição ligada: o texto falado vira a mensagem e o agente ATENDE (sem encaminhar)", async () => {
  const { io, e } = montar({ transcricao: GROQ, evolution: { ...midiaAudio(), ...fala("Oi, quero saber sobre o visto EB-2") } });
  assertEquals((await POST(io, evento(audioOgg(), {}, "A1"))).status, 200);
  const entrada = e.registrados[0];
  assertEquals([entrada.tipo, entrada.texto, entrada.encaminhar], ["audio", "Oi, quero saber sobre o visto EB-2", false]);
  assertEquals(entrada.anexo?.baixado, true, "o áudio original continua guardado");
  assertEquals(entrada.anexo?.transcricao, { estado: "concluida", provedor: "groq", modelo: "whisper-large-v3-turbo" });
  assertEquals([e.iaChamada, e.concluidos], [1, ["respondido"]]);
  assertEquals(e.chamadas.find((c) => c.url.includes("sendText"))?.corpo, { number: "5511988881001", text: "Resposta do agente" });
  const chamada = e.chamadas.find((c) => c.url.includes(URL_GROQ));
  assertEquals(chamada?.headers.authorization, "Bearer gsk_CHAVE-DO-PROVEDOR");
  assert(!JSON.stringify(e.registrados).includes("gsk_CHAVE"), "a chave do provedor nunca entra no registro");
});

Deno.test("áudio transcrito que pede um advogado recebe o encaminhamento, sem chamar a IA", async () => {
  const { io, e } = montar({ transcricao: GROQ, evolution: { ...midiaAudio(), ...fala("Quero falar com um advogado") } });
  await POST(io, evento(audioOgg(), {}, "A2"));
  assertEquals([e.iaChamada, e.concluidos], [0, ["handoff"]]);
  assertEquals(e.chamadas.find((c) => c.url.includes("sendText"))?.corpo, { number: "5511988881001", text: "Encaminho à equipe." });
});

Deno.test("transcrição desligada: nada muda (anexo + encaminhamento) e o provedor não é chamado", async () => {
  const { io, e } = montar({ transcricao: null, evolution: { ...midiaAudio(), ...fala("não deveria chamar") } });
  await POST(io, evento(audioOgg(), {}, "A3"));
  assertEquals([e.registrados[0].encaminhar, e.registrados[0].texto, e.registrados[0].anexo?.transcricao], [true, "", undefined]);
  assertEquals(e.chamadas.some((c) => c.url.includes("groq")), false);
  assertEquals([e.iaChamada, e.concluidos], [0, ["handoff"]]);
});

Deno.test("provedor falha, áudio sem fala, teto estourado ou configuração ilegível: guarda, registra o MOTIVO e encaminha", async () => {
  const casos: Array<[string, Opcoes, string]> = [
    ["500 do provedor", { evolution: { ...midiaAudio(), [URL_GROQ]: () => new Response("x", { status: 500 }) } }, "provedor_indisponivel"],
    ["chave recusada", { evolution: { ...midiaAudio(), [URL_GROQ]: () => new Response("x", { status: 401 }) } }, "chave_recusada"],
    ["sem fala", { evolution: { ...midiaAudio(), ...fala("   ") } }, "sem_fala"],
    ["teto", { limiteTranscricao: false, evolution: { ...midiaAudio(), ...fala("oi") } }, "limite"],
    ["configuração", { transcricao: "erro", evolution: { ...midiaAudio(), ...fala("oi") } }, "configuracao"],
  ];
  for (const [nome, opcoes, motivo] of casos) {
    const { io, e } = montar({ transcricao: GROQ, ...opcoes });
    assertEquals((await POST(io, evento(audioOgg(), {}, `F-${motivo}`))).status, 200, nome);
    assertEquals(e.registrados[0].anexo?.transcricao, { estado: "falhou", motivo }, nome);
    assertEquals([e.registrados[0].encaminhar, e.registrados[0].texto, e.registrados[0].anexo?.baixado], [true, "", true], nome);
    assertEquals([e.iaChamada, e.concluidos], [0, ["handoff"]], nome);
  }
  // teto estourado nem chega a chamar o provedor
  const t = montar({ transcricao: GROQ, limiteTranscricao: false, evolution: { ...midiaAudio(), ...fala("oi") } });
  await POST(t.io, evento(audioOgg(), {}, "T1"));
  assertEquals(t.e.chamadas.some((c) => c.url.includes("groq")), false);
});

Deno.test("só áudio é transcrito: imagem e documento não chamam o provedor; áudio não baixado também não", async () => {
  const doc = montar({ transcricao: GROQ, evolution: { ...midia(), ...fala("x") } });
  await POST(doc.io, documento());
  const img = montar({ transcricao: GROQ, evolution: { ...midia({ mimetype: "image/jpeg" }), ...fala("x") } });
  await POST(img.io, evento({ imageMessage: { mimetype: "image/jpeg", fileLength: 4 } }, {}, "I1"));
  const caiu = montar({ transcricao: GROQ, evolution: { "/chat/getBase64FromMediaMessage/": () => new Response("x", { status: 500 }), ...fala("x") } });
  await POST(caiu.io, evento(audioOgg(), {}, "A4"));
  for (const { e } of [doc, img, caiu]) {
    assertEquals(e.chamadas.some((c) => c.url.includes("groq")), false);
    assertEquals(e.registrados[0].anexo?.transcricao, undefined);
  }
  assertEquals(caiu.e.registrados[0].anexo?.motivo, "download");
});

Deno.test("áudio de remetente não identificado: transcrito para a equipe ler, mas ninguém responde", async () => {
  const { io, e } = montar({ transcricao: GROQ, evolution: { ...midiaAudio(), ...fala("Meu nome é José"), ...historico() } });
  await POST(io, evento(audioOgg(), { remoteJid: "9988776655@lid" }, "A5"));
  assertEquals([e.registrados[0].identificacao, e.registrados[0].texto], ["nao_identificada", "Meu nome é José"]);
  assertEquals(e.concluidos, ["ignorado"]);
  assertEquals(e.chamadas.some((c) => c.url.includes("sendText")), false);
});

Deno.test("reentrega do áudio não transcreve de novo (não gasta duas vezes)", async () => {
  const { io, e } = montar({ transcricao: GROQ, jaRecebida: true, evolution: { ...midiaAudio(), ...fala("oi") } });
  await POST(io, evento(audioOgg(), {}, "A6"));
  assertEquals([e.registrados.length, e.chamadas.length], [0, 0]);
});
