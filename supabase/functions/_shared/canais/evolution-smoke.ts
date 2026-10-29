// _shared/canais/evolution-smoke.ts — smoke de contrato contra um servidor Evolution REAL
// (E13-S15, FR-024, SC-007). A lógica mora aqui para ser testada com cliente falso; a casca de linha
// de comando é `scripts/evolution-contract-smoke.ts`.
//
// Cria UMA instância efêmera (nome `smoke-…`), prova as capacidades que não precisam de número
// pareado e SEMPRE apaga a instância no fim (o smoke do TriviAtende só fazia logout e deixava lixo
// no servidor). Nunca devolve chave, QR, token, telefone ou corpo de resposta: só versão, nomes de
// capacidade, latência e códigos curtos.
import { type ClienteEvolution, type ConfigWebhook, ErroEvolution } from "./evolution-cliente.ts";
import { CAPACIDADE_DE_ENVIO, CAPACIDADES_OBRIGATORIAS } from "./evolution-estado.ts";

export interface OpcoesSmoke {
  /** Nome da instância efêmera (único; nunca reutilize o de uma instância de produção). */
  nome: string;
  /** Prova `webhookHeaders`/`webhookEvents` (gravação + releitura). Sem isso, ficam não provadas. */
  webhook?: ConfigWebhook;
  /** Instância JÁ pareada, usada só para provar o envio. NÃO é apagada. */
  envio?: { instancia: string; numero: string; texto: string };
  log?: (evento: Record<string, unknown>) => void;
}

export interface ResultadoSmoke {
  versao: string | null;
  capacidades: Record<string, { provada: boolean; ms: number }>;
  /** As capacidades obrigatórias (5) estão todas provadas. */
  compativel: boolean;
  /** `true` apagada; `false` ficou no servidor (apague à mão); `null` nem foi criada. */
  apagada: boolean | null;
  erro: string | null;
  observacoes: string[];
}

const codigo = (e: unknown) => (e instanceof ErroEvolution ? `${e.codigo}${e.status ? `_${e.status}` : ""}` : "erro_inesperado");

export async function rodarSmoke(cliente: ClienteEvolution, op: OpcoesSmoke): Promise<ResultadoSmoke> {
  const log = op.log ?? (() => {});
  const r: ResultadoSmoke = { versao: null, capacidades: {}, compativel: false, apagada: null, erro: null, observacoes: [] };

  async function provar(nome: string, fn: () => Promise<boolean>) {
    const inicio = Date.now();
    let provada = false;
    try {
      provada = await fn();
    } catch (e) {
      r.observacoes.push(`${nome}: ${codigo(e)}`);
    }
    r.capacidades[nome] = { provada, ms: Date.now() - inicio };
    log({ evento: "capacidade", capacidade: nome, provada });
  }

  let criada = false;
  try {
    r.versao = await cliente.versao();
    log({ evento: "versao", versao: r.versao });

    await provar("instanceCreate", async () => {
      await cliente.criarInstancia(op.nome);
      criada = true;
      return true;
    });
    if (criada) {
      await provar("qr", async () => (await cliente.conectar(op.nome)).qrBase64.length > 0);
      await provar("connectionState", async () => (await cliente.estado(op.nome)).estado.length > 0);
      if (op.webhook) {
        const config = op.webhook;
        let ok = false;
        await provar("webhookHeaders", async () => {
          await cliente.configurarWebhook(op.nome, config); // grava e RELÊ (URL, cabeçalho, eventos, base64)
          ok = true;
          return true;
        });
        r.capacidades.webhookEvents = { provada: ok, ms: r.capacidades.webhookHeaders.ms };
        log({ evento: "capacidade", capacidade: "webhookEvents", provada: ok });
      } else {
        r.observacoes.push("webhookHeaders/webhookEvents: informe a configuração do webhook para provar");
      }
    } else {
      r.observacoes.push("a instância não foi criada: as demais capacidades não foram avaliadas");
    }

    if (op.envio) {
      const envio = op.envio;
      await provar(CAPACIDADE_DE_ENVIO, async () => {
        await cliente.enviarTexto(envio.instancia, envio.numero, envio.texto);
        return true;
      });
    } else {
      r.observacoes.push("sendText: não avaliado (exige instância já pareada); a mensagem de teste do produto também prova");
    }
  } catch (e) {
    r.erro = codigo(e);
    log({ evento: "erro", codigo: r.erro });
  } finally {
    // Sempre tenta apagar, mesmo que a criação tenha dado erro no meio (resposta perdida).
    try {
      await cliente.apagarInstancia(op.nome);
      r.apagada = true;
      r.capacidades.deleteInstance = { provada: true, ms: 0 };
    } catch (e) {
      // 404 = não existia (criação nunca aconteceu): nada a limpar.
      if (e instanceof ErroEvolution && e.status === 404 && !criada) {
        r.apagada = null;
      } else {
        r.apagada = false;
        r.observacoes.push(`instância ${op.nome} ficou no servidor: apague pelo painel da Evolution (${codigo(e)})`);
      }
    }
  }
  r.compativel = CAPACIDADES_OBRIGATORIAS.every((c) => r.capacidades[c]?.provada === true);
  return r;
}
