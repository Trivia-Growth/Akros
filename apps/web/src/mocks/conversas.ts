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
      {
        id: "msg-c4",
        autor: "cliente",
        texto: "",
        tipo: "imagem",
        midiaNome: "foto_diploma.jpg",
        enviadoEm: "2026-08-04T09:24:00-03:00",
        lida: true,
      },
      {
        id: "msg-c5",
        autor: "humano",
        texto: "",
        tipo: "audio",
        midiaNome: "audio_carlos_c5.m4a",
        duracaoSegundos: 34,
        enviadoEm: "2026-08-04T09:26:00-03:00",
        lida: true,
        metadadosFixture: {
          transcricaoSimulada:
            "Carlos, recebi a foto, mas pra petição a gente precisa do PDF do diploma escaneado em boa resolução, não foto de celular. Pode escanear ou pedir uma via digital pra secretaria da faculdade? Assim que tiver, é só mandar por aqui ou pelo e-mail mesmo.",
        },
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
    custoIA: 0.032,
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
  {
    id: "conversa-lead-instagram",
    clienteId: "lead-instagram-marcos",
    clienteNome: "Marcos Vieira",
    canal: "instagram",
    atendidoPorIA: true,
    mensagens: [
      {
        id: "msg-ig1",
        autor: "cliente",
        texto:
          "Vi o story de vocês sobre o EB-2 NIW. Sou pesquisador na área de biotecnologia, dá pra aplicar?",
        enviadoEm: "2026-08-12T18:05:00-03:00",
        lida: true,
      },
      {
        id: "msg-ig2",
        autor: "agente_ia",
        texto:
          "Olá, Marcos! Bacana, biotecnologia é uma área com bom histórico de aprovação no EB-2 NIW. Você tem publicações ou reconhecimento na área?",
        enviadoEm: "2026-08-12T18:06:00-03:00",
        lida: true,
      },
      {
        id: "msg-ig3",
        autor: "cliente",
        texto: "Tenho 6 artigos publicados e já fui citado em pesquisas internacionais.",
        enviadoEm: "2026-08-12T18:09:00-03:00",
        lida: false,
      },
    ],
  },
  {
    id: "conversa-agendamento-camila",
    clienteId: "lead-agendamento-camila",
    clienteNome: "Camila Duarte",
    canal: "whatsapp_oficial",
    atendidoPorIA: true,
    mensagens: [
      {
        id: "msg-ag1",
        autor: "cliente",
        texto:
          "Oi! Gostaria de marcar uma conversa com vocês pra entender melhor o processo do EB-1.",
        enviadoEm: "2026-08-18T10:02:00-03:00",
        lida: true,
      },
      {
        id: "msg-ag2",
        autor: "agente_ia",
        texto:
          "Claro, Camila. Vou ajudar você a encontrar um horário. Qual dia da semana e período você prefere: manhã ou tarde?",
        enviadoEm: "2026-08-18T10:03:00-03:00",
        lida: true,
      },
      {
        id: "msg-ag3",
        autor: "cliente",
        texto: "Prefiro terça ou quinta, de preferência à tarde.",
        enviadoEm: "2026-08-18T10:05:00-03:00",
        lida: true,
      },
      {
        id: "msg-ag4",
        autor: "agente_ia",
        texto:
          "Deixa eu consultar a agenda... Tenho terça (25/08) às 14h ou quinta (27/08) às 15h30, ambos com a Natalia. Qual funciona melhor pra você?",
        enviadoEm: "2026-08-18T10:06:00-03:00",
        lida: true,
      },
      {
        id: "msg-ag5",
        autor: "cliente",
        texto: "Quinta às 15h30 é perfeito!",
        enviadoEm: "2026-08-18T10:07:00-03:00",
        lida: true,
      },
      {
        id: "msg-ag6",
        autor: "agente_ia",
        texto:
          "Combinado! Marquei sua reunião para quinta-feira, 27/08, às 15h30, com a Natalia, direto no Google Calendar dela. Você vai receber o convite por e-mail. Alguma dúvida antes disso?",
        enviadoEm: "2026-08-18T10:07:30-03:00",
        lida: true,
      },
    ],
  },
];
