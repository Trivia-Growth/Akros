import type { EmailThread } from "@/features/comunicacao/domain/types";

export const emailThreads: EmailThread[] = [
  {
    id: "email-thread-carlos",
    contaEmailId: "conta-google-bruno",
    clienteOuLeadId: "cliente-carlos",
    clienteNome: "Carlos Mendes",
    assunto: "Documentos acadêmicos: diploma e histórico",
    mensagens: [
      {
        id: "email-carlos-1",
        de: "carlos.mendes@example.com",
        deNome: "Carlos Mendes",
        corpo:
          "Bruno, boa tarde! Como combinamos no WhatsApp, segue em anexo o diploma e o histórico escolar digitalizados. Qualquer coisa me avisa.",
        recebidoEm: "2026-08-04T14:32:00-03:00",
        direcao: "entrada",
        lida: true,
        anexoNome: "diploma_carlos_mendes.pdf",
      },
      {
        id: "email-carlos-2",
        de: "bruno@akrosimmigration.com",
        deNome: "Bruno Luz",
        corpo:
          "Recebido, Carlos! Já conferi e está tudo legível. Vou anexar ao seu checklist e a equipe segue com a análise.",
        recebidoEm: "2026-08-04T15:05:00-03:00",
        direcao: "saida",
        lida: true,
      },
    ],
  },
  {
    id: "email-thread-renata",
    contaEmailId: "conta-google-natalia",
    clienteOuLeadId: "cliente-renata",
    clienteNome: "Renata Alves",
    assunto: "Dúvida sobre carta de recomendação",
    mensagens: [
      {
        id: "email-renata-1",
        de: "renata.alves@example.com",
        deNome: "Renata Alves",
        corpo:
          "Oi Natalia, minha ex-coordenadora topou escrever a carta de recomendação, mas perguntou se precisa ser em papel timbrado da universidade ou pode ser só assinada digitalmente. Pode me confirmar?",
        recebidoEm: "2026-08-15T10:18:00-03:00",
        direcao: "entrada",
        lida: true,
      },
    ],
  },
  {
    id: "email-thread-lead-eventbrite",
    contaEmailId: "conta-microsoft-recepcao",
    // Sem clienteOuLeadId — remetente ainda não casa com nenhum cliente/lead cadastrado
    // (mesma regra de "não vinculado" do E07-S01/E08-S01, agora aplicada a e-mail).
    assunto: "Interesse em consultoria para EB-2 NIW",
    mensagens: [
      {
        id: "email-lead-1",
        de: "marcos.pereira@exemplo.dev",
        deNome: "Marcos Pereira",
        corpo:
          "Olá, vi a Akros num evento de imigração em SP. Sou pesquisador em IA e queria entender se meu perfil se encaixa no EB-2 NIW. Podem me passar mais informações?",
        recebidoEm: "2026-08-20T08:47:00-03:00",
        direcao: "entrada",
        lida: false,
      },
    ],
  },
];
