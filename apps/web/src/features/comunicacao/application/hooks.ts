import { useMockDb } from "@/mocks/store";
import { useMemo } from "react";
import type { Conversa, EmailThread, EventoComunicacao } from "../domain/types";

export function useConversaCliente(clienteId: string | undefined): Conversa | undefined {
  return useMockDb((s) => s.conversas.find((c) => c.clienteId === clienteId));
}

export function useConversas(): Conversa[] {
  return useMockDb((s) => s.conversas);
}

export function useEmailThreads(): EmailThread[] {
  return useMockDb((s) => s.emailThreads);
}

/**
 * Timeline unificada (E08-S01). Funde eventosComunicacao com as mensagens da Conversa de
 * WhatsApp (E04-S01) do mesmo cliente/lead, num só fluxo cronológico. A Conversa continua
 * armazenada à parte — a unificação acontece só na leitura, ver domain/types.ts.
 */
export function useTimeline(clienteOuLeadId: string | undefined): EventoComunicacao[] {
  const eventos = useMockDb((s) => s.eventosComunicacao);
  const conversas = useMockDb((s) => s.conversas);
  const emailThreads = useMockDb((s) => s.emailThreads);

  return useMemo(() => {
    if (!clienteOuLeadId) return [];
    const doEventos = eventos.filter((e) => e.clienteOuLeadId === clienteOuLeadId);
    const conversa = conversas.find((c) => c.clienteId === clienteOuLeadId);
    const doWhatsapp: EventoComunicacao[] = (conversa?.mensagens ?? []).map((m) => ({
      id: m.id,
      clienteOuLeadId,
      canal: "whatsapp",
      direcao: m.autor === "cliente" ? "entrada" : "saida",
      autor: m.autor === "cliente" ? (conversa?.clienteNome ?? "Cliente") : m.autor,
      conteudo: m.texto,
      ocorridoEm: m.enviadoEm,
      origemId: m.id,
    }));
    // E04-S12 — mesma regra do WhatsApp: EmailThread guarda seu próprio storage; a timeline
    // funde na leitura, sem duplicar em eventosComunicacao.
    const doEmail: EventoComunicacao[] = emailThreads
      .filter((thread) => thread.clienteOuLeadId === clienteOuLeadId)
      .flatMap((thread) =>
        thread.mensagens.map((m) => ({
          id: m.id,
          clienteOuLeadId,
          canal: "email" as const,
          direcao: m.direcao === "entrada" ? ("entrada" as const) : ("saida" as const),
          autor: m.direcao === "entrada" ? (m.deNome ?? m.de) : m.de,
          conteudo: `${thread.assunto}\n\n${m.corpo}`,
          anexos: m.anexoNome ? [{ nome: m.anexoNome }] : undefined,
          ocorridoEm: m.recebidoEm,
          origemId: m.id,
        })),
      );
    return [...doEventos, ...doWhatsapp, ...doEmail].sort((a, b) =>
      a.ocorridoEm.localeCompare(b.ocorridoEm),
    );
  }, [eventos, conversas, emailThreads, clienteOuLeadId]);
}
