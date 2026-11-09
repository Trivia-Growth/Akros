import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HttpError } from "./auth.ts";
import {
  type ContaLinha,
  criarManipuladorCanalEvolution,
  type DepsCanalEvolution,
  type PatchConta,
  type ServidorLinha,
} from "./canal-evolution.ts";
import { CAPACIDADES_OBRIGATORIAS } from "./canais/evolution-estado.ts";
import { validarUrlServidor } from "./canais/evolution-url.ts";

const ADMIN = "00000000-0000-4000-8000-0000000000aa";
const CONTA = "11111111-1111-4111-8111-111111111111";
const AGENTE = "22222222-2222-4222-8222-222222222222";
const CHAVE = "CHAVE-GLOBAL-DO-SERVIDOR";
const NUMERO = "5511988881001";
const INSTANCIA = "akros-111111111111411181111111";

interface Mundo {
  servidor: ServidorLinha | null;
  compat: Map<string, { capacidades: string[]; afetadaLogout: boolean }>;
  contas: Map<string, ContaLinha>;
  segredos: Map<string, Record<string, string>>;
  agentes: Set<string>;
  chamadas: Array<{ metodo: string; url: string; headers: Record<string, string>; corpo: unknown }>;
  ordem: string[];
  patches: PatchConta[];
}

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

function conta(over: Partial<ContaLinha> = {}): ContaLinha {
  return {
    id: CONTA,
    provedor: "evolution",
    nome_exibicao: "WhatsApp Akros",
    identificador: NUMERO,
    ativa: false,
    estado_conexao: "sem_credencial",
    nome_instancia: null,
    aceite_risco_em: null,
    deleted_at: null,
    ...over,
  };
}

