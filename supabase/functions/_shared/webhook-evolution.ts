// _shared/webhook-evolution.ts — webhook da Evolution API (E13-S12/S13/S15).
// Autenticação por capability token por conta, em cabeçalho (ADR-0012): a URL não carrega segredo.
//
// Regra (E13-S15): NADA individual some em silêncio. Texto, anexo, figurinha, tipo não suportado e
// remetente sem telefone comprovado viram mensagem; só grupo, status, própria conta, reação,
// protocolo e mensagem vazia são ignorados (e dito por quê em `classificarEventoEvolution`).
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { processarEntrada } from "./agente.ts";
import { LIMITE_ANEXO_BYTES, motivoParaNaoBaixar } from "./canais/anexo.ts";
import { classificarEventoEvolution, type EventoEvolution } from "./canais/evolution.ts";
import { type ClienteEvolution, criarClienteEvolution } from "./canais/evolution-cliente.ts";
import { numerosIguais } from "./canais/evolution-estado.ts";
import { type AnexoEntrada, type EntradaCanal, LIMITE_TEXTO_SAIDA } from "./canais/tipos.ts";
import { ErroTranscricao, transcrever } from "./canais/transcricao.ts";
import { constantTimeEqual } from "./crypto.ts";
import { escopoEvolution, type SegredoEvolution } from "./segredos.ts";
import {
  type ContaCanal,
  type IOEvolution,
  lerCorpoLimitado,
  resposta,
  resposta429,
  UUID,
} from "./webhook.ts";

type MensagemEvolution = Extract<EventoEvolution, { tipo: "mensagem" }>;

export const CABECALHO_WEBHOOK = "x-akros-webhook";

function logSeguro(evento: Record<string, unknown>) {
  console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: "evolution-webhook", ...evento }));
}

