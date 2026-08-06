import type { RegraAtendimentoIA } from "@/features/comunicacao/domain/types";

export const regraAtendimentoIA: RegraAtendimentoIA = {
  ativo: true,
  nomeAgente: "Ana (Assistente Akros)",
  saudacao:
    "Olá! Sou a assistente virtual da Akros Immigration Solutions. Como posso ajudar você hoje?",
  janelasAtendimento: [{ inicio: "19:00", fim: "08:00" }],
  topicos: [
    {
      pergunta: "quanto custa",
      resposta:
        "Os valores variam conforme o tipo de visto e complexidade do caso. Posso agendar uma conversa com um de nossos especialistas para uma análise personalizada?",
    },
    {
      pergunta: "eb-2 niw",
      resposta:
        "O EB-2 NIW é um Green Card para profissionais com habilidades excepcionais, sem necessidade de oferta de emprego. Você tem mestrado, doutorado ou vasta experiência na sua área?",
    },
    {
      pergunta: "quanto tempo demora",
      resposta:
        "O prazo varia conforme o caso, mas em média o processo completo (da coleta de documentos até o envio à USCIS) leva de 6 a 10 meses. Após o envio, a análise da USCIS pode levar de 8 a 14 meses adicionais.",
    },
  ],
  mensagemHandoff:
    "Essa é uma pergunta mais específica do seu caso — vou encaminhar para um de nossos especialistas humanos te responder em breve.",
};
