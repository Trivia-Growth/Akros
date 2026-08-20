import { create } from "zustand";

import type { Reuniao, Transcricao } from "@/features/agenda/domain/types";
import type {
  Conversa,
  EventoComunicacao,
  FonteConhecimento,
  RegraAtendimentoIA,
} from "@/features/comunicacao/domain/types";
import type {
  ContaAgendaConectada,
  ContaCanalConectada,
  CredenciaisContaAgenda,
  CredenciaisMeta,
  IntegracaoExterna,
  ProvedorAgenda,
  ProvedorCanal,
} from "@/features/configuracoes/domain/types";
import type { Cliente, Proposta } from "@/features/crm/domain/types";
import type {
  AnaliseDocumento,
  Documento,
  SolicitacaoAssinatura,
} from "@/features/documentos/domain/types";
import { instanciarJornada } from "@/features/jornada/application/instanciar-jornada";
import type { Jornada } from "@/features/jornada/domain/types";
import type { Pagamento } from "@/features/pagamentos/domain/types";
import type { Programa } from "@/features/programas/domain/types";
import type { Depoimento, PostBlog } from "@/features/site/domain/types";
import type {
  EstagioLead,
  Lead,
  NovoLead,
  OrigemCampoPerfil,
  PerfilLead,
} from "@/shared/contracts/lead";

import { agentesAtendimentoIA, regraAtendimentoIA as regraAtendimentoIASeed } from "./agente-ia";
import { basesConhecimento as basesConhecimentoSeed } from "./bases-conhecimento";
import { depoimentos as depoimentosSeed, posts as postsSeed } from "./blog";
import { toquesCadenciaMock } from "./cadencia";
import { contasAgenda as contasAgendaSeed } from "./contas-agenda";
import { contasCanal as contasCanalSeed } from "./contas-canal";
import { conversas as conversasSeed } from "./conversas";
import {
  documentos as documentosSeed,
  solicitacoesAssinatura as solicitacoesSeed,
} from "./documentos";
import { integracoes as integracoesSeed } from "./integracoes";
import { leads as leadsSeed } from "./leads";
import { pagamentos as pagamentosSeed } from "./pagamentos";
import { personas } from "./personas";
import { catalogoProgramas } from "./programas";
import { propostas as propostasSeed } from "./propostas";
import { mapearRespostaLivre, roteiroQualificacaoMock } from "./qualificacao";
import { reunioes as reunioesSeed, transcricoes as transcricoesSeed } from "./reunioes";

const LATENCIA_MS = 150;
const PROGRAMA_DEFAULT = "eb2-niw";

export function comLatencia<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), LATENCIA_MS));
}

function novoId(prefixo: string): string {
  return `${prefixo}-${crypto.randomUUID().slice(0, 8)}`;
}

function agora(): string {
  return new Date().toISOString();
}

interface MockDbState {
  leads: Lead[];
  clientes: Cliente[];
  jornadas: Jornada[];
  documentos: Documento[];
  solicitacoesAssinatura: SolicitacaoAssinatura[];
  pagamentos: Pagamento[];
  reunioes: Reuniao[];
  transcricoes: Transcricao[];
  conversas: Conversa[];
  propostas: Proposta[];
  eventosComunicacao: EventoComunicacao[];
  posts: PostBlog[];
  depoimentos: Depoimento[];
  regraAtendimentoIA: RegraAtendimentoIA;
  agentesIA: RegraAtendimentoIA[];
  programas: Programa[];
  integracoes: IntegracaoExterna[];
  contasAgenda: ContaAgendaConectada[];
  contasCanal: ContaCanalConectada[];
  basesConhecimento: FonteConhecimento[];

  // --- Leads / CRM ---
  criarLead: (input: NovoLead) => Lead;
  moverEstagioLead: (id: string, estagio: EstagioLead) => void;
  adicionarNotaLead: (id: string, nota: string) => void;
  criarClienteAPartirDeLead: (leadId: string, programaCodigo?: string) => Cliente;
  atualizarCliente: (id: string, patch: Partial<Cliente>) => void;

  // --- Comunicação / Timeline (E08-S01) ---
  registrarEvento: (evento: Omit<EventoComunicacao, "id">) => EventoComunicacao;
  resolverPendenciaDeCanal: (eventoId: string) => void;

