import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classificarEventoEvolution, identificarRemetente } from "./evolution.ts";

function evento(
  mensagem: Record<string, unknown> = { conversation: "Olá, quero saber do EB-2 NIW" },
  key: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
) {
  return {
    event: "messages.upsert",
    instance: "akros",
    data: {
      key: { remoteJid: "5511988881001@s.whatsapp.net", fromMe: false, id: "3EB0ABC", ...key },
      pushName: "Maria",
      message: mensagem,
      messageTimestamp: 1790000000,
      ...extra,
    },
  };
}

function mensagem(e: ReturnType<typeof classificarEventoEvolution>) {
  assertEquals(e.tipo, "mensagem");
  if (e.tipo !== "mensagem") throw new Error("esperava mensagem");
  return e;
}

Deno.test("texto: conversation e extendedTextMessage; nome de exibição e horário", () => {
  const e = mensagem(classificarEventoEvolution(evento()));
  assertEquals([e.origemId, e.remetente.telefone, e.nome], ["3EB0ABC", "5511988881001", "Maria"]);
  assertEquals(e.conteudo, { kind: "texto", texto: "Olá, quero saber do EB-2 NIW" });
  assertEquals(e.ocorridoEm, new Date(1790000000 * 1000).toISOString());
  const estendido = mensagem(classificarEventoEvolution(evento({ extendedTextMessage: { text: "com link" } })));
  assertEquals(estendido.conteudo, { kind: "texto", texto: "com link" });
});

Deno.test("aceita variações do nome do evento", () => {
  for (const nome of ["MESSAGES_UPSERT", "messages-upsert", "messages.upsert"]) {
    assertEquals(classificarEventoEvolution({ ...evento(), event: nome }).tipo, "mensagem", nome);
  }
});

Deno.test("texto longo é truncado e timestamp inválido cai em 'agora'", () => {
  const e = mensagem(classificarEventoEvolution(evento({ conversation: "x".repeat(9000) }, {}, { messageTimestamp: "lixo" })));
  assertEquals(e.conteudo.kind === "texto" && e.conteudo.texto.length, 4000);
  assert(Math.abs(Date.now() - Date.parse(e.ocorridoEm)) < 5000);
});

Deno.test("ignora SÓ: grupo, broadcast/status, própria conta, reação, protocolo e sem conteúdo", () => {
  const casos: Array<[string, unknown]> = [
    ["grupo_ou_status", evento({ conversation: "x" }, { remoteJid: "120363@g.us" })],
    ["grupo_ou_status", evento({ conversation: "x" }, { remoteJid: "status@broadcast" })],
    ["propria_conta", evento({ conversation: "x" }, { fromMe: true })],
    ["sem_conteudo", evento({ reactionMessage: { text: "👍" } })],
    ["sem_conteudo", evento({ protocolMessage: { type: 0 } })],
    ["sem_conteudo", evento({ conversation: "   " })],
    ["sem_conteudo", evento({ messageContextInfo: {}, senderKeyDistributionMessage: {} })],
    ["sem_identificador", evento({ conversation: "x" }, { id: undefined })],
    ["evento_desconhecido", { ...evento(), event: "presence.update" }],
  ];
  for (const [motivo, payload] of casos) {
    const r = classificarEventoEvolution(payload);
    assertEquals(r.tipo, "ignorar", motivo);
    if (r.tipo === "ignorar") assertEquals(r.motivo, motivo);
  }
  assertEquals(classificarEventoEvolution(null).tipo, "ignorar");
  assertEquals(classificarEventoEvolution("x").tipo, "ignorar");
});

Deno.test("eventos de conexão e de reconhecimento", () => {
  assertEquals(classificarEventoEvolution({ event: "connection.update", data: { state: "open" } }), { tipo: "conexao", estado: "open" });
  assertEquals(classificarEventoEvolution({ event: "CONNECTION_UPDATE", data: { state: "close" } }), { tipo: "conexao", estado: "close" });
  assertEquals(classificarEventoEvolution({ event: "connection.update", data: { state: "estranho" } }), { tipo: "conexao", estado: "desconhecido" });
  for (const nome of ["qrcode.updated", "messages.update", "send.message"]) {
    assertEquals(classificarEventoEvolution({ event: nome, data: {} }).tipo, "reconhecido", nome);
  }
});

