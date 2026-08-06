import { create } from "zustand";

import type { Reuniao, Transcricao } from "@/features/agenda/domain/types";
import type { RegraAtendimentoIA } from "@/features/comunicacao/domain/types";
import type { Conversa } from "@/features/comunicacao/domain/types";
import type { Cliente, Interacao, Proposta } from "@/features/crm/domain/types";
import type { Documento, SolicitacaoAssinatura } from "@/features/documentos/domain/types";
import type { Fase, Jornada } from "@/features/jornada/domain/types";
import type { Pagamento } from "@/features/pagamentos/domain/types";
import type { Depoimento, PostBlog } from "@/features/site/domain/types";
import type { EstagioLead, Lead, NovoLead } from "@/shared/contracts/lead";

import { regraAtendimentoIA as regraAtendimentoIASeed } from "./agente-ia";
import { depoimentos as depoimentosSeed, posts as postsSeed } from "./blog";
import { conversas as conversasSeed } from "./conversas";
import {
  documentos as documentosSeed,
  solicitacoesAssinatura as solicitacoesSeed,
} from "./documentos";
import { criarFasesTemplate } from "./jornada-template";
import { leads as leadsSeed } from "./leads";
import { pagamentos as pagamentosSeed } from "./pagamentos";
import { personas } from "./personas";
import { propostas as propostasSeed } from "./propostas";
import { reunioes as reunioesSeed, transcricoes as transcricoesSeed } from "./reunioes";

const LATENCIA_MS = 150;

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
  interacoes: Interacao[];
  posts: PostBlog[];
  depoimentos: Depoimento[];
  regraAtendimentoIA: RegraAtendimentoIA;

  // --- Leads / CRM ---
  criarLead: (input: NovoLead) => Lead;
  moverEstagioLead: (id: string, estagio: EstagioLead) => void;
  adicionarNotaLead: (id: string, nota: string) => void;
  criarClienteAPartirDeLead: (leadId: string) => Cliente;
  registrarInteracao: (interacao: Omit<Interacao, "id">) => void;

  // --- Jornada ---
  liberarFase: (clienteId: string, faseId: string) => void;
  concluirEtapa: (clienteId: string, etapaId: string) => void;

  // --- Documentos ---
  registrarEnvioDocumento: (id: string, urlMock: string) => void;
  assinarSolicitacao: (id: string, nomeAssinante: string) => void;

  // --- Pagamentos ---
  marcarPagamentoComoPago: (id: string) => void;

  // --- Agenda ---
  agendarReuniao: (input: Omit<Reuniao, "id" | "status">) => Reuniao;

  // --- Comunicação ---
  enviarMensagemConversa: (conversaId: string, texto: string) => void;
  atualizarConfigAgente: (patch: Partial<RegraAtendimentoIA>) => void;

  // --- Propostas ---
  criarProposta: (input: Omit<Proposta, "id" | "status" | "criadoEm">) => Proposta;
  enviarProposta: (id: string) => void;
  marcarStatusProposta: (id: string, status: Proposta["status"]) => void;

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
  interacoes: Interacao[];
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
    interacoes: [],
  };
}

export const useMockDb = create<MockDbState>((set, get) => ({
  ...seedPadrao(),
  posts: [...postsSeed],
  depoimentos: [...depoimentosSeed],
  regraAtendimentoIA: { ...regraAtendimentoIASeed },

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
    set((s) => ({
      leads: s.leads.map((l) => (l.id === id ? { ...l, estagio } : l)),
    }));
  },

  adicionarNotaLead: (id, nota) => {
    set((s) => ({
      leads: s.leads.map((l) => (l.id === id ? { ...l, notas: [...l.notas, nota] } : l)),
    }));
  },

  criarClienteAPartirDeLead: (leadId) => {
    const lead = get().leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} não encontrado`);

    const cliente: Cliente = {
      id: novoId("cliente"),
      leadOrigemId: lead.id,
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      tipoVisto: lead.tipoVistoInteresse,
      caseManager: "Natalia Luz",
      criadoEm: agora(),
      saude: "em_dia",
    };

    const jornada: Jornada = {
      id: novoId("jornada"),
      clienteId: cliente.id,
      faseAtualId: "fase-0",
      fases: criarFasesIniciais(),
    };

    set((s) => ({
      clientes: [...s.clientes, cliente],
      jornadas: [...s.jornadas, jornada],
      leads: s.leads.map((l) => (l.id === leadId ? { ...l, estagio: "fechado" as const } : l)),
    }));

    return cliente;
  },

  registrarInteracao: (interacao) => {
    set((s) => ({
      interacoes: [...s.interacoes, { ...interacao, id: novoId("interacao") }],
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
    get().registrarInteracao({
      clienteId,
      tipo: "mudanca_fase",
      descricao: `Fase ${faseId} liberada pelo case manager.`,
      ocorridoEm: agora(),
    });
  },

  concluirEtapa: (clienteId, etapaId) => {
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
  },

  registrarEnvioDocumento: (id, urlMock) => {
    set((s) => ({
      documentos: s.documentos.map((d) =>
        d.id === id ? { ...d, status: "enviado" as const, urlMock, enviadoEm: agora() } : d,
      ),
    }));
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
    set((s) => ({ regraAtendimentoIA: { ...s.regraAtendimentoIA, ...patch } }));
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

  resetarDemo: () => {
    set({ ...seedPadrao() });
  },

  carregarCenario: (fabrica) => {
    set((s) => ({ ...s, ...seedPadrao(), ...fabrica() }));
  },
}));

function criarFasesIniciais(): Fase[] {
  return criarFasesTemplate();
}
