import type { Conversa } from "@/features/comunicacao/domain/types";

export const conversas: Conversa[] = [
  {
    id: "conversa-carlos",
    clienteId: "cliente-carlos",
    clienteNome: "Carlos Mendes",
    canal: "whatsapp_oficial",
    atendidoPorIA: false,
    mensagens: [
      {
        id: "msg-c1",
        autor: "cliente",
        texto: "Oi, bom dia! Consegui juntar os documentos da formação acadêmica.",
        enviadoEm: "2026-08-04T09:12:00-03:00",
        lida: true,
      },
      {
        id: "msg-c2",
        autor: "humano",
        texto: "Bom dia, Carlos! Ótimo, pode enviar por e-mail ou pelo drive compartilhado.",
        enviadoEm: "2026-08-04T09:20:00-03:00",
        lida: true,
      },
      {
        id: "msg-c3",
        autor: "cliente",
        texto: "Perfeito, vou enviar ainda hoje. Obrigado!",
        enviadoEm: "2026-08-04T09:21:00-03:00",
        lida: true,
      },
    ],
  },
  {
    id: "conversa-renata",
    clienteId: "cliente-renata",
    clienteNome: "Renata Alves",
    canal: "evolution",
    atendidoPorIA: false,
    mensagens: [
      {
        id: "msg-r1",
        autor: "cliente",
        texto: "Vocês têm previsão de quando o Business Plan fica pronto?",
        enviadoEm: "2026-08-05T14:00:00-03:00",
        lida: false,
      },
    ],
  },
  {
    id: "conversa-lead-juliana",
    clienteId: "lead-001",
    clienteNome: "Juliana Prado",
    canal: "whatsapp_oficial",
    atendidoPorIA: true,
    mensagens: [
      {
        id: "msg-j1",
        autor: "cliente",
        texto: "Oi, vi o site de vocês. Quero saber sobre o EB-2 NIW.",
        enviadoEm: "2026-08-01T22:30:00-03:00",
        lida: true,
      },
      {
        id: "msg-j2",
        autor: "agente_ia",
        texto:
          "Olá, Juliana! Tudo bem? O EB-2 NIW é um Green Card para profissionais com habilidades excepcionais, sem precisar de oferta de emprego. Você tem mestrado ou doutorado?",
        enviadoEm: "2026-08-01T22:31:00-03:00",
        lida: true,
      },
      {
        id: "msg-j3",
        autor: "cliente",
        texto: "Tenho mestrado em Engenharia de Software e 8 anos de experiência.",
        enviadoEm: "2026-08-01T22:33:00-03:00",
        lida: true,
      },
      {
        id: "msg-j4",
        autor: "agente_ia",
        texto:
          "Ótimo perfil! Vou encaminhar seu contato para um de nossos especialistas fazer uma análise mais detalhada. Podemos agendar uma conversa?",
        enviadoEm: "2026-08-01T22:34:00-03:00",
        lida: true,
      },
    ],
  },
];
