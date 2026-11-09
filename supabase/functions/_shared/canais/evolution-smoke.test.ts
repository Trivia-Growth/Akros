import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type ClienteEvolution, type ConfigWebhook, ErroEvolution } from "./evolution-cliente.ts";
import { rodarSmoke } from "./evolution-smoke.ts";

const WEBHOOK: ConfigWebhook = {
  url: "https://example.com/akros-smoke",
  cabecalhos: { "x-akros-webhook": "x" },
  eventos: ["MESSAGES_UPSERT"],
  base64: false,
};

function falso(falhas: Partial<Record<keyof ClienteEvolution, ErroEvolution | Error>> = {}) {
  const chamadas: string[] = [];
  const passo = <T>(nome: keyof ClienteEvolution, valor: T) => (...args: unknown[]) => {
    chamadas.push(`${nome}:${args[0] ?? ""}`);
    const f = falhas[nome];
    return f ? Promise.reject(f) : Promise.resolve(valor);
  };
  const cliente: ClienteEvolution = {
    versao: passo("versao", "2.3.7"),
    criarInstancia: passo("criarInstancia", { jaExistia: false }),
    configurarWebhook: passo("configurarWebhook", undefined),
    conectar: passo("conectar", { qrBase64: "SEGREDO-DO-QR" }),
    estado: passo("estado", { estado: "close" }),
    numeroPareado: passo("numeroPareado", null),
    telefoneDoLid: passo("telefoneDoLid", null),
    baixarMidia: passo("baixarMidia", { base64: "", mime: null, nome: null }),
    enviarTexto: passo("enviarTexto", undefined),
    apagarInstancia: passo("apagarInstancia", undefined),
  } as ClienteEvolution;
  return { cliente, chamadas };
}

Deno.test("tudo certo: cinco capacidades obrigatórias provadas, compatível, instância apagada", async () => {
  const { cliente, chamadas } = falso();
  const r = await rodarSmoke(cliente, { nome: "smoke-1", webhook: WEBHOOK });
  assertEquals(r.versao, "2.3.7");
  assertEquals(r.compativel, true);
  for (const c of ["instanceCreate", "qr", "connectionState", "webhookHeaders", "webhookEvents", "deleteInstance"]) {
    assertEquals(r.capacidades[c]?.provada, true, c);
  }
  assertEquals(r.apagada, true);
  assertEquals(chamadas[chamadas.length - 1], "apagarInstancia:smoke-1", "a limpeza é o último passo");
});

Deno.test("falha numa capacidade não interrompe as outras e a instância ainda é apagada", async () => {
  const { cliente, chamadas } = falso({ conectar: new ErroEvolution("qr_indisponivel") });
  const r = await rodarSmoke(cliente, { nome: "smoke-2", webhook: WEBHOOK });
  assertEquals([r.capacidades.qr.provada, r.capacidades.connectionState.provada, r.compativel], [false, true, false]);
  assert(r.observacoes.some((o) => o.includes("qr: qr_indisponivel")));
  assert(chamadas.includes("apagarInstancia:smoke-2"));
});

Deno.test("webhook que não confere deixa as duas capacidades de webhook não provadas", async () => {
  const { cliente } = falso({ configurarWebhook: new ErroEvolution("webhook_nao_confirmado") });
  const r = await rodarSmoke(cliente, { nome: "smoke-3", webhook: WEBHOOK });
  assertEquals([r.capacidades.webhookHeaders.provada, r.capacidades.webhookEvents.provada, r.compativel], [false, false, false]);
});

Deno.test("sem configuração de webhook, não inventa prova", async () => {
  const { cliente } = falso();
  const r = await rodarSmoke(cliente, { nome: "smoke-4" });
  assertEquals(r.capacidades.webhookHeaders, undefined);
  assertEquals(r.compativel, false);
  assert(r.observacoes.some((o) => o.includes("webhook")));
});

Deno.test("criação falha: não avalia o resto, ainda tenta limpar, sem sujeira declarada", async () => {
  const { cliente, chamadas } = falso({
    criarInstancia: new ErroEvolution("criar_instancia_falhou", 500),
    apagarInstancia: new ErroEvolution("apagar_falhou", 404),
  });
  const r = await rodarSmoke(cliente, { nome: "smoke-5", webhook: WEBHOOK });
  assertEquals([r.compativel, r.apagada, r.capacidades.instanceCreate.provada], [false, null, false]);
  assert(!chamadas.some((c) => c.startsWith("conectar") || c.startsWith("estado")));
});

Deno.test("se não conseguir apagar, diz o nome da instância para limpeza manual", async () => {
  const { cliente } = falso({ apagarInstancia: new ErroEvolution("apagar_falhou", 500) });
  const r = await rodarSmoke(cliente, { nome: "smoke-6", webhook: WEBHOOK });
  assertEquals(r.apagada, false);
  assert(r.observacoes.some((o) => o.includes("smoke-6") && o.includes("apague")));
});

Deno.test("envio: prova sendText numa instância pareada que NÃO é apagada", async () => {
  const { cliente, chamadas } = falso();
  const r = await rodarSmoke(cliente, {
    nome: "smoke-7", webhook: WEBHOOK, envio: { instancia: "akros-pareada", numero: "5511999999999", texto: "oi" },
  });
  assertEquals(r.capacidades.sendText.provada, true);
  assert(chamadas.includes("enviarTexto:akros-pareada"));
  assert(!chamadas.includes("apagarInstancia:akros-pareada"));
});

Deno.test("servidor fora do ar: erro registrado, nada provado, nunca exceção", async () => {
  const { cliente } = falso({ versao: new ErroEvolution("servidor_indisponivel") });
  const r = await rodarSmoke(cliente, { nome: "smoke-8", webhook: WEBHOOK });
  assertEquals([r.erro, r.compativel, r.versao], ["servidor_indisponivel", false, null]);
});

Deno.test("o resultado nunca carrega QR, chave ou corpo", async () => {
  const { cliente } = falso();
  const texto = JSON.stringify(await rodarSmoke(cliente, { nome: "smoke-9", webhook: WEBHOOK }));
  assert(!texto.includes("SEGREDO-DO-QR"));
});