export function criarManipuladorEvolution(io: IOEvolution) {
  async function clienteDoServidor(conta: ContaCanal): Promise<{ cliente: ClienteEvolution; nome: string } | null> {
    const servidor = await io.servidorEvolution();
    if (!servidor || !conta.nome_instancia) return null;
    return {
      nome: conta.nome_instancia,
      cliente: criarClienteEvolution({
        buscador: io.buscador,
        baseUrl: servidor.urlBase,
        apiKey: servidor.apiKey,
        validar: io.validarUrl,
      }),
    };
  }

  /** `open` não prova o número: confere o pareado com o cadastrado antes de marcar conectado. */
  async function tratarConexao(conta: ContaCanal, estado: "open" | "close" | "connecting" | "desconhecido") {
    const atual = conta.estado_conexao ?? "sem_credencial";
    if (estado === "close") {
      // Fechar durante o pareamento é o ciclo normal do QR; só derruba quem estava conectado.
      if (atual === "conectado_verificado") await io.atualizarConexao(conta.id, "desconectado", "sessao_encerrada");
      return;
    }
    if (estado !== "open") return;
    if (atual !== "aguardando_pareamento" && atual !== "desconectado" && atual !== "conectado_verificado") return;
    const alvo = await clienteDoServidor(conta);
    if (!alvo || !conta.identificador) return;
    const numero = await alvo.cliente.numeroPareado(alvo.nome);
    if (numero && numerosIguais(numero, conta.identificador)) {
      if (atual !== "conectado_verificado") await io.atualizarConexao(conta.id, "conectado_verificado", null);
    } else if (numero) {
      await io.atualizarConexao(
        conta.id,
        atual === "conectado_verificado" ? "desconectado" : "aguardando_pareamento",
        "numero_divergente",
      );
    }
  }

  /** `bytes` só vem quando o anexo foi baixado E guardado (é o que a transcrição consome). */
  async function prepararAnexo(
    conta: ContaCanal,
    alvo: { cliente: ClienteEvolution; nome: string } | null,
    evento: MensagemEvolution,
  ): Promise<{ anexo: AnexoEntrada; bytes?: Uint8Array }> {
    if (evento.conteudo.kind !== "midia") throw new Error("anexo_sem_midia");
    const m = evento.conteudo.midia;
    const base = { nome: m.nome, mime: m.mime, tamanhoBytes: m.tamanhoBytes };
    const barrado = motivoParaNaoBaixar(m.mime, m.tamanhoBytes);
    if (barrado) return { anexo: { ...base, baixado: false, motivo: barrado } };
    if (!alvo) return { anexo: { ...base, baixado: false, motivo: "download" } };
    try {
      const baixada = await alvo.cliente.baixarMidia(alvo.nome, evento.origemId, LIMITE_ANEXO_BYTES);
      const mime = (baixada.mime ?? m.mime).split(";")[0].trim().toLowerCase();
      const bytes = decodeBase64(baixada.base64);
      const depois = motivoParaNaoBaixar(mime, bytes.byteLength);
      if (depois) return { anexo: { ...base, baixado: false, motivo: depois } };
      const caminho = await io.guardarAnexo({ contaId: conta.id, origemId: evento.origemId, bytes, mime });
      return { anexo: { ...base, mime, tamanhoBytes: bytes.byteLength, baixado: true, caminho }, bytes };
    } catch {
      // Falha de rede, base64 inválido ou armazenamento: a mensagem continua registrada.
      return { anexo: { ...base, baixado: false, motivo: "download" } };
    }
  }

  /**
   * Áudio -> texto, quando a transcrição está ligada. `null` = desligada (nada muda). Qualquer falha
   * (teto, rede, provedor, áudio sem fala) devolve `falhou` com um CÓDIGO: a mensagem segue como
   * anexo + encaminhamento à equipe, exatamente como sem transcrição. Nunca derruba o webhook.
   */
  async function transcreverAudio(
    req: Request,
    contaId: string,
    audio: { bytes: Uint8Array; mime: string },
  ): Promise<{ texto: string; anexo: NonNullable<AnexoEntrada["transcricao"]> } | { anexo: NonNullable<AnexoEntrada["transcricao"]> } | null> {
    let config;
    try {
      config = await io.transcricao();
    } catch {
      logSeguro({ msg: "transcrição: falha ao ler a configuração", contaId });
      return { anexo: { estado: "falhou", motivo: "configuracao" } };
    }
    if (!config) return null;
    const falhou = (motivo: string) => {
      logSeguro({ msg: "transcrição não concluída", motivo, contaId });
      return { anexo: { estado: "falhou" as const, motivo } };
    };
    try {
      const limite = await io.limiteTranscricao(req);
      if (!limite.permitido) return falhou("limite");
      const r = await transcrever({
        buscador: io.buscador,
        provedor: config.provedor,
        modelo: config.modelo,
        chave: config.chave,
        idioma: config.idioma,
        audio: audio.bytes,
        mime: audio.mime,
      });
      return { texto: r.texto, anexo: { estado: "concluida", provedor: config.provedor, modelo: config.modelo } };
    } catch (erro) {
      return falhou(erro instanceof ErroTranscricao ? erro.codigo : "provedor_indisponivel");
    }
  }

  async function tratarMensagem(req: Request, conta: ContaCanal, evento: MensagemEvolution) {
    const alvo = await clienteDoServidor(conta);

    // 1) Quem escreveu: telefone só de prova (campo do evento ou par no histórico da instância).
    let telefone = evento.remetente.telefone;
    if (!telefone && evento.remetente.lid && alvo) {
      try {
        telefone = await alvo.cliente.telefoneDoLid(alvo.nome, evento.remetente.lid);
      } catch {
        telefone = null; // sem histórico acessível: continua como não identificado
      }
    }
    const identificada = telefone !== null;
    const contato = telefone ?? evento.remetente.referenciaNaoIdentificada ?? `lid:${evento.origemId.slice(0, 40)}`;

    // 2) Conteúdo. Anexo só é baixado se a mensagem ainda não foi recebida.
    const c = evento.conteudo;
    let anexo: AnexoEntrada | undefined;
    let bytes: Uint8Array | undefined;
    if (c.kind === "midia") {
      if (await io.jaRecebida(conta.id, evento.origemId)) return;
      ({ anexo, bytes } = await prepararAnexo(conta, alvo, evento));
    }
    let textoEntrada = c.kind === "midia" ? (c.midia.legenda ?? "") : c.texto;
    let encaminhar = c.kind !== "texto";

    // 2b) Áudio guardado + transcrição ligada: o texto falado entra como mensagem, e o agente atende
    // como atenderia um texto. Sem transcrição (ou se ela falhar) segue o caminho do anexo comum.
    if (c.kind === "midia" && c.midia.tipo === "audio" && anexo?.baixado && bytes) {
      const t = await transcreverAudio(req, conta.id, { bytes, mime: anexo.mime });
      if (t) {
        anexo = { ...anexo, transcricao: t.anexo };
        if ("texto" in t) {
          textoEntrada = t.texto;
          encaminhar = false;
        }
      }
    }
    const entrada: EntradaCanal = {
      origemId: evento.origemId,
      contatoExterno: contato,
      nome: evento.nome,
      texto: textoEntrada,
      ocorridoEm: evento.ocorridoEm,
      tipo: c.kind === "midia" ? c.midia.tipo : "texto",
      identificacao: identificada ? "identificada" : "nao_identificada",
      encaminhar,
      ...(anexo ? { anexo } : {}),
    };

    const deps = io.criarDeps({
      contaId: conta.id,
      usaTelefone: true,
      enviar: async (texto) => {
        if (!alvo || !telefone) throw new Error("conta Evolution sem servidor, instância ou telefone");
        await alvo.cliente.enviarTexto(alvo.nome, telefone, texto);
      },
    });
    await processarEntrada(deps, entrada, {
      contaAtiva: conta.ativa && conta.estado_conexao === "conectado_verificado" && alvo !== null,
      limiteSaida: LIMITE_TEXTO_SAIDA.evolution,
    });
  }

  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return resposta(405);
    const limite = await io.limite(req);
    if (!limite.permitido) return resposta429(limite.reiniciaEm);

    try {
      const contaId = new URL(req.url).searchParams.get("conta") ?? "";
      if (!UUID.test(contaId)) return resposta(404);
      const conta = await io.carregarConta(contaId, "evolution");
      if (!conta) return resposta(404);

      // Autentica ANTES de ler o corpo: nenhuma PII é interpretada sem o segredo da conta.
      const segredo = await io.segredo<SegredoEvolution>(escopoEvolution(contaId));
      const recebido = req.headers.get(CABECALHO_WEBHOOK) ?? "";
      if (!segredo?.webhookToken || !constantTimeEqual(recebido, segredo.webhookToken)) {
        return resposta(401);
      }

      const corpo = await lerCorpoLimitado(req);
      if (corpo === null) return resposta(413);
      let payload: unknown;
      try {
        payload = JSON.parse(new TextDecoder().decode(corpo));
      } catch {
        return resposta(400);
      }

      const evento = classificarEventoEvolution(payload);
      if (evento.tipo === "ignorar") {
        logSeguro({ msg: "evento ignorado", motivo: evento.motivo, contaId });
        return resposta(200);
      }
      if (evento.tipo === "reconhecido") return resposta(200);
      if (evento.tipo === "conexao") {
        try {
          await tratarConexao(conta, evento.estado);
        } catch {
          // Estado é melhoria de visibilidade: nunca faz a Evolution reentregar nem derruba o webhook.
          logSeguro({ msg: "falha ao atualizar a conexão", contaId });
        }
        return resposta(200);
      }
      await tratarMensagem(req, conta, evento);
      return resposta(200);
    } catch {
      // Erro antes de gravar o recibo: 500 faz a Evolution reentregar e o recibo deduplica.
      logSeguro({ msg: "falha ao processar webhook" });
      return resposta(500);
    }
  };
}
