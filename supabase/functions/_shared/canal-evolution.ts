// _shared/canal-evolution.ts — API administrativa do canal Evolution (E13-S15, contrato em
// specs/006-evolution-confiavel/contracts/canal-evolution.md). Toda a decisão vive aqui, com E/S
// injetada; `canal-evolution/index.ts` só liga o mundo real. Admin-only, CSRF, rate limit,
// Zod `.strict()`, e NENHUMA resposta carrega chave, token, segredo ou corpo da Evolution.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError } from "./auth.ts";
import {
  criarHandlersTranscricao,
  type DepsTranscricao,
  DefinirTranscricaoAtiva,
  SalvarTranscricao,
  TestarTranscricao,
} from "./canal-transcricao.ts";
import { ErroCanal } from "./erro-canal.ts";
import {
  type ClienteEvolution,
  criarClienteEvolution,
  ErroEvolution,
} from "./canais/evolution-cliente.ts";
import {
  avaliarCompatibilidade,
  CABECALHO_DO_WEBHOOK,
  CAPACIDADE_DE_ENVIO,
  CAPACIDADES_CONHECIDAS,
  ESCOPO_SERVIDOR,
  type EstadoConexao,
  EVENTOS_DO_WEBHOOK,
  type LinhaCompatibilidade,
  nomeDaInstancia,
  numerosIguais,
  transicaoPermitida,
} from "./canais/evolution-estado.ts";
import { type ResultadoUrl, urlBaseNormalizada } from "./canais/evolution-url.ts";
import { escopoEvolution, type SegredoEvolution, type SegredoServidorEvolution } from "./segredos.ts";

const MAX_BYTES = 16 * 1024;
const VALIDADE_QR_MS = 60_000;

export interface ServidorLinha {
  id: string;
  url_base: string;
  versao_detectada: string | null;
  estado: "pendente" | "compativel" | "incompativel";
  motivo: string | null;
  indicio: string;
}

export interface ContaLinha {
  id: string;
  provedor: string;
  nome_exibicao: string;
  identificador: string;
  ativa: boolean;
  estado_conexao: EstadoConexao;
  nome_instancia: string | null;
  aceite_risco_em: string | null;
  aceite_risco_por?: string | null;
  ultimo_erro_codigo?: string | null;
  credenciais_configuradas?: boolean;
  deleted_at: string | null;
}

export interface PatchConta {
  ativa?: boolean;
  estado_conexao?: EstadoConexao;
  ultimo_erro_codigo?: string | null;
  nome_instancia?: string;
  credenciais_configuradas?: boolean;
  aceite_risco_em?: string;
  aceite_risco_por?: string;
}

export interface DepsCanalEvolution {
  limite(req: Request): Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
  /** Lança `HttpError` 401/403. Papel vem do Auth, nunca do corpo. */
  autenticarAdmin(req: Request): Promise<{ userId: string }>;
  /** Lança `HttpError` quando falta o cabeçalho anti-CSRF. */
  exigirCsrf(req: Request): void;
  cors(origem: string | null): Record<string, string>;
  buscador: typeof fetch;
  validarUrl(url: string): Promise<ResultadoUrl>;
  urlProjeto: string;
  gerarToken(): string;
  agora(): Date;
  servidores: {
    buscar(): Promise<ServidorLinha | null>;
    salvar(v: {
      url_base: string;
      versao_detectada: string | null;
      estado: ServidorLinha["estado"];
      motivo: string | null;
      indicio: string;
      atualizado_por: string;
    }): Promise<ServidorLinha>;
  };
  compat: {
    buscar(versao: string): Promise<(LinhaCompatibilidade & { afetadaLogout: boolean }) | null>;
    salvar(v: {
      versao: string;
      capacidades: string[];
      afetada_logout: boolean;
      evidencia: string;
      registrada_por: string;
    }): Promise<void>;
  };
  contas: {
    buscar(id: string): Promise<ContaLinha | null>;
    buscarPorNumero(digitos: string): Promise<ContaLinha | null>;
    criar(v: { nome_exibicao: string; identificador: string; criada_por: string }): Promise<string>;
    atualizar(id: string, patch: PatchConta): Promise<void>;
    /** Servidor trocado: as instâncias antigas não existem no novo, então todo canal volta ao começo. */
    resetarEvolution(codigo: string): Promise<void>;
  };
  segredos: {
    obter<T>(escopo: string): Promise<T | null>;
    salvar(escopo: string, valor: Record<string, string>): Promise<void>;
  };
  agentes: { vincular(agenteId: string, contaId: string): Promise<boolean> };
  /** Configuração da transcrição de áudio (E13-S15, ADR-0022). */
  transcricao: DepsTranscricao["transcricao"];
}