  // --- Jornada ---
  liberarFase: (clienteId: string, faseId: string) => void;
  concluirEtapa: (clienteId: string, etapaId: string) => void;

  // --- Documentos (E07) ---
  registrarEnvioDocumento: (id: string, urlMock: string) => void;
  salvarAnaliseDocumento: (documentoId: string, analise: AnaliseDocumento) => void;
  confirmarEnvioApesarDoAlerta: (id: string) => void;
  decidirDocumento: (
    id: string,
    decisao: "aprovado" | "ajustes",
    autor: string,
    motivoAjuste?: string,
  ) => void;
  assinarSolicitacao: (id: string, nomeAssinante: string) => void;

  // --- Pagamentos (E10) ---
  marcarPagamentoComoPago: (id: string) => void;
  anexarComprovantePagamento: (id: string, urlMock: string) => void;
  confirmarPagamento: (id: string, autor: string) => void;
  marcarDivergenciaPagamento: (id: string, valorRecebido: number, autor: string) => void;

  // --- Agenda ---
  agendarReuniao: (input: Omit<Reuniao, "id" | "status">) => Reuniao;

  // --- Comunicação (WhatsApp inbox, E04-S01) ---
  enviarMensagemConversa: (conversaId: string, texto: string) => void;
  atualizarConfigAgente: (patch: Partial<RegraAtendimentoIA>) => void;
  salvarAgenteIA: (agente: RegraAtendimentoIA) => void;

  // --- Produto configurável ---
  salvarPrograma: (programa: Programa) => void;
  duplicarPrograma: (programaId: string) => Programa | null;
  atualizarIntegracao: (
    integracaoId: string,
    patch: Pick<Partial<IntegracaoExterna>, "ativa"> & { apiKey?: string },
  ) => void;
  atualizarCredenciaisMeta: (
    integracaoId: string,
    patch: {
      ativa: boolean;
      appId: string;
      appSecret?: string;
      accessToken?: string;
      webhookVerifyToken: string;
      contaInstagramId: string;
    },
  ) => void;
  conectarContaAgenda: (input: {
    provedor: ProvedorAgenda;
    nomeExibicao: string;
    credenciais: CredenciaisContaAgenda;
  }) => ContaAgendaConectada;
  desconectarContaAgenda: (contaId: string) => void;
  conectarContaCanal: (input: {
    provedor: ProvedorCanal;
    nomeExibicao: string;
    identificador: string;
  }) => ContaCanalConectada;
  desconectarContaCanal: (contaId: string) => void;
  salvarBaseConhecimento: (
    fonte: Omit<FonteConhecimento, "id"> & { id?: string },
  ) => FonteConhecimento;

  // --- Propostas ---
  criarProposta: (input: Omit<Proposta, "id" | "status" | "criadoEm">) => Proposta;
  enviarProposta: (id: string) => void;
  marcarStatusProposta: (id: string, status: Proposta["status"]) => void;

  // --- Pré-venda (E11) ---
  atualizarPerfilLead: (id: string, patch: Partial<PerfilLead>, origem: OrigemCampoPerfil) => void;
  responderQualificacaoLead: (id: string, perguntaId: string, respostaLivre: string) => void;
  registrarToqueCadencia: (id: string) => void;
  pausarCadencia: (id: string) => void;
  encerrarCadenciaManual: (id: string) => void;
  decidirGateAgendamento: (
    id: string,
    decisao: "aprovado" | "recusado",
    autor: string,
    motivoRecusa?: string,
  ) => void;
  marcarNaoContatar: (id: string) => void;

  // --- Demo ---
  resetarDemo: () => void;
  carregarCenario: (fabrica: () => Partial<MockDbSeed>) => void;
}

export interface MockDbSeed {
  leads: Lead[];
  clientes: Cliente[];
  jornadas: Jornada[];
  documentos: Documento[];
  solicitacoesAssinatura: SolicitacaoAssinatura[];
  pagamentos: Pagamento[];
  reunioes: Reuniao[];
  transcricoes: Transcricao[];
  conversas: Conversa[];
  propostas: Proposta[];
  eventosComunicacao: EventoComunicacao[];
  programas: Programa[];
  integracoes: IntegracaoExterna[];
  contasAgenda: ContaAgendaConectada[];
  contasCanal: ContaCanalConectada[];
  basesConhecimento: FonteConhecimento[];
}