Deno.test("anexos viram mensagem com tipo, nome, mime, tamanho e legenda", () => {
  const imagem = mensagem(classificarEventoEvolution(evento({ imageMessage: { mimetype: "image/jpeg", caption: "meu passaporte", fileLength: "2048" } })));
  assertEquals(imagem.conteudo, {
    kind: "midia",
    midia: { tipo: "imagem", mime: "image/jpeg", nome: "imagem-3EB0ABC.jpg", tamanhoBytes: 2048, legenda: "meu passaporte" },
  });
  const doc = mensagem(classificarEventoEvolution(evento({ documentMessage: { mimetype: "application/pdf", fileName: "contrato.pdf", fileLength: 99 } })));
  assertEquals(doc.conteudo.kind === "midia" && [doc.conteudo.midia.tipo, doc.conteudo.midia.nome], ["arquivo", "contrato.pdf"]);
  const audio = mensagem(classificarEventoEvolution(evento({ audioMessage: { mimetype: "audio/ogg; codecs=opus", seconds: 4 } })));
  assertEquals(audio.conteudo.kind === "midia" && [audio.conteudo.midia.tipo, audio.conteudo.midia.mime], ["audio", "audio/ogg"]);
  const video = mensagem(classificarEventoEvolution(evento({ videoMessage: { mimetype: "video/mp4" } })));
  assertEquals(video.conteudo.kind === "midia" && video.conteudo.midia.tipo, "video");
});

Deno.test("anexo dentro de envoltório (documento com legenda, mensagem temporária) é lido", () => {
  const e = mensagem(classificarEventoEvolution(evento({
    documentWithCaptionMessage: { message: { documentMessage: { mimetype: "application/pdf", fileName: "a.pdf", caption: "segue" } } },
  })));
  assertEquals(e.conteudo.kind === "midia" && e.conteudo.midia.legenda, "segue");
  const temp = mensagem(classificarEventoEvolution(evento({ ephemeralMessage: { message: { conversation: "oi temporário" } } })));
  assertEquals(temp.conteudo, { kind: "texto", texto: "oi temporário" });
});

Deno.test("nome de arquivo malicioso é neutralizado", () => {
  const e = mensagem(classificarEventoEvolution(evento({ documentMessage: { mimetype: "application/pdf", fileName: "../../etc/passwd" } })));
  assert(e.conteudo.kind === "midia" && !e.conteudo.midia.nome.includes("/"));
});

Deno.test("figurinha, contato, localização e tipo desconhecido viram aviso em texto (nada some)", () => {
  const casos: Array<[Record<string, unknown>, string]> = [
    [{ stickerMessage: {} }, "[Figurinha recebida]"],
    [{ contactMessage: {} }, "[Contato compartilhado]"],
    [{ locationMessage: {} }, "[Localização compartilhada]"],
    [{ pollCreationMessage: {} }, "[Mensagem de tipo não suportado]"],
  ];
  for (const [m, aviso] of casos) {
    assertEquals(mensagem(classificarEventoEvolution(evento(m))).conteudo, { kind: "aviso", texto: aviso });
  }
});

Deno.test("remetente: telefone com sufixo de dispositivo é normalizado", () => {
  const r = identificarRemetente({ remoteJid: "5511988881001:16@s.whatsapp.net" }, {});
  assertEquals(r?.telefone, "5511988881001");
});

Deno.test("remetente @lid: telefone só de campo alternativo do próprio evento", () => {
  const alt = identificarRemetente({ remoteJid: "9988776655@lid", remoteJidAlt: "5511988881001@s.whatsapp.net" }, {});
  assertEquals(alt, { telefone: "5511988881001", lid: "9988776655@lid", referenciaNaoIdentificada: null });
  const sender = identificarRemetente({ remoteJid: "9988776655@lid", senderPn: "5511988881001:5@s.whatsapp.net" }, {});
  assertEquals(sender?.telefone, "5511988881001");
  const dados = identificarRemetente({ remoteJid: "9988776655@lid" }, { senderPn: "5511988881001@s.whatsapp.net" });
  assertEquals(dados?.telefone, "5511988881001");
});

Deno.test("remetente @lid sem prova: sem telefone, guarda referência não identificada", () => {
  const r = identificarRemetente({ remoteJid: "9988776655@lid" }, { pushName: "Fulano" });
  assertEquals(r, { telefone: null, lid: "9988776655@lid", referenciaNaoIdentificada: "lid:9988776655" });
  const e = mensagem(classificarEventoEvolution(evento({ conversation: "Oi" }, { remoteJid: "9988776655@lid" })));
  assertEquals(e.remetente.telefone, null);
});

Deno.test("telefones conflitantes no mesmo evento não são usados", () => {
  const r = identificarRemetente(
    { remoteJid: "5511988881001@s.whatsapp.net", remoteJidAlt: "5511977770000@s.whatsapp.net" },
    {},
  );
  assertEquals(r?.telefone, null);
  assert(r?.referenciaNaoIdentificada?.startsWith("conflito:"));
  const lidConflito = identificarRemetente(
    { remoteJid: "9988776655@lid", remoteJidAlt: "5511988881001@s.whatsapp.net", senderPn: "5511977770000@s.whatsapp.net" },
    {},
  );
  assertEquals(lidConflito?.telefone, null);
});

Deno.test("nome e foto nunca são prova: pushName não vira telefone", () => {
  const r = identificarRemetente({ remoteJid: "9988776655@lid" }, { pushName: "5511988881001" });
  assertEquals(r?.telefone, null);
});