const uuid = z.string().uuid();
const capacidade = z.enum(CAPACIDADES_CONHECIDAS as [string, ...string[]]);

const EntradaSchema = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("salvar_servidor"),
    urlBase: z.string().trim().min(8).max(300),
    apiKey: z.string().trim().min(8).max(2048),
  }).strict(),
  z.object({
    acao: z.literal("registrar_compatibilidade"),
    versao: z.string().trim().regex(/^[0-9A-Za-z._-]{1,40}$/),
    capacidades: z.array(capacidade).max(16),
    afetadaLogout: z.boolean(),
    evidencia: z.string().trim().min(3).max(500),
  }).strict(),
  z.object({
    acao: z.literal("criar_canal"),
    nomeExibicao: z.string().trim().min(2).max(120),
    numero: z.string().trim().min(8).max(30),
  }).strict(),
  z.object({ acao: z.literal("criar_instancia"), contaId: uuid }).strict(),
  z.object({ acao: z.literal("instalar_webhook"), contaId: uuid }).strict(),
  z.object({ acao: z.literal("aceitar_risco"), contaId: uuid }).strict(),
  z.object({ acao: z.literal("gerar_qr"), contaId: uuid }).strict(),
  z.object({ acao: z.literal("consultar_estado"), contaId: uuid }).strict(),
  z.object({
    acao: z.literal("enviar_teste"),
    contaId: uuid,
    numero: z.string().trim().min(8).max(30),
  }).strict(),
  z.object({ acao: z.literal("definir_ativa"), contaId: uuid, ativa: z.boolean() }).strict(),
  z.object({ acao: z.literal("vincular_agente"), contaId: uuid, agenteId: uuid }).strict(),
  SalvarTranscricao,
  TestarTranscricao,
  DefinirTranscricaoAtiva,
]);

type Entrada = z.infer<typeof EntradaSchema>;
type Acao<A extends Entrada["acao"]> = Extract<Entrada, { acao: A }>;

const MENSAGEM_EVOLUTION: Record<string, [number, string]> = {
  url_recusada: [400, "O endereço do servidor foi recusado por segurança."],
  chave_recusada: [502, "A Evolution recusou a chave. Confira a chave de administração do servidor."],
  servidor_indisponivel: [502, "Não foi possível falar com o servidor Evolution. Confira o endereço e se ele está no ar."],
  webhook_nao_confirmado: [502, "A Evolution aceitou o webhook mas a leitura não confere. O canal continua incompleto; tente de novo."],
  webhook_falhou: [502, "A Evolution não aceitou a configuração do webhook."],
  criar_instancia_falhou: [502, "A Evolution não criou a instância."],
  qr_indisponivel: [502, "A Evolution não devolveu o QR Code. Tente de novo em instantes."],
  qr_falhou: [502, "Não foi possível gerar o QR Code agora."],
  estado_falhou: [502, "Não foi possível consultar a conexão agora."],
  envio_falhou: [502, "A Evolution não enviou a mensagem de teste. Confira se o número continua conectado."],
};

function falhaEvolution(erro: unknown): ErroCanal {
  if (erro instanceof ErroCanal) return erro;
  const codigo = erro instanceof ErroEvolution ? erro.codigo : "servidor_indisponivel";
  const [status, mensagem] = MENSAGEM_EVOLUTION[codigo] ?? [502, "A Evolution respondeu algo inesperado."];
  return new ErroCanal(status, codigo, mensagem);
}