function seedPadrao(): MockDbSeed {
  return {
    leads: [...leadsSeed],
    clientes: personas.map((p) => p.cliente),
    jornadas: personas.map((p) => p.jornada),
    documentos: [...documentosSeed],
    solicitacoesAssinatura: [...solicitacoesSeed],
    pagamentos: [...pagamentosSeed],
    reunioes: [...reunioesSeed],
    transcricoes: [...transcricoesSeed],
    conversas: [...conversasSeed],
    propostas: [...propostasSeed],
    eventosComunicacao: [],
    programas: structuredClone(catalogoProgramas),
    integracoes: structuredClone(integracoesSeed),
    contasAgenda: structuredClone(contasAgendaSeed),
    contasCanal: structuredClone(contasCanalSeed),
    basesConhecimento: structuredClone(basesConhecimentoSeed),
  };
}

export const useMockDb = create<MockDbState>((set, get) => ({
  ...seedPadrao(),
  posts: [...postsSeed],
  depoimentos: [...depoimentosSeed],
  regraAtendimentoIA: { ...regraAtendimentoIASeed },
  agentesIA: structuredClone(agentesAtendimentoIA),
  programas: structuredClone(catalogoProgramas),
  integracoes: structuredClone(integracoesSeed),

  criarLead: (input) => {
    const lead: Lead = {
      ...input,
      id: novoId("lead"),
      estagio: "lead",
      criadoEm: agora(),
      notas: [],
    };
    set((s) => ({ leads: [...s.leads, lead] }));
    return lead;
  },

  moverEstagioLead: (id, estagio) => {
    // E11-S04 AC-2: nenhum caminho move um lead para "reuniao_agendada" sem aprovação do gate.
    const lead = get().leads.find((l) => l.id === id);
    if (estagio === "reuniao_agendada" && lead?.gateAgendamento?.status !== "aprovado") return;
    set((s) => ({
      leads: s.leads.map((l) => (l.id === id ? { ...l, estagio } : l)),
    }));
  },

  adicionarNotaLead: (id, nota) => {
    set((s) => ({
      leads: s.leads.map((l) => (l.id === id ? { ...l, notas: [...l.notas, nota] } : l)),
    }));
  },

  criarClienteAPartirDeLead: (leadId, programaCodigo = PROGRAMA_DEFAULT) => {
    const lead = get().leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} não encontrado`);

    const programa = get().programas.find((p) => p.codigo === programaCodigo);
    if (!programa) throw new Error(`Programa ${programaCodigo} não encontrado`);

    const clienteId = novoId("cliente");
    const cliente: Cliente = {
      id: clienteId,
      leadOrigemId: lead.id,
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      tipoVisto: lead.tipoVistoInteresse,
      caseManager: "Natalia Luz",
      criadoEm: agora(),
      saude: "em_dia",
      programaId: programa.codigo,
      programaVersao: programa.versao,
    };

    const jornada = instanciarJornada(programa, clienteId, novoId("jornada"));

    set((s) => ({
      clientes: [...s.clientes, cliente],
      jornadas: [...s.jornadas, jornada],
      leads: s.leads.map((l) => (l.id === leadId ? { ...l, estagio: "fechado" as const } : l)),
    }));

    return cliente;
  },

  atualizarCliente: (id, patch) => {
    set((s) => ({
      clientes: s.clientes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },

  registrarEvento: (evento) => {
    const criado: EventoComunicacao = { ...evento, id: novoId("evento") };
    set((s) => ({ eventosComunicacao: [...s.eventosComunicacao, criado] }));
    return criado;
  },

  resolverPendenciaDeCanal: (eventoId) => {
    set((s) => ({
      eventosComunicacao: s.eventosComunicacao.map((e) =>
        e.id === eventoId ? { ...e, pendenteDeCanal: false } : e,
      ),
    }));
  },

  liberarFase: (clienteId, faseId) => {
    set((s) => ({
      jornadas: s.jornadas.map((j) => {
        if (j.clienteId !== clienteId) return j;
        return {
          ...j,
          faseAtualId: faseId,
          fases: j.fases.map((f) => (f.id === faseId ? { ...f, status: "liberada" as const } : f)),
        };
      }),
    }));
    get().registrarEvento({
      clienteOuLeadId: clienteId,
      canal: "sistema",
      direcao: "interno",
      autor: "Case manager",
      conteudo: `Fase ${faseId} liberada pelo case manager.`,
      ocorridoEm: agora(),
    });
  },

  concluirEtapa: (clienteId, etapaId) => {
    const jornadaAntes = get().jornadas.find((jornada) => jornada.clienteId === clienteId);
    const faseDaEtapa = jornadaAntes?.fases.find((fase) =>
      fase.etapas.some((etapa) => etapa.id === etapaId),
    );
    const etapa = faseDaEtapa?.etapas.find((item) => item.id === etapaId);
    const concluiFase =
      faseDaEtapa !== undefined &&
      faseDaEtapa.etapas.filter((item) => item.status === "pendente").length === 1;
    set((s) => ({
      jornadas: s.jornadas.map((j) => {
        if (j.clienteId !== clienteId) return j;
        const fases = j.fases.map((f) => {
          const temEtapa = f.etapas.some((e) => e.id === etapaId);
          if (!temEtapa) return f;
          const etapas = f.etapas.map((e) =>
            e.id === etapaId ? { ...e, status: "concluida" as const } : e,
          );
          const todasConcluidas = etapas.every((e) => e.status === "concluida");
          return {
            ...f,
            etapas,
            status: todasConcluidas ? ("concluida" as const) : ("em_andamento" as const),
          };
        });
        return { ...j, fases };
      }),
    }));
    if (etapa && faseDaEtapa) {
      get().registrarEvento({
        clienteOuLeadId: clienteId,
        canal: "sistema",
        direcao: "interno",
        autor: "Cliente",
        conteudo: concluiFase
          ? `Concluiu a fase "${faseDaEtapa.titulo}".`
          : `Concluiu a etapa "${etapa.titulo}".`,
        ocorridoEm: agora(),
      });
    }
  },

  registrarEnvioDocumento: (id, urlMock) => {
    set((s) => ({
      documentos: s.documentos.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "em_analise" as const,
              urlMock,
              enviadoEm: agora(),
              enviadoApesarDoAlerta: false,
              analise: undefined,
              decisao: undefined,
            }
          : d,
      ),
    }));
  },

  salvarAnaliseDocumento: (documentoId, analise) => {
    set((s) => ({
      documentos: s.documentos.map((d) => (d.id === documentoId ? { ...d, analise } : d)),
    }));
  },

  confirmarEnvioApesarDoAlerta: (id) => {
    set((s) => ({
      documentos: s.documentos.map((d) =>
        d.id === id ? { ...d, enviadoApesarDoAlerta: true } : d,
      ),
    }));
  },

  decidirDocumento: (id, decisao, autor, motivoAjuste) => {
    const documento = get().documentos.find((d) => d.id === id);
    const concordouComIA = documento?.analise
      ? (documento.analise.aderencia === "atende" ||
          documento.analise.aderencia === "atende_com_ressalva") ===
        (decisao === "aprovado")
      : false;

    set((s) => ({
      documentos: s.documentos.map((d) =>
        d.id === id
          ? {
              ...d,
              status: decisao,
              decisao: { decisao, autor, decididoEm: agora(), concordouComIA, motivoAjuste },
            }
          : d,
      ),
    }));

    if (documento) {
      get().registrarEvento({
        clienteOuLeadId: documento.clienteId,
        canal: "sistema",
        direcao: "interno",
        autor,
        conteudo:
          decisao === "aprovado"
            ? `Documento "${documento.nome}" aprovado.`
            : `Documento "${documento.nome}" devolvido para ajustes: ${motivoAjuste ?? "sem motivo informado"}.`,
        ocorridoEm: agora(),
      });
    }
  },

  assinarSolicitacao: (id, nomeAssinante) => {
    set((s) => ({
      solicitacoesAssinatura: s.solicitacoesAssinatura.map((sol) =>
        sol.id === id
          ? { ...sol, status: "assinado" as const, assinadoPor: nomeAssinante, assinadoEm: agora() }
          : sol,
      ),
    }));
  },

  marcarPagamentoComoPago: (id) => {
    set((s) => ({
      pagamentos: s.pagamentos.map((p) =>
        p.id === id ? { ...p, status: "pago" as const, pagoEm: agora() } : p,
      ),
    }));
  },

  anexarComprovantePagamento: (id, urlMock) => {
    const pagamento = get().pagamentos.find((p) => p.id === id);
    set((s) => ({
      pagamentos: s.pagamentos.map((p) =>
        p.id === id
          ? { ...p, status: "em_conferencia" as const, comprovanteUrl: urlMock, anexadoEm: agora() }
          : p,
      ),
    }));
    if (pagamento) {
      get().registrarEvento({
        clienteOuLeadId: pagamento.clienteId,
        canal: "chat_portal",
        direcao: "entrada",
        autor: "Cliente",
        conteudo: `Comprovante anexado para "${pagamento.descricao}".`,
        anexos: [{ nome: "comprovante.pdf" }],
        ocorridoEm: agora(),
      });
    }
  },

  confirmarPagamento: (id, autor) => {
    const pagamento = get().pagamentos.find((p) => p.id === id);
    set((s) => ({
      pagamentos: s.pagamentos.map((p) =>
        p.id === id ? { ...p, status: "pago" as const, pagoEm: agora(), confirmadoPor: autor } : p,
      ),
    }));
    if (pagamento) {
      get().registrarEvento({
        clienteOuLeadId: pagamento.clienteId,
        canal: "sistema",
        direcao: "interno",
        autor,
        conteudo: `Pagamento "${pagamento.descricao}" confirmado.`,
        ocorridoEm: agora(),
      });
    }
  },

  marcarDivergenciaPagamento: (id, valorRecebido, autor) => {
    const pagamento = get().pagamentos.find((p) => p.id === id);
    set((s) => ({
      pagamentos: s.pagamentos.map((p) =>
        p.id === id
          ? { ...p, status: "divergente" as const, valorRecebido, confirmadoPor: autor }
          : p,
      ),
    }));
    if (pagamento) {
      get().registrarEvento({
        clienteOuLeadId: pagamento.clienteId,
        canal: "sistema",
        direcao: "interno",
        autor,
        conteudo: `Divergência de valor em "${pagamento.descricao}": esperado ${pagamento.valor}, recebido ${valorRecebido}.`,
        ocorridoEm: agora(),
      });
    }
  },

  agendarReuniao: (input) => {
    const reuniao: Reuniao = { ...input, id: novoId("reuniao"), status: "agendada" };
    set((s) => ({ reunioes: [...s.reunioes, reuniao] }));
    return reuniao;
  },

  enviarMensagemConversa: (conversaId, texto) => {
    set((s) => ({
      conversas: s.conversas.map((c) =>
        c.id === conversaId
          ? {
              ...c,
              mensagens: [
                ...c.mensagens,
                {
                  id: novoId("msg"),
                  autor: "humano" as const,
                  texto,
                  enviadoEm: agora(),
                  lida: true,
                },
              ],
            }
          : c,
      ),
    }));
  },

  atualizarConfigAgente: (patch) => {
    set((s) => {
      const regraAtualizada = { ...s.regraAtendimentoIA, ...patch };
      return {
        regraAtendimentoIA: regraAtualizada,
        agentesIA: s.agentesIA.map((agente) =>
          agente.id === regraAtualizada.id ? regraAtualizada : agente,
        ),
      };
    });
  },

  salvarAgenteIA: (agente) => {
    set((s) => ({
      agentesIA: s.agentesIA.map((atual) =>
        atual.id === agente.id ? structuredClone(agente) : atual,
      ),
      regraAtendimentoIA:
        s.regraAtendimentoIA.id === agente.id ? structuredClone(agente) : s.regraAtendimentoIA,
    }));
  },

  salvarPrograma: (programa) => {
    set((s) => ({
      programas: s.programas.map((atual) =>
        atual.id === programa.id ? structuredClone(programa) : atual,
      ),
    }));
  },

  duplicarPrograma: (programaId) => {
    const origem = get().programas.find((programa) => programa.id === programaId);
    if (!origem) return null;
    const sufixo = crypto.randomUUID().slice(0, 4);
    const copia: Programa = {
      ...structuredClone(origem),
      id: `programa-${sufixo}`,
      codigo: `${origem.codigo}-${sufixo}`,
      nome: `${origem.nome} — cópia`,
      versao: "0.1",
      ativo: false,
    };
    set((s) => ({ programas: [...s.programas, copia] }));
    return copia;
  },

  atualizarIntegracao: (integracaoId, patch) => {
    set((s) => ({
      integracoes: s.integracoes.map((integracao) => {
        if (integracao.id !== integracaoId) return integracao;
        const segredoFinal = patch.apiKey?.trim()
          ? patch.apiKey.trim().slice(-4).toUpperCase()
          : integracao.segredoFinal;
        return {
          ...integracao,
          ativa: patch.ativa ?? integracao.ativa,
          segredoConfigurado: segredoFinal ? true : integracao.segredoConfigurado,
          segredoFinal,
          atualizadoEm: agora(),
        };
      }),
    }));
  },

  atualizarCredenciaisMeta: (integracaoId, patch) => {
    set((s) => ({
      integracoes: s.integracoes.map((integracao) => {
        if (integracao.id !== integracaoId) return integracao;
        const anterior = integracao.credenciaisMeta;
        const appSecretFinal = patch.appSecret?.trim()
          ? patch.appSecret.trim().slice(-4).toUpperCase()
          : anterior?.appSecretFinal;
        const accessTokenFinal = patch.accessToken?.trim()
          ? patch.accessToken.trim().slice(-4).toUpperCase()
          : anterior?.accessTokenFinal;
        const credenciaisMeta: CredenciaisMeta = {
          appId: patch.appId,
          appSecretConfigurado: appSecretFinal ? true : (anterior?.appSecretConfigurado ?? false),
          appSecretFinal,
          accessTokenConfigurado: accessTokenFinal
            ? true
            : (anterior?.accessTokenConfigurado ?? false),
          accessTokenFinal,
          webhookVerifyToken: patch.webhookVerifyToken,
          contaInstagramId: patch.contaInstagramId,
        };
        return {
          ...integracao,
          ativa: patch.ativa,
          segredoConfigurado: credenciaisMeta.appSecretConfigurado,
          credenciaisMeta,
          atualizadoEm: agora(),
        };
      }),
    }));
  },

  conectarContaAgenda: (input) => {
    const conta: ContaAgendaConectada = {
      id: novoId("agenda"),
      provedor: input.provedor,
      nomeExibicao: input.nomeExibicao,
      ativa: true,
      conectadoEm: agora(),
      credenciais: input.credenciais,
    };
    set((s) => ({ contasAgenda: [...s.contasAgenda, conta] }));
    return conta;
  },

  desconectarContaAgenda: (contaId) => {
    set((s) => ({ contasAgenda: s.contasAgenda.filter((c) => c.id !== contaId) }));
  },

  conectarContaCanal: (input) => {
    const conta: ContaCanalConectada = {
      id: novoId("canal"),
      provedor: input.provedor,
      nomeExibicao: input.nomeExibicao,
      identificador: input.identificador,
      ativa: true,
      conectadoEm: agora(),
    };
    set((s) => ({ contasCanal: [...s.contasCanal, conta] }));
    return conta;
  },

  desconectarContaCanal: (contaId) => {
    set((s) => ({ contasCanal: s.contasCanal.filter((c) => c.id !== contaId) }));
  },

  salvarBaseConhecimento: (fonte) => {
    const salva: FonteConhecimento = { ...fonte, id: fonte.id ?? novoId("kb") };
    set((s) => ({
      basesConhecimento: s.basesConhecimento.some((f) => f.id === salva.id)
        ? s.basesConhecimento.map((f) => (f.id === salva.id ? salva : f))
        : [...s.basesConhecimento, salva],
    }));
    return salva;
  },

  criarProposta: (input) => {
    const proposta: Proposta = {
      ...input,
      id: novoId("proposta"),
      status: "rascunho",
      criadoEm: agora(),
    };
    set((s) => ({ propostas: [...s.propostas, proposta] }));
    return proposta;
  },

  enviarProposta: (id) => {
    set((s) => ({
      propostas: s.propostas.map((p) => (p.id === id ? { ...p, status: "enviada" as const } : p)),
    }));
  },

  marcarStatusProposta: (id, status) => {
    set((s) => ({
      propostas: s.propostas.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  },

  atualizarPerfilLead: (id, patch, origem) => {
    set((s) => ({
      leads: s.leads.map((l) => {
        if (l.id !== id) return l;
        const perfilOrigem = { ...l.perfilOrigem };
        for (const chave of Object.keys(patch)) {
          perfilOrigem[chave as keyof PerfilLead] = origem;
        }
        return { ...l, perfil: { ...l.perfil, ...patch }, perfilOrigem };
      }),
    }));
  },

  responderQualificacaoLead: (id, perguntaId, respostaLivre) => {
    const lead = get().leads.find((l) => l.id === id);
    if (!lead) return;

    const indiceAtual = roteiroQualificacaoMock.findIndex((p) => p.id === perguntaId);
    const pergunta = roteiroQualificacaoMock[indiceAtual];
    if (!pergunta) return;

    const respostaMapeada = mapearRespostaLivre(pergunta, respostaLivre);
    const origem: OrigemCampoPerfil =
      respostaMapeada === respostaLivre.trim() ? "informado_lead" : "inferido_bot";

    const respostas = { ...(lead.qualificacao?.respostas ?? {}), [perguntaId]: respostaLivre };
    const proximoIndice = indiceAtual + 1;
    const concluida = proximoIndice >= roteiroQualificacaoMock.length;

    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id
          ? {
              ...l,
              qualificacao: {
                status: concluida ? "concluida" : "em_andamento",
                perguntaAtualIndex: proximoIndice,
                respostas,
              },
            }
          : l,
      ),
    }));

    if (respostaMapeada && pergunta.campo !== "nome") {
      get().atualizarPerfilLead(
        id,
        { [pergunta.campo]: respostaMapeada } as Partial<PerfilLead>,
        origem,
      );
    }
    if (pergunta.campo === "nome" && respostaMapeada) {
      set((s) => ({
        leads: s.leads.map((l) => (l.id === id ? { ...l, nome: respostaMapeada } : l)),
      }));
    }

    // AC-2 (E11-S03): resposta do lead encerra a cadência imediatamente.
    if (lead.cadencia?.status === "ativa") {
      get().encerrarCadenciaManual(id);
    }
  },

  registrarToqueCadencia: (id) => {
    const lead = get().leads.find((l) => l.id === id);
    if (!lead) return;
    const toqueAtual = (lead.cadencia?.toqueAtual ?? 0) + 1;
    const esgotada = toqueAtual >= toquesCadenciaMock.length;

    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id
          ? {
              ...l,
              cadencia: {
                status: esgotada ? "encerrada" : "ativa",
                toqueAtual,
                motivoEncerramento: esgotada ? "esgotada" : undefined,
              },
            }
          : l,
      ),
    }));

    const toque = toquesCadenciaMock[toqueAtual - 1];
    if (toque) {
      get().registrarEvento({
        clienteOuLeadId: id,
        canal: "whatsapp",
        direcao: "saida",
        autor: "Agente IA",
        conteudo: toque.mensagem,
        ocorridoEm: agora(),
      });
    }
  },

  pausarCadencia: (id) => {
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id && l.cadencia
          ? { ...l, cadencia: { ...l.cadencia, status: "pausada" as const } }
          : l,
      ),
    }));
  },

  encerrarCadenciaManual: (id) => {
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id
          ? {
              ...l,
              cadencia: {
                status: "encerrada",
                toqueAtual: l.cadencia?.toqueAtual ?? 0,
                motivoEncerramento:
                  l.cadencia?.status === "ativa" ? "respondeu" : "desligada_manual",
              },
            }
          : l,
      ),
    }));
  },

  decidirGateAgendamento: (id, decisao, autor, motivoRecusa) => {
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id
          ? {
              ...l,
              gateAgendamento: { status: decisao, autor, decididoEm: agora(), motivoRecusa },
              estagio: decisao === "recusado" ? ("descartado" as const) : l.estagio,
            }
          : l,
      ),
    }));
  },

  marcarNaoContatar: (id) => {
    set((s) => ({
      leads: s.leads.map((l) => (l.id === id ? { ...l, naoContatar: true } : l)),
    }));
  },

  resetarDemo: () => {
    set({
      ...seedPadrao(),
      regraAtendimentoIA: structuredClone(regraAtendimentoIASeed),
      agentesIA: structuredClone(agentesAtendimentoIA),
    });
  },

  carregarCenario: (fabrica) => {
    set((s) => ({
      ...s,
      ...seedPadrao(),
      regraAtendimentoIA: structuredClone(regraAtendimentoIASeed),
      agentesIA: structuredClone(agentesAtendimentoIA),
      ...fabrica(),
    }));
  },
}));
