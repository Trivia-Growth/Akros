import { useMockDb } from "@/mocks/store";
import { useMemo } from "react";
import type { Conversa, EventoComunicacao } from "../domain/types";

export function useConversaCliente(clienteId: string | undefined): Conversa | undefined {
  return useMockDb((s) => s.conversas.find((c) => c.clienteId === clienteId));
}

export function useConversas(): Conversa[] {
  return useMockDb((s) => s.conversas);
}

/**
 * Timeline unificada (E08-S01). Funde eventosComunicacao com as mensagens da Conversa de
 * WhatsApp (E04-S01) do mesmo cliente/lead, num só fluxo cronológico. A Conversa continua
 * armazenada à parte — a unificação acontece só na leitura, ver domain/types.ts.
 */
export function useTimeline(clienteOuLeadId: string | undefined): EventoComunicacao[] {
  const eventos = useMockDb((s) => s.eventosComunicacao);
  const conversas = useMockDb((s) => s.conversas);

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
    return [...doEventos, ...doWhatsapp].sort((a, b) => a.ocorridoEm.localeCompare(b.ocorridoEm));
  }, [eventos, conversas, clienteOuLeadId]);
}
