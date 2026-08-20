import type { ContaAgendaConectada } from "@/features/configuracoes/domain/types";

export const contasAgenda: ContaAgendaConectada[] = [
  {
    id: "agenda-google-natalia",
    provedor: "google",
    nomeExibicao: "Natalia (fundadora) — Google Calendar",
    ativa: true,
    conectadoEm: "2026-08-10T09:00:00-03:00",
    credenciais: {
      provedor: "google",
      dados: {
        clientId: "839201738291-akros.apps.googleusercontent.com",
        clientSecretConfigurado: true,
        clientSecretFinal: "G7QK",
        refreshTokenConfigurado: true,
        refreshTokenFinal: "R2LM",
        calendarId: "natalia@akrosimmigration.com",
      },
    },
  },
  {
    id: "agenda-google-bruno",
    provedor: "google",
    nomeExibicao: "Bruno Luz — Google Calendar",
    ativa: true,
    conectadoEm: "2026-08-14T11:30:00-03:00",
    credenciais: {
      provedor: "google",
      dados: {
        clientId: "839201738291-akros.apps.googleusercontent.com",
        clientSecretConfigurado: true,
        clientSecretFinal: "G7QK",
        refreshTokenConfigurado: true,
        refreshTokenFinal: "B4TN",
        calendarId: "bruno@akrosimmigration.com",
      },
    },
  },
  {
    id: "agenda-calendly-atendimento",
    provedor: "calendly",
    nomeExibicao: "Calendly — Reunião de atendimento",
    ativa: true,
    conectadoEm: "2026-08-11T15:00:00-03:00",
    credenciais: {
      provedor: "calendly",
      dados: {
        personalAccessTokenConfigurado: true,
        personalAccessTokenFinal: "8KXP",
        organizationUri: "https://api.calendly.com/organizations/akros-immigration",
        eventTypeUri: "https://api.calendly.com/event_types/reuniao-de-atendimento",
      },
    },
  },
];