function montar(opcoes: {
  servidor?: Partial<ServidorLinha> | null;
  compat?: Array<[string, string[], boolean?]>;
  conta?: Partial<ContaLinha> | null;
  segredos?: Array<[string, Record<string, string>]>;
  evolution?: Record<string, (c: { metodo: string; url: string; corpo: unknown }) => Response>;
  admin?: "ok" | "anonimo" | "nao_admin";
  csrf?: boolean;
  limite?: boolean;
  urlValida?: boolean;
} = {}) {
  const m: Mundo = {
    servidor: opcoes.servidor
      ? { id: "s1", url_base: "https://evo.exemplo.com", versao_detectada: "2.3.7", estado: "compativel", motivo: null, indicio: "idor", ...opcoes.servidor }
      : null,
    compat: new Map((opcoes.compat ?? []).map(([v, c, a]) => [v, { capacidades: c, afetadaLogout: a ?? false }])),
    contas: new Map(),
    segredos: new Map(opcoes.segredos ?? []),
    agentes: new Set([AGENTE]),
    chamadas: [],
    ordem: [],
    patches: [],
  };
  if (opcoes.conta !== null) m.contas.set(CONTA, conta(opcoes.conta ?? {}));
  if (m.servidor && !m.segredos.has("evolution-servidor:s1")) m.segredos.set("evolution-servidor:s1", { apiKey: CHAVE });

  const evolution: Record<string, (c: { metodo: string; url: string; corpo: unknown }) => Response> = {
    "/instance/create": () => json({ instance: {} }, 201),
    "/webhook/set/": () => json({}, 201),
    "/webhook/find/": () => json({}),
    "/message/sendText/": () => json({ key: { id: "OUT" } }, 201),
    "/instance/connect/": () => json({ base64: "data:image/png;base64,QR" }),
    "/instance/connectionState/": () => json({ instance: { state: "open" } }),
    "/instance/fetchInstances": () => json([{ name: INSTANCIA, ownerJid: `${NUMERO}@s.whatsapp.net` }]),
    ...opcoes.evolution,
  };
  const buscador = ((url: string, init: RequestInit = {}) => {
    const c = {
      metodo: init.method ?? "GET",
      url,
      headers: (init.headers ?? {}) as Record<string, string>,
      corpo: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    };
    m.chamadas.push(c);
    m.ordem.push(`http:${c.metodo} ${new URL(url).pathname}`);
    if (url === "https://evo.exemplo.com/") return Promise.resolve(json({ version: "2.3.7" }));
    if (url === "https://novo.exemplo.com/") return Promise.resolve(json({ version: "2.3.7" }));
    const chave = Object.keys(evolution).find((k) => url.includes(k));
    return Promise.resolve(chave ? evolution[chave](c) : new Response("{}", { status: 404 }));
  }) as unknown as typeof fetch;

  const deps: DepsCanalEvolution = {
    limite: () => Promise.resolve({ permitido: opcoes.limite ?? true, reiniciaEm: null }),
    autenticarAdmin: () => {
      if (opcoes.admin === "anonimo") return Promise.reject(new HttpError(401, "Token ausente"));
      if (opcoes.admin === "nao_admin") return Promise.reject(new HttpError(403, "Apenas administradores configuram integrações"));
      return Promise.resolve({ userId: ADMIN });
    },
    exigirCsrf: (req) => {
      if (opcoes.csrf === false || req.headers.get("X-Akros-Csrf") !== "1") throw new HttpError(401, "Requisição sem proteção CSRF");
    },
    cors: () => ({ "Access-Control-Allow-Origin": "https://akros.exemplo.com" }),
    buscador,
    validarUrl: (url) =>
      opcoes.urlValida === false
        ? Promise.resolve({ valida: false, motivo: "Endereço privado ou local não é permitido." })
        : validarUrlServidor(url, { resolverEnderecos: () => Promise.resolve(["203.0.114.9"]) }),
    urlProjeto: "https://p.supabase.co/",
    gerarToken: () => "TOKEN-NOVO-DO-WEBHOOK-0123456789ABCDEFGHIJKLM",
    agora: () => new Date("2026-10-27T12:00:00.000Z"),
    servidores: {
      buscar: () => Promise.resolve(m.servidor),
      salvar: (v) => {
        m.servidor = { id: m.servidor?.id ?? "s1", url_base: v.url_base, versao_detectada: v.versao_detectada, estado: v.estado, motivo: v.motivo, indicio: v.indicio };
        m.ordem.push("db:servidor");
        return Promise.resolve(m.servidor);
      },
    },
    compat: {
      buscar: (v) => Promise.resolve(m.compat.get(v) ?? null),
      salvar: (v) => {
        m.compat.set(v.versao, { capacidades: v.capacidades, afetadaLogout: v.afetada_logout });
        return Promise.resolve();
      },
    },
    contas: {
      buscar: (id) => Promise.resolve(m.contas.get(id) ?? null),
      buscarPorNumero: (n) => Promise.resolve([...m.contas.values()].find((c) => c.identificador === n) ?? null),
      criar: (v) => {
        const id = "33333333-3333-4333-8333-333333333333";
        m.contas.set(id, conta({ id, nome_exibicao: v.nome_exibicao, identificador: v.identificador }));
        return Promise.resolve(id);
      },
      atualizar: (id, patch) => {
        m.patches.push(patch);
        m.ordem.push(`db:conta ${Object.keys(patch).join(",")}`);
        const atual = m.contas.get(id);
        if (atual) m.contas.set(id, { ...atual, ...patch } as ContaLinha);
        return Promise.resolve();
      },
      resetarEvolution: (codigo) => {
        for (const [id, c] of m.contas) {
          if (c.provedor === "evolution" && c.nome_instancia) {
            m.contas.set(id, { ...c, estado_conexao: "sem_credencial", ativa: false, credenciais_configuradas: false, ultimo_erro_codigo: codigo });
          }
        }
        m.ordem.push("db:reset");
        return Promise.resolve();
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
    agentes: { vincular: (agenteId) => Promise.resolve(m.agentes.has(agenteId)) },
    // As ações de transcrição têm testes próprios (`canal-transcricao.test.ts`).
    transcricao: { buscar: () => Promise.resolve(null), salvar: () => Promise.reject(new Error("fora do escopo deste teste")) },
  };
  return { m, deps };
}

async function chamar(deps: DepsCanalEvolution, corpo: unknown, extra: { csrf?: boolean; metodo?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: "Bearer jwt" };
  if (extra.csrf !== false) headers["X-Akros-Csrf"] = "1";
  const r = await criarManipuladorCanalEvolution(deps)(
    new Request("https://p.supabase.co/functions/v1/canal-evolution", {
      method: extra.metodo ?? "POST",
      headers,
      body: (extra.metodo ?? "POST") === "POST" ? (typeof corpo === "string" ? corpo : JSON.stringify(corpo)) : undefined,
    }),
  );
  const texto = await r.text();
  return { status: r.status, texto, json: texto ? JSON.parse(texto) : null };
}

const TODAS = [...CAPACIDADES_OBRIGATORIAS];
const COMPAT_OK: Array<[string, string[]]> = [["2.3.7", TODAS]];
const webhookLido = (token = "TOKEN-NOVO-DO-WEBHOOK-0123456789ABCDEFGHIJKLM", over: Record<string, unknown> = {}) => ({
  enabled: true,
  url: `https://p.supabase.co/functions/v1/evolution-webhook?conta=${CONTA}`,
  headers: { "x-akros-webhook": token },
  events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"],
  webhookBase64: false,
  ...over,
});

// ───────────────────────── permissões e contrato ─────────────────────────
Deno.test("OPTIONS é 204; outro método é 405; limite estourado é 429 sem tocar em nada", async () => {
  const { deps } = montar();
  assertEquals((await chamar(deps, null, { metodo: "OPTIONS" })).status, 204);
  assertEquals((await chamar(deps, null, { metodo: "GET" })).status, 405);
  const lim = montar({ limite: false });
  assertEquals((await chamar(lim.deps, { acao: "consultar_estado", contaId: CONTA })).status, 429);
  assertEquals(lim.m.chamadas.length, 0);
});

Deno.test("sem CSRF é 401; anônimo é 401; não-admin é 403; e NADA é executado", async () => {
  const csrf = montar({ servidor: null });
  assertEquals((await chamar(csrf.deps, { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com", apiKey: CHAVE }, { csrf: false })).status, 401);
  const anon = montar({ servidor: null, admin: "anonimo" });
  assertEquals((await chamar(anon.deps, { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com", apiKey: CHAVE })).status, 401);
  const nao = montar({ servidor: null, admin: "nao_admin" });
  const r = await chamar(nao.deps, { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com", apiKey: CHAVE });
  assertEquals([r.status, r.json.codigo], [403, "sem_permissao"]);
  for (const x of [csrf, anon, nao]) assertEquals([x.m.chamadas.length, x.m.segredos.size, x.m.servidor], [0, 0, null]);
});

Deno.test("papel forjado no corpo, campo desconhecido, ação desconhecida, JSON ruim e corpo grande são recusados", async () => {
  const { deps, m } = montar({ servidor: null });
  const base = { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com", apiKey: CHAVE };
  assertEquals((await chamar(deps, { ...base, role: "admin" })).status, 400);
  assertEquals((await chamar(deps, { ...base, app_metadata: { role: "admin" } })).status, 400);
  assertEquals((await chamar(deps, { acao: "apagar_tudo" })).status, 400);
  assertEquals((await chamar(deps, "{{{")).status, 400);
  assertEquals((await chamar(deps, { ...base, apiKey: "x".repeat(20 * 1024) })).status, 413);
  assertEquals((await chamar(deps, { acao: "consultar_estado", contaId: "nao-uuid" })).status, 400);
  assertEquals(m.chamadas.length, 0);
});

// ───────────────────────── servidor ─────────────────────────
Deno.test("servidor: URL recusada por segurança nunca chega à rede", async () => {
  const { deps, m } = montar({ servidor: null, urlValida: false });
  const r = await chamar(deps, { acao: "salvar_servidor", urlBase: "https://10.0.0.5", apiKey: CHAVE });
  assertEquals([r.status, r.json.codigo], [400, "url_recusada"]);
  assertEquals([m.chamadas.length, m.segredos.size], [0, 0]);
});

Deno.test("servidor: versão provada ⇒ compatível, chave só no Vault, indício de 4 caracteres, resposta sem a chave", async () => {
  const { deps, m } = montar({ servidor: null, compat: [["2.3.7", TODAS, true]] });
  const r = await chamar(deps, { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com/", apiKey: CHAVE });
  assertEquals(r.status, 200);
  assertEquals([r.json.estado, r.json.versao, r.json.indicio, r.json.afetadaLogout], ["compativel", "2.3.7", CHAVE.slice(-4), true]);
  assert(!r.texto.includes(CHAVE), "a resposta não pode conter a chave");
  assertEquals(m.servidor?.url_base, "https://novo.exemplo.com");
  assertEquals(m.segredos.get("evolution-servidor:s1"), { apiKey: CHAVE });
  assertEquals(m.chamadas[0].headers.apikey, CHAVE);
});

Deno.test("servidor: versão não provada ⇒ incompatível com motivo; a chave fica guardada para continuar depois do smoke", async () => {
  const { deps, m } = montar({ servidor: null });
  const r = await chamar(deps, { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com", apiKey: CHAVE });
  assertEquals([r.status, r.json.estado], [200, "incompativel"]);
  assert(r.json.motivo.includes("2.3.7"));
  assert(m.segredos.has("evolution-servidor:s1"));
  // e nenhuma instância pode ser criada num servidor incompatível
  m.contas.set(CONTA, conta());
  const c = await chamar(deps, { acao: "criar_instancia", contaId: CONTA });
  assertEquals([c.status, c.json.codigo], [409, "servidor_nao_configurado"]);
});

Deno.test("servidor: chave recusada ou servidor fora do ar ⇒ 502 e nada é gravado", async () => {
  const recusada = montar({ servidor: null });
  (recusada.deps as { buscador: typeof fetch }).buscador = (() => Promise.resolve(new Response("segredo no corpo", { status: 401 }))) as unknown as typeof fetch;
  const r = await chamar(recusada.deps, { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com", apiKey: CHAVE });
  assertEquals([r.status, r.json.codigo], [502, "chave_recusada"]);
  assert(!r.texto.includes("segredo no corpo"));
  assertEquals([recusada.m.servidor, recusada.m.segredos.size], [null, 0]);
  const fora = montar({ servidor: null });
  (fora.deps as { buscador: typeof fetch }).buscador = (() => Promise.reject(new TypeError("rede"))) as unknown as typeof fetch;
  assertEquals((await chamar(fora.deps, { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com", apiKey: CHAVE })).json.codigo, "servidor_indisponivel");
});

Deno.test("registrar compatibilidade promove o servidor quando as sete capacidades estão provadas", async () => {
  const { deps, m } = montar({ servidor: { estado: "incompativel", motivo: "x" } });
  const parcial = await chamar(deps, {
    acao: "registrar_compatibilidade", versao: "2.3.7", capacidades: ["instanceCreate", "qr"], afetadaLogout: false, evidencia: "smoke parcial",
  });
  assertEquals([parcial.json.compativel, parcial.json.estadoServidor], [false, "incompativel"]);
  const ok = await chamar(deps, {
    acao: "registrar_compatibilidade", versao: "2.3.7", capacidades: TODAS, afetadaLogout: true, evidencia: "smoke 2026-10-27 servidor de teste",
  });
  assertEquals([ok.json.compativel, ok.json.estadoServidor], [true, "compativel"]);
  assertEquals(m.servidor?.estado, "compativel");
  assertEquals(m.compat.get("2.3.7")?.afetadaLogout, true);
  // outra versão não mexe no servidor
  const outra = await chamar(deps, { acao: "registrar_compatibilidade", versao: "9.9.9", capacidades: TODAS, afetadaLogout: false, evidencia: "outro servidor" });
  assertEquals(outra.json.estadoServidor, null);
  // capacidade inventada é recusada
  assertEquals((await chamar(deps, { acao: "registrar_compatibilidade", versao: "1.0.0", capacidades: ["voar"], afetadaLogout: false, evidencia: "xxx" })).status, 400);
});

// ───────────────────────── canal e instância ─────────────────────────
Deno.test("criar canal: normaliza o número, recusa inválido e duplicado", async () => {
  const { deps, m } = montar({ conta: null });
  const ok = await chamar(deps, { acao: "criar_canal", nomeExibicao: "WhatsApp Akros", numero: "+55 (11) 98888-1001" });
  assertEquals([ok.status, ok.json.estado], [200, "sem_credencial"]);
  assertEquals(m.contas.get(ok.json.contaId)?.identificador, NUMERO);
  assertEquals((await chamar(deps, { acao: "criar_canal", nomeExibicao: "x", numero: "12345" })).status, 400);
  const dup = await chamar(deps, { acao: "criar_canal", nomeExibicao: "Outro", numero: NUMERO });
  assertEquals([dup.status, dup.json.codigo], [409, "numero_ja_cadastrado"]);
});

Deno.test("criar instância: nome derivado do canal, estado incompleto e idempotente", async () => {
  const { deps, m } = montar({ servidor: {}, compat: COMPAT_OK });
  const r = await chamar(deps, { acao: "criar_instancia", contaId: CONTA });
  assertEquals([r.status, r.json.estado, r.json.jaExistia], [200, "configuracao_incompleta", false]);
  assertEquals(m.contas.get(CONTA)?.nome_instancia, INSTANCIA);
  assertEquals(m.chamadas[0].corpo, { instanceName: INSTANCIA, qrcode: false, integration: "WHATSAPP-BAILEYS" });
  const antes = m.chamadas.length;
  const de_novo = await chamar(deps, { acao: "criar_instancia", contaId: CONTA });
  assertEquals([de_novo.json.estado, de_novo.json.jaExistia], ["configuracao_incompleta", true]);
  assertEquals(m.chamadas.length, antes, "repetir não chama a Evolution");
});

Deno.test("criar instância: nome já em uso no servidor (nova tentativa) recupera em vez de falhar", async () => {
  const { deps, m } = montar({
    servidor: {}, compat: COMPAT_OK,
    evolution: { "/instance/create": () => json({ response: { message: ["already in use"] } }, 403) },
  });
  const r = await chamar(deps, { acao: "criar_instancia", contaId: CONTA });
  assertEquals([r.status, r.json.jaExistia], [200, true]);
  assertEquals(m.contas.get(CONTA)?.estado_conexao, "configuracao_incompleta");
});

Deno.test("criar instância: falha da Evolution ⇒ 502, estado intacto e código registrado", async () => {
  const { deps, m } = montar({ servidor: {}, compat: COMPAT_OK, evolution: { "/instance/create": () => json({}, 500) } });
  const r = await chamar(deps, { acao: "criar_instancia", contaId: CONTA });
  assertEquals([r.status, r.json.codigo], [502, "criar_instancia_falhou"]);
  assertEquals([m.contas.get(CONTA)?.estado_conexao, m.contas.get(CONTA)?.ultimo_erro_codigo], ["sem_credencial", "criar_instancia_falhou"]);
});

Deno.test("conta de outro provedor, apagada ou inexistente ⇒ 422 canal_invalido", async () => {
  for (const c of [{ provedor: "instagram" }, { deleted_at: "2026-01-01" }, null] as const) {
    const { deps } = montar({ servidor: {}, compat: COMPAT_OK, conta: c });
    const r = await chamar(deps, { acao: "criar_instancia", contaId: CONTA });
    assertEquals([r.status, r.json.codigo], [422, "canal_invalido"]);
  }
});

// ───────────────────────── webhook ─────────────────────────
Deno.test("webhook: sem instância ⇒ 409; com instância grava o segredo ANTES, instala, RELÊ e avança", async () => {
  const sem = montar({ servidor: {}, compat: COMPAT_OK });
  assertEquals((await chamar(sem.deps, { acao: "instalar_webhook", contaId: CONTA })).json.codigo, "instancia_nao_criada");

  const { deps, m } = montar({
    servidor: {}, compat: COMPAT_OK,
    conta: { estado_conexao: "configuracao_incompleta", nome_instancia: INSTANCIA },
    evolution: { "/webhook/find/": () => json(webhookLido()) },
  });
  const r = await chamar(deps, { acao: "instalar_webhook", contaId: CONTA });
  assertEquals([r.status, r.json.estado], [200, "aguardando_pareamento"]);
  assertEquals(m.contas.get(CONTA)?.estado_conexao, "aguardando_pareamento");
  assertEquals(m.contas.get(CONTA)?.credenciais_configuradas, true);
  assertEquals(m.segredos.get(`evolution:${CONTA}`), { webhookToken: "TOKEN-NOVO-DO-WEBHOOK-0123456789ABCDEFGHIJKLM" });
  const iVault = m.ordem.indexOf("vault:evolution");
  const iSet = m.ordem.indexOf(`http:POST /webhook/set/${INSTANCIA}`);
  const iFind = m.ordem.indexOf(`http:GET /webhook/find/${INSTANCIA}`);
  assert(iVault >= 0 && iVault < iSet && iSet < iFind, "segredo no Vault, depois set, depois leitura");
  const set = m.chamadas.find((c) => c.url.includes("/webhook/set/"))!;
  assertEquals(set.corpo, {
    webhook: {
      enabled: true,
      url: `https://p.supabase.co/functions/v1/evolution-webhook?conta=${CONTA}`,
      headers: { "x-akros-webhook": "TOKEN-NOVO-DO-WEBHOOK-0123456789ABCDEFGHIJKLM" },
      byEvents: false,
      base64: false,
      events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"],
    },
  });
  assert(!r.texto.includes("TOKEN-NOVO"), "a resposta não carrega o segredo do webhook");
});

Deno.test("webhook: Evolution responde 2xx mas a leitura não confere ⇒ NÃO avança e fica retomável", async () => {
  for (const lido of [webhookLido(undefined, { enabled: false }), webhookLido("OUTRO"), webhookLido(undefined, { events: ["MESSAGES_UPSERT"] }), webhookLido(undefined, { webhookBase64: true }), {}]) {
    const { deps, m } = montar({
      servidor: {}, compat: COMPAT_OK,
      conta: { estado_conexao: "configuracao_incompleta", nome_instancia: INSTANCIA },
      evolution: { "/webhook/find/": () => json(lido) },
    });
    const r = await chamar(deps, { acao: "instalar_webhook", contaId: CONTA });
    assertEquals([r.status, r.json.codigo], [502, "webhook_nao_confirmado"]);
    assertEquals([m.contas.get(CONTA)?.estado_conexao, m.contas.get(CONTA)?.credenciais_configuradas, m.contas.get(CONTA)?.ultimo_erro_codigo],
      ["configuracao_incompleta", false, "webhook_nao_confirmado"]);
  }
});

Deno.test("webhook: refazer reaproveita o segredo existente (não derruba a Evolution já registrada)", async () => {
  const { deps, m } = montar({
    servidor: {}, compat: COMPAT_OK,
    conta: { estado_conexao: "aguardando_pareamento", nome_instancia: INSTANCIA },
    segredos: [[`evolution:${CONTA}`, { webhookToken: "SEGREDO-ANTIGO" }]],
    evolution: { "/webhook/find/": () => json(webhookLido("SEGREDO-ANTIGO")) },
  });
  assertEquals((await chamar(deps, { acao: "instalar_webhook", contaId: CONTA })).status, 200);
  assertEquals(m.segredos.get(`evolution:${CONTA}`), { webhookToken: "SEGREDO-ANTIGO" });
  assert(!m.ordem.includes("vault:evolution"), "não regrava o segredo");
});

Deno.test("webhook: refazer num canal conectado falhando não o derruba nem o ativa", async () => {
  const { deps, m } = montar({
    servidor: {}, compat: COMPAT_OK,
    conta: { estado_conexao: "conectado_verificado", nome_instancia: INSTANCIA, ativa: true },
    evolution: { "/webhook/set/": () => json({}, 500) },
  });
  const r = await chamar(deps, { acao: "instalar_webhook", contaId: CONTA });
  assertEquals([r.status, r.json.codigo], [502, "webhook_falhou"]);
  assertEquals(m.contas.get(CONTA)?.estado_conexao, "conectado_verificado");
});

// ───────────────────────── risco e QR ─────────────────────────
Deno.test("QR: exige estado de pareamento e o aceite de risco; devolve o QR só na resposta", async () => {
  const errado = montar({ servidor: {}, compat: COMPAT_OK, conta: { estado_conexao: "configuracao_incompleta", nome_instancia: INSTANCIA, aceite_risco_em: "2026-10-27" } });
  assertEquals((await chamar(errado.deps, { acao: "gerar_qr", contaId: CONTA })).json.codigo, "instancia_nao_aguarda_pareamento");

  const { deps, m } = montar({ servidor: {}, compat: COMPAT_OK, conta: { estado_conexao: "aguardando_pareamento", nome_instancia: INSTANCIA } });
  const sem = await chamar(deps, { acao: "gerar_qr", contaId: CONTA });
  assertEquals([sem.status, sem.json.codigo], [409, "risco_nao_aceito"]);
  assert(!m.chamadas.some((c) => c.url.includes("/instance/connect/")), "sem aceite nem chama a Evolution");

  assertEquals((await chamar(deps, { acao: "aceitar_risco", contaId: CONTA })).json, { aceito: true });
  assertEquals([m.contas.get(CONTA)?.aceite_risco_em, m.contas.get(CONTA)?.aceite_risco_por], ["2026-10-27T12:00:00.000Z", ADMIN]);
  const patchesAntes = JSON.stringify(m.patches);
  const qr = await chamar(deps, { acao: "gerar_qr", contaId: CONTA });
  assertEquals([qr.status, qr.json.qrBase64, qr.json.expiraEm], [200, "data:image/png;base64,QR", "2026-10-27T12:01:00.000Z"]);
  assertEquals(JSON.stringify(m.patches), patchesAntes, "o QR não é gravado em lugar nenhum");
  assert(![...m.segredos.values()].some((v) => JSON.stringify(v).includes("QR")));
});

Deno.test("QR: Evolution sem QR ⇒ 502 qr_indisponivel", async () => {
  const { deps } = montar({
    servidor: {}, compat: COMPAT_OK,
    conta: { estado_conexao: "aguardando_pareamento", nome_instancia: INSTANCIA, aceite_risco_em: "2026-10-27" },
    evolution: { "/instance/connect/": () => json({ count: 0 }) },
  });
  assertEquals((await chamar(deps, { acao: "gerar_qr", contaId: CONTA })).json.codigo, "qr_indisponivel");
});

// ───────────────────────── estado ─────────────────────────
const aguardando = { estado_conexao: "aguardando_pareamento" as const, nome_instancia: INSTANCIA };

Deno.test("estado: aberto com o número ESPERADO ⇒ conectado e verificado (nono dígito tolerado)", async () => {
  const { deps, m } = montar({ servidor: {}, compat: COMPAT_OK, conta: aguardando });
  const r = await chamar(deps, { acao: "consultar_estado", contaId: CONTA });
  assertEquals([r.status, r.json.estado], [200, "conectado_verificado"]);
  assertEquals(m.contas.get(CONTA)?.estado_conexao, "conectado_verificado");
  const sem9 = montar({
    servidor: {}, compat: COMPAT_OK, conta: aguardando,
    evolution: { "/instance/fetchInstances": () => json([{ name: INSTANCIA, ownerJid: "551188881001:3@s.whatsapp.net" }]) },
  });
  assertEquals((await chamar(sem9.deps, { acao: "consultar_estado", contaId: CONTA })).json.estado, "conectado_verificado");
});

Deno.test("estado: aberto com OUTRO número ⇒ não conecta, avisa, não força logout", async () => {
  const { deps, m } = montar({
    servidor: {}, compat: COMPAT_OK, conta: aguardando,
    evolution: { "/instance/fetchInstances": () => json([{ name: INSTANCIA, ownerJid: "5511977770000@s.whatsapp.net" }]) },
  });
  const r = await chamar(deps, { acao: "consultar_estado", contaId: CONTA });
  assertEquals([r.json.estado, r.json.numeroDivergente], ["aguardando_pareamento", true]);
  assertEquals([m.contas.get(CONTA)?.estado_conexao, m.contas.get(CONTA)?.ultimo_erro_codigo], ["aguardando_pareamento", "numero_divergente"]);
  assert(!m.chamadas.some((c) => c.metodo === "DELETE" || c.url.includes("logout")), "nunca faz logout por conta própria");
});

Deno.test("estado: conectado cuja sessão caiu volta para desconectado; aguardando que ainda não leu o QR fica como está", async () => {
  const fechado = { "/instance/connectionState/": () => json({ instance: { state: "close" } }) };
  const caiu = montar({ servidor: {}, compat: COMPAT_OK, conta: { estado_conexao: "conectado_verificado", nome_instancia: INSTANCIA }, evolution: fechado });
  const r = await chamar(caiu.deps, { acao: "consultar_estado", contaId: CONTA });
  assertEquals([r.json.estado, caiu.m.contas.get(CONTA)?.ultimo_erro_codigo], ["desconectado", "sessao_encerrada"]);
  const espera = montar({ servidor: {}, compat: COMPAT_OK, conta: aguardando, evolution: fechado });
  assertEquals((await chamar(espera.deps, { acao: "consultar_estado", contaId: CONTA })).json.estado, "aguardando_pareamento");
  assertEquals(espera.m.patches, []);
});

Deno.test("estado: servidor fora do ar com canal conectado ⇒ 502 e desconectado (nunca 'conectado' às cegas)", async () => {
  const { deps, m } = montar({
    servidor: {}, compat: COMPAT_OK, conta: { estado_conexao: "conectado_verificado", nome_instancia: INSTANCIA },
    evolution: { "/instance/connectionState/": () => json({}, 500) },
  });
  const r = await chamar(deps, { acao: "consultar_estado", contaId: CONTA });
  assertEquals(r.status, 502);
  assertEquals(m.contas.get(CONTA)?.estado_conexao, "desconectado");
});

Deno.test("estado: canal ainda incompleto não consulta a Evolution", async () => {
  const { deps, m } = montar({ servidor: {}, compat: COMPAT_OK, conta: { estado_conexao: "configuracao_incompleta", nome_instancia: INSTANCIA } });
  assertEquals((await chamar(deps, { acao: "consultar_estado", contaId: CONTA })).json.estado, "configuracao_incompleta");
  assertEquals(m.chamadas.length, 0);
});

// ───────────────────────── ativar e vincular ─────────────────────────
const CONECTADA = { estado_conexao: "conectado_verificado" as const, nome_instancia: INSTANCIA };

Deno.test("ativar exige conectado e verificado E envio provado; desativar sempre pode", async () => {
  const nao = montar({ conta: aguardando });
  const r = await chamar(nao.deps, { acao: "definir_ativa", contaId: CONTA, ativa: true });
  assertEquals([r.status, r.json.codigo], [409, "canal_nao_conectado"]);

  const semEnvio = montar({ servidor: {}, compat: COMPAT_OK, conta: CONECTADA });
  const bloqueada = await chamar(semEnvio.deps, { acao: "definir_ativa", contaId: CONTA, ativa: true });
  assertEquals([bloqueada.status, bloqueada.json.codigo], [409, "envio_nao_provado"]);
  assertEquals(semEnvio.m.contas.get(CONTA)?.ativa, false);

  const sim = montar({ servidor: {}, compat: [["2.3.7", [...TODAS, "sendText"]]], conta: CONECTADA });
  assertEquals((await chamar(sim.deps, { acao: "definir_ativa", contaId: CONTA, ativa: true })).json, { ativa: true });
  assertEquals(sim.m.contas.get(CONTA)?.ativa, true);
  assertEquals((await chamar(nao.deps, { acao: "definir_ativa", contaId: CONTA, ativa: false })).status, 200);
});

Deno.test("mensagem de teste: envia pelo produto, só dígitos, e REGISTRA o envio como provado na versão", async () => {
  const { deps, m } = montar({ servidor: {}, compat: COMPAT_OK, conta: CONECTADA });
  const r = await chamar(deps, { acao: "enviar_teste", contaId: CONTA, numero: "+55 (21) 97777-0001" });
  assertEquals([r.status, r.json], [200, { enviado: true }]);
  const envio = m.chamadas.find((c) => c.url.includes("/message/sendText/"))!;
  assertEquals(envio.url, `https://evo.exemplo.com/message/sendText/${INSTANCIA}`);
  assertEquals(envio.headers.apikey, CHAVE);
  assertEquals((envio.corpo as { number: string }).number, "5521977770001");
  assertEquals(m.compat.get("2.3.7")?.capacidades.includes("sendText"), true);
  // agora o canal pode ser ativado
  assertEquals((await chamar(deps, { acao: "definir_ativa", contaId: CONTA, ativa: true })).status, 200);
});

Deno.test("mensagem de teste: exige canal conectado, número válido; falha do envio não prova nada", async () => {
  const naoConectado = montar({ servidor: {}, compat: COMPAT_OK, conta: aguardando });
  const a = await chamar(naoConectado.deps, { acao: "enviar_teste", contaId: CONTA, numero: "5521977770001" });
  assertEquals([a.status, a.json.codigo], [409, "canal_nao_conectado"]);
  assertEquals(naoConectado.m.chamadas.length, 0);

  const curto = montar({ servidor: {}, compat: COMPAT_OK, conta: CONECTADA });
  const c = await chamar(curto.deps, { acao: "enviar_teste", contaId: CONTA, numero: "1234 5" });
  assertEquals(c.status, 400, "validação do Zod recusa número curto demais");

  const falha = montar({
    servidor: {}, compat: COMPAT_OK, conta: CONECTADA,
    evolution: { "/message/sendText/": () => new Response("Connection Closed", { status: 500 }) },
  });
  const f = await chamar(falha.deps, { acao: "enviar_teste", contaId: CONTA, numero: "5521977770001" });
  assertEquals([f.status, f.json.codigo], [502, "envio_falhou"]);
  assert(!f.texto.includes("Connection Closed"));
  assertEquals(falha.m.compat.get("2.3.7")?.capacidades.includes("sendText"), false, "envio que falhou não prova o envio");
});

Deno.test("vincular agente: existente ok; inexistente 404", async () => {
  const { deps } = montar();
  assertEquals((await chamar(deps, { acao: "vincular_agente", contaId: CONTA, agenteId: AGENTE })).json, { vinculado: true });
  const r = await chamar(deps, { acao: "vincular_agente", contaId: CONTA, agenteId: "44444444-4444-4444-8444-444444444444" });
  assertEquals([r.status, r.json.codigo], [404, "agente_inexistente"]);
});

// ───────────────────────── segredo nunca vaza ─────────────────────────
Deno.test("nenhuma resposta (exceto o QR, por desenho) carrega chave, token ou segredo do webhook", async () => {
  const { deps } = montar({
    servidor: {}, compat: COMPAT_OK,
    conta: { estado_conexao: "configuracao_incompleta", nome_instancia: INSTANCIA, aceite_risco_em: "2026-10-27" },
    evolution: { "/webhook/find/": () => json(webhookLido()) },
  });
  const respostas = [
    await chamar(deps, { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com", apiKey: CHAVE }),
    await chamar(deps, { acao: "instalar_webhook", contaId: CONTA }),
    await chamar(deps, { acao: "consultar_estado", contaId: CONTA }),
    await chamar(deps, { acao: "criar_instancia", contaId: CONTA }),
    await chamar(deps, { acao: "consultar_estado", contaId: "99999999-9999-4999-8999-999999999999" }),
  ];
  for (const r of respostas) {
    assert(!r.texto.includes(CHAVE) && !r.texto.includes("TOKEN-NOVO") && !r.texto.includes("apikey"), r.texto);
  }
});

// ───────────────────────── revisão adversarial (E13-S15) ─────────────────────────
Deno.test("trocar o ENDEREÇO do servidor reinicia os canais (as instâncias antigas não existem no novo)", async () => {
  const { deps, m } = montar({
    servidor: {}, compat: COMPAT_OK,
    conta: { estado_conexao: "conectado_verificado", nome_instancia: INSTANCIA, ativa: true },
  });
  const r = await chamar(deps, { acao: "salvar_servidor", urlBase: "https://novo.exemplo.com", apiKey: CHAVE });
  assertEquals(r.status, 200);
  const c = m.contas.get(CONTA)!;
  assertEquals([c.estado_conexao, c.ativa, c.credenciais_configuradas, c.ultimo_erro_codigo], ["sem_credencial", false, false, "servidor_trocado"]);
  // e a criação da instância volta a funcionar no servidor novo (não pega o atalho "já existe")
  const criar = await chamar(deps, { acao: "criar_instancia", contaId: CONTA });
  assertEquals(criar.json.jaExistia, false);
});

Deno.test("trocar só a CHAVE (mesmo endereço) não derruba canais conectados", async () => {
  const { deps, m } = montar({
    servidor: {}, compat: COMPAT_OK,
    conta: { estado_conexao: "conectado_verificado", nome_instancia: INSTANCIA, ativa: true },
  });
  await chamar(deps, { acao: "salvar_servidor", urlBase: "https://evo.exemplo.com/", apiKey: "CHAVE-NOVA-DO-SERVIDOR" });
  assertEquals([m.contas.get(CONTA)?.estado_conexao, m.contas.get(CONTA)?.ativa], ["conectado_verificado", true]);
  assertEquals(m.segredos.get("evolution-servidor:s1"), { apiKey: "CHAVE-NOVA-DO-SERVIDOR" });
});

Deno.test("corrida entre duas configurações: se o cofre não guarda mais o segredo que valeu, NÃO avança (a Evolution não reenvia 401)", async () => {
  const { deps, m } = montar({
    servidor: {}, compat: COMPAT_OK,
    conta: { estado_conexao: "configuracao_incompleta", nome_instancia: INSTANCIA },
    evolution: { "/webhook/find/": () => json(webhookLido()) },
  });
  const original = deps.segredos.obter;
  let leituras = 0;
  deps.segredos.obter = (<T,>(escopo: string) => {
    if (escopo.startsWith("evolution:") && ++leituras === 2) {
      return Promise.resolve({ webhookToken: "SEGREDO-GRAVADO-POR-OUTRO-ADMIN" } as T); // outro admin regravou
    }
    return original<T>(escopo);
  }) as typeof deps.segredos.obter;
  const r = await chamar(deps, { acao: "instalar_webhook", contaId: CONTA });
  assertEquals([r.status, r.json.codigo], [409, "conflito_configuracao"]);
  assertEquals([m.contas.get(CONTA)?.estado_conexao, m.contas.get(CONTA)?.credenciais_configuradas], ["configuracao_incompleta", false]);
});

Deno.test("mensagem de teste para o PRÓPRIO número do canal é recusada", async () => {
  const { deps, m } = montar({ servidor: {}, compat: COMPAT_OK, conta: CONECTADA });
  const r = await chamar(deps, { acao: "enviar_teste", contaId: CONTA, numero: "+55 11 98888-1001" });
  assertEquals([r.status, r.json.codigo], [400, "numero_proprio"]);
  assertEquals(m.chamadas.some((c) => c.url.includes("/message/sendText/")), false);
  const semNono = await chamar(deps, { acao: "enviar_teste", contaId: CONTA, numero: "551188881001" });
  assertEquals(semNono.json.codigo, "numero_proprio", "com ou sem o nono dígito");
});
