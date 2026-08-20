import type { Reuniao, Transcricao } from "@/features/agenda/domain/types";

export const reunioes: Reuniao[] = [
  {
    id: "reuniao-carlos-kickoff",
    clienteId: "cliente-carlos",
    titulo: "Kick-off — Fase 1",
    inicio: "2026-06-05T15:00:00-03:00",
    fim: "2026-06-05T15:45:00-03:00",
    canal: "calendly",
    status: "realizada",
    transcricaoId: "transcricao-carlos-kickoff",
  },
  {
    id: "reuniao-carlos-proxima",
    clienteId: "cliente-carlos",
    titulo: "Reunião complementar — currículo",
    inicio: "2026-08-12T10:00:00-03:00",
    fim: "2026-08-12T10:30:00-03:00",
    canal: "calendly",
    status: "agendada",
  },
  {
    id: "reuniao-renata-checkpoint1",
    clienteId: "cliente-renata",
    titulo: "Checkpoint I — Fase 2",
    inicio: "2026-06-20T11:00:00-03:00",
    fim: "2026-06-20T11:40:00-03:00",
    canal: "gmail",
    status: "realizada",
    transcricaoId: "transcricao-renata-checkpoint1",
  },
  {
    id: "reuniao-bruno-status",
    clienteId: "cliente-bruno",
    titulo: "Atualização de status — pós-envio",
    inicio: "2026-07-01T09:00:00-03:00",
    fim: "2026-07-01T09:20:00-03:00",
    canal: "outlook",
    status: "realizada",
  },
  {
    id: "reuniao-camila-primeira-conversa",
    clienteId: "lead-agendamento-camila",
    titulo: "Primeira conversa — EB-1",
    inicio: "2026-08-27T15:30:00-03:00",
    fim: "2026-08-27T16:15:00-03:00",
    canal: "gmail",
    status: "agendada",
    criadaPor: "agente_ia",
  },
];

export const transcricoes: Transcricao[] = [
  {
    id: "transcricao-carlos-kickoff",
    reuniaoId: "reuniao-carlos-kickoff",
    texto:
      "Natalia: Bem-vindo, Carlos! Vamos começar pela Fase 1... Carlos: Perfeito, já tenho meu currículo atualizado. Natalia: Ótimo, vou te enviar o formulário de coleta de informações ainda hoje...",
    resumo:
      "Reunião de kick-off. Cliente já possui currículo atualizado. Combinado envio do formulário de coleta de informações e prazo de 10 dias úteis para o rascunho do currículo especializado.",
    actionItems: [
      "Enviar formulário de coleta de informações (Natalia)",
      "Preencher formulário em até 5 dias úteis (Carlos)",
      "Enviar diploma e histórico traduzidos (Carlos)",
    ],
    criadoEm: "2026-06-05T16:00:00-03:00",
    provedor: "fireflies",
  },
  {
    id: "transcricao-renata-checkpoint1",
    reuniaoId: "reuniao-renata-checkpoint1",
    texto:
      "Natalia: Renata, seu currículo foi aprovado. Agora vamos falar do Business Plan... Renata: Já tenho uma ideia do negócio que quero abrir em Orlando...",
    resumo:
      "Currículo aprovado. Iniciada discussão do Business Plan com foco em Orlando/FL. Cliente será apresentada ao Bruno (Scopimos) para elaboração do plano.",
    actionItems: [
      "Agendar reunião com Bruno (Scopimos)",
      "Renata enviar resumo da ideia de negócio por e-mail",
    ],
    criadoEm: "2026-06-20T12:00:00-03:00",
    provedor: "fireflies",
  },
];