export function criarManipuladorCanalEvolution(d: DepsCanalEvolution) {
  const validarOuLancar = async (url: string) => {
    const r = await d.validarUrl(url);
    if (!r.valida) throw new Error("url_recusada");
  };

  async function contaEvolution(contaId: string): Promise<ContaLinha> {
    const conta = await d.contas.buscar(contaId);
    if (!conta || conta.deleted_at || conta.provedor !== "evolution") {
      throw new ErroCanal(422, "canal_invalido", "Canal Evolution não encontrado.");
    }
    return conta;
  }

  async function servidorCompativel(): Promise<{ servidor: ServidorLinha; cliente: ClienteEvolution }> {
    const servidor = await d.servidores.buscar();
    const naoConfigurado = new ErroCanal(409, "servidor_nao_configurado", "Configure um servidor Evolution compatível primeiro.");
    if (!servidor || servidor.estado !== "compativel") throw naoConfigurado;
    const segredo = await d.segredos.obter<SegredoServidorEvolution>(ESCOPO_SERVIDOR(servidor.id));
    if (!segredo?.apiKey) throw naoConfigurado;
    return {
      servidor,
      cliente: criarClienteEvolution({
        buscador: d.buscador,
        baseUrl: servidor.url_base,
        apiKey: segredo.apiKey,
        validar: validarOuLancar,
      }),
    };
  }

  async function mudar(conta: ContaLinha, para: EstadoConexao, codigo: string | null, extra: PatchConta = {}) {
    if (!transicaoPermitida(conta.estado_conexao, para)) {
      throw new ErroCanal(409, "transicao_invalida", "Esse canal não pode ir para esse estado agora.");
    }
    await d.contas.atualizar(conta.id, { estado_conexao: para, ultimo_erro_codigo: codigo, ...extra });
  }

  const handlers = {
    async salvar_servidor(e: Acao<"salvar_servidor">, userId: string) {
      const validacao = await d.validarUrl(e.urlBase);
      if (!validacao.valida) throw new ErroCanal(400, "url_recusada", validacao.motivo ?? "Endereço recusado.");
      const base = urlBaseNormalizada(e.urlBase);
      const probe = criarClienteEvolution({ buscador: d.buscador, baseUrl: base, apiKey: e.apiKey, validar: validarOuLancar });
      let versao: string;
      try {
        versao = await probe.versao();
      } catch (erro) {
        throw falhaEvolution(erro);
      }
      const linha = await d.compat.buscar(versao);
      const avaliacao = avaliarCompatibilidade(versao, linha);
      const anterior = await d.servidores.buscar();
      const servidor = await d.servidores.salvar({
        url_base: base,
        versao_detectada: versao,
        estado: avaliacao.compativel ? "compativel" : "incompativel",
        motivo: avaliacao.motivo ?? null,
        indicio: e.apiKey.slice(-4),
        atualizado_por: userId,
      });
      await d.segredos.salvar(ESCOPO_SERVIDOR(servidor.id), { apiKey: e.apiKey });
      // Outro endereço = outro servidor: as instâncias e os pareamentos antigos não existem lá.
      if (anterior && anterior.url_base !== base) await d.contas.resetarEvolution("servidor_trocado");
      return {
        estado: servidor.estado,
        versao,
        indicio: servidor.indicio,
        afetadaLogout: linha?.afetadaLogout ?? false,
        ...(avaliacao.motivo ? { motivo: avaliacao.motivo } : {}),
      };
    },

    async registrar_compatibilidade(e: Acao<"registrar_compatibilidade">, userId: string) {
      await d.compat.salvar({
        versao: e.versao,
        capacidades: [...new Set(e.capacidades)],
        afetada_logout: e.afetadaLogout,
        evidencia: e.evidencia,
        registrada_por: userId,
      });
      const linha = await d.compat.buscar(e.versao);
      const avaliacao = avaliarCompatibilidade(e.versao, linha);
      const servidor = await d.servidores.buscar();
      let estadoServidor: ServidorLinha["estado"] | null = null;
      if (servidor && servidor.versao_detectada === e.versao) {
        const salvo = await d.servidores.salvar({
          url_base: servidor.url_base,
          versao_detectada: servidor.versao_detectada,
          estado: avaliacao.compativel ? "compativel" : "incompativel",
          motivo: avaliacao.motivo ?? null,
          indicio: servidor.indicio,
          atualizado_por: userId,
        });
        estadoServidor = salvo.estado;
      }
      return { versao: e.versao, compativel: avaliacao.compativel, estadoServidor };
    },

    async criar_canal(e: Acao<"criar_canal">, userId: string) {
      const digitos = e.numero.replace(/\D/g, "");
      if (digitos.length < 8 || digitos.length > 15) {
        throw new ErroCanal(400, "numero_invalido", "Informe o número com DDI e DDD, só dígitos (8 a 15).");
      }
      const existente = await d.contas.buscarPorNumero(digitos);
      if (existente && !existente.deleted_at) {
        throw new ErroCanal(409, "numero_ja_cadastrado", "Já existe um canal com esse número.");
      }
      const contaId = await d.contas.criar({ nome_exibicao: e.nomeExibicao, identificador: digitos, criada_por: userId });
      return { contaId, estado: "sem_credencial" as const };
    },

    async criar_instancia(e: Acao<"criar_instancia">) {
      const conta = await contaEvolution(e.contaId);
      const { cliente } = await servidorCompativel();
      if (conta.nome_instancia && conta.estado_conexao !== "sem_credencial") {
        return { estado: conta.estado_conexao, jaExistia: true };
      }
      const nome = nomeDaInstancia(conta.id);
      let jaExistia: boolean;
      try {
        ({ jaExistia } = await cliente.criarInstancia(nome));
      } catch (erro) {
        const falha = falhaEvolution(erro);
        await d.contas.atualizar(conta.id, { ultimo_erro_codigo: falha.codigo });
        throw falha;
      }
      await mudar(conta, "configuracao_incompleta", null, { nome_instancia: nome });
      return { estado: "configuracao_incompleta" as const, jaExistia };
    },

    async instalar_webhook(e: Acao<"instalar_webhook">) {
      const conta = await contaEvolution(e.contaId);
      if (!conta.nome_instancia) throw new ErroCanal(409, "instancia_nao_criada", "Crie a instância primeiro.");
      const { cliente } = await servidorCompativel();
      // O segredo é gravado ANTES de a Evolution conhecê-lo: a primeira entrega já se autentica.
      const escopo = escopoEvolution(conta.id);
      const atual = await d.segredos.obter<SegredoEvolution>(escopo);
      const token = atual?.webhookToken || d.gerarToken();
      if (!atual?.webhookToken) await d.segredos.salvar(escopo, { webhookToken: token });
      const url = `${d.urlProjeto.replace(/\/+$/, "")}/functions/v1/evolution-webhook?conta=${conta.id}`;
      try {
        await cliente.configurarWebhook(conta.nome_instancia, {
          url,
          cabecalhos: { [CABECALHO_DO_WEBHOOK]: token },
          eventos: EVENTOS_DO_WEBHOOK,
          base64: false,
        });
      } catch (erro) {
        const falha = falhaEvolution(erro);
        // Falha NUNCA ativa o canal; fica retomável.
        if (conta.estado_conexao !== "conectado_verificado") {
          await d.contas.atualizar(conta.id, {
            estado_conexao: "configuracao_incompleta",
            ultimo_erro_codigo: falha.codigo,
            credenciais_configuradas: false,
          });
        } else {
          await d.contas.atualizar(conta.id, { ultimo_erro_codigo: falha.codigo });
        }
        throw falha;
      }
      // Duas configurações simultâneas podem deixar um segredo no cofre e outro na Evolution — e a
      // Evolution NÃO reenvia evento recusado com 401. Confere que o cofre ainda guarda o que valeu.
      const noCofre = await d.segredos.obter<SegredoEvolution>(escopo);
      if (noCofre?.webhookToken !== token) {
        await d.contas.atualizar(conta.id, {
          ...(conta.estado_conexao === "conectado_verificado" ? {} : { estado_conexao: "configuracao_incompleta" as const, credenciais_configuradas: false }),
          ultimo_erro_codigo: "conflito_configuracao",
        });
        throw new ErroCanal(409, "conflito_configuracao", "Outra configuração aconteceu ao mesmo tempo. Tente de novo.");
      }
      const proximo: EstadoConexao = conta.estado_conexao === "conectado_verificado" ? "conectado_verificado" : "aguardando_pareamento";
      await mudar(conta, proximo, null, { credenciais_configuradas: true });
      return { estado: proximo };
    },

    async aceitar_risco(e: Acao<"aceitar_risco">, userId: string) {
      const conta = await contaEvolution(e.contaId);
      await d.contas.atualizar(conta.id, { aceite_risco_em: d.agora().toISOString(), aceite_risco_por: userId });
      return { aceito: true };
    },

    async gerar_qr(e: Acao<"gerar_qr">) {
      const conta = await contaEvolution(e.contaId);
      if (!conta.nome_instancia || (conta.estado_conexao !== "aguardando_pareamento" && conta.estado_conexao !== "desconectado")) {
        throw new ErroCanal(409, "instancia_nao_aguarda_pareamento", "A instância ainda não está pronta para parear.");
      }
      if (!conta.aceite_risco_em) {
        throw new ErroCanal(409, "risco_nao_aceito", "Registre o aceite do risco de banimento antes de gerar o QR Code.");
      }
      const { cliente } = await servidorCompativel();
      try {
        const { qrBase64 } = await cliente.conectar(conta.nome_instancia);
        // O QR vive só nesta resposta (e na memória do navegador): nunca em banco ou log.
        return { qrBase64, expiraEm: new Date(d.agora().getTime() + VALIDADE_QR_MS).toISOString() };
      } catch (erro) {
        throw falhaEvolution(erro);
      }
    },

    async consultar_estado(e: Acao<"consultar_estado">) {
      const conta = await contaEvolution(e.contaId);
      if (!conta.nome_instancia) throw new ErroCanal(409, "instancia_nao_criada", "Crie a instância primeiro.");
      const nome = conta.nome_instancia;
      const pareavel = ["aguardando_pareamento", "desconectado", "conectado_verificado"].includes(conta.estado_conexao);
      if (!pareavel) return { estado: conta.estado_conexao };
      const { cliente } = await servidorCompativel();
      const caiu = async (codigo: string) => {
        if (conta.estado_conexao === "conectado_verificado") {
          await mudar(conta, "desconectado", codigo);
        }
      };
      let aberto: boolean;
      try {
        aberto = (await cliente.estado(nome)).estado === "open";
      } catch (erro) {
        await caiu("servidor_indisponivel");
        throw falhaEvolution(erro);
      }
      if (!aberto) {
        await caiu("sessao_encerrada");
        return { estado: conta.estado_conexao === "conectado_verificado" ? "desconectado" : conta.estado_conexao };
      }
      let numero: string | null;
      try {
        numero = await cliente.numeroPareado(nome);
      } catch (erro) {
        throw falhaEvolution(erro);
      }
      if (numero && numerosIguais(numero, conta.identificador)) {
        if (conta.estado_conexao !== "conectado_verificado") await mudar(conta, "conectado_verificado", null);
        return { estado: "conectado_verificado" as const };
      }
      if (numero) {
        // Outro número pareou: NÃO conecta, e não força logout (pode parar o recebimento).
        const para: EstadoConexao = conta.estado_conexao === "conectado_verificado" ? "desconectado" : "aguardando_pareamento";
        await mudar(conta, para, "numero_divergente");
        return { estado: para, numeroDivergente: true as const };
      }
      return { estado: conta.estado_conexao, semNumero: true as const };
    },

    /** Mensagem de teste pelo próprio produto: prova o ENVIO neste servidor antes de ligar o agente. */
    async enviar_teste(e: Acao<"enviar_teste">, userId: string) {
      const conta = await contaEvolution(e.contaId);
      if (conta.estado_conexao !== "conectado_verificado" || !conta.nome_instancia) {
        throw new ErroCanal(409, "canal_nao_conectado", "Conecte e verifique o número antes de enviar o teste.");
      }
      const destino = e.numero.replace(/\D/g, "");
      if (destino.length < 8 || destino.length > 15) {
        throw new ErroCanal(400, "numero_invalido", "Informe o número com DDI e DDD, só dígitos (8 a 15).");
      }
      if (numerosIguais(destino, conta.identificador)) {
        throw new ErroCanal(400, "numero_proprio", "Use um número diferente do canal: enviar para si mesmo não prova nada.");
      }
      const { servidor, cliente } = await servidorCompativel();
      try {
        await cliente.enviarTexto(conta.nome_instancia, destino, "Teste de conexão do Akros. Pode ignorar esta mensagem.");
      } catch (erro) {
        throw falhaEvolution(erro);
      }
      const versao = servidor.versao_detectada;
      if (versao) {
        const linha = await d.compat.buscar(versao);
        if (linha && !linha.capacidades.includes(CAPACIDADE_DE_ENVIO)) {
          await d.compat.salvar({
            versao,
            capacidades: [...linha.capacidades, CAPACIDADE_DE_ENVIO],
            afetada_logout: linha.afetadaLogout,
            evidencia: `${d.agora().toISOString().slice(0, 10)}: envio provado pela mensagem de teste do produto`,
            registrada_por: userId,
          });
        }
      }
      return { enviado: true };
    },

    async definir_ativa(e: Acao<"definir_ativa">) {
      const conta = await contaEvolution(e.contaId);
      if (e.ativa) {
        if (conta.estado_conexao !== "conectado_verificado") {
          throw new ErroCanal(409, "canal_nao_conectado", "Só dá para ativar um canal conectado e verificado.");
        }
        const servidor = await d.servidores.buscar();
        const linha = servidor?.versao_detectada ? await d.compat.buscar(servidor.versao_detectada) : null;
        if (!linha?.capacidades.includes(CAPACIDADE_DE_ENVIO)) {
          throw new ErroCanal(409, "envio_nao_provado", "Envie a mensagem de teste antes de ativar: o envio ainda não foi provado neste servidor.");
        }
      }
      await d.contas.atualizar(conta.id, { ativa: e.ativa });
      return { ativa: e.ativa };
    },

    async vincular_agente(e: Acao<"vincular_agente">) {
      const conta = await contaEvolution(e.contaId);
      if (!(await d.agentes.vincular(e.agenteId, conta.id))) {
        throw new ErroCanal(404, "agente_inexistente", "Agente não encontrado.");
      }
      return { vinculado: true };
    },

    ...criarHandlersTranscricao({ buscador: d.buscador, agora: d.agora, transcricao: d.transcricao, segredos: d.segredos }),
  };

  return async (req: Request): Promise<Response> => {
    const cors = d.cors(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

    const limite = await d.limite(req);
    if (!limite.permitido) {
      const s = limite.reiniciaEm ? Math.max(1, Math.ceil((limite.reiniciaEm.getTime() - Date.now()) / 1000)) : 60;
      return new Response(JSON.stringify({ erro: "Muitas requisições. Tente de novo em instantes.", codigo: "limite" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(s) },
      });
    }

    const reqId = crypto.randomUUID().slice(0, 8);
    let acao = "desconhecida";
    try {
      d.exigirCsrf(req);
      const { userId } = await d.autenticarAdmin(req);
      const bruto = await req.text();
      if (new TextEncoder().encode(bruto).byteLength > MAX_BYTES) throw new HttpError(413, "Dados excedem o limite");
      const entrada = EntradaSchema.parse(JSON.parse(bruto));
      acao = entrada.acao;
      // deno-lint-ignore no-explicit-any
      const resultado = await (handlers[entrada.acao] as (e: any, u: string) => Promise<unknown>)(entrada, userId);
      console.log(JSON.stringify({ ts: new Date().toISOString(), nivel: "info", fn: "canal-evolution", reqId, acao, status: 200 }));
      return new Response(JSON.stringify(resultado), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    } catch (erro) {
      let status = 500;
      let codigo = "erro_interno";
      let mensagem = "Não foi possível concluir a operação.";
      if (erro instanceof ErroCanal) {
        ({ status, codigo, message: mensagem } = erro);
      } else if (erro instanceof HttpError) {
        status = erro.status;
        codigo = status === 401 ? "nao_autenticado" : status === 403 ? "sem_permissao" : "requisicao_invalida";
        mensagem = erro.message;
      } else if (erro instanceof z.ZodError || erro instanceof SyntaxError) {
        status = 400;
        codigo = "requisicao_invalida";
        mensagem = "Dados inválidos.";
      }
      // Só ação, status e código: nunca corpo, chave, URL completa ou mensagem do provedor.
      console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: "canal-evolution", reqId, acao, status, codigo }));
      return new Response(JSON.stringify({ erro: mensagem, codigo, reqId }), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  };
}
