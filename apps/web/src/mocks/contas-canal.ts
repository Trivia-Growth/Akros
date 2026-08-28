import type { ContaCanalConectada } from "@/features/configuracoes/domain/types";

export const contasCanal: ContaCanalConectada[] = [
  {
    id: "canal-whatsapp-atendimento",
    provedor: "whatsapp_oficial",
    nomeExibicao: "WhatsApp, Atendimento",
    identificador: "+1 (689) 322-4429",
    ativa: true,
    conectadoEm: "2026-08-05T14:30:00-03:00",
  },
  {
    id: "canal-whatsapp-comercial",
    provedor: "evolution",
    nomeExibicao: "WhatsApp, Comercial (Bruno)",
    identificador: "+55 11 98888-1234",
    ativa: true,
    conectadoEm: "2026-08-09T09:00:00-03:00",
  },
  {
    id: "canal-instagram-akros",
    provedor: "instagram",
    nomeExibicao: "Instagram, @akrosimmigration",
    identificador: "@akrosimmigration",
    ativa: true,
    conectadoEm: "2026-08-12T10:15:00-03:00",
  },
];
