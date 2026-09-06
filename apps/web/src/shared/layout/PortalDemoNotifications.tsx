import { useClienteAtivo } from "@/features/demo/application/hooks";
import { useMockDb } from "@/mocks/store";
import { NotificationCenter } from "@/shared/ui";

/** Chunk exclusivo da demo: estado da persona e store nunca entram no portal real. */
export default function PortalDemoNotifications() {
  const documentos = useMockDb((state) => state.documentos);
  const pagamentos = useMockDb((state) => state.pagamentos);
  const reunioes = useMockDb((state) => state.reunioes);
  const eventos = useMockDb((state) => state.eventosComunicacao);
  const clienteAtivo = useClienteAtivo();
  const notificacoes = clienteAtivo
    ? [
        ...documentos
          .filter(
            (documento) =>
              documento.clienteId === clienteAtivo.id &&
              ["pendente", "ajustes"].includes(documento.status),
          )
          .slice(0, 2)
          .map((documento) => ({
            id: `documento-${documento.id}`,
            title:
              documento.status === "ajustes"
                ? "Documento precisa de ajuste"
                : "Documento aguardando envio",
            description: documento.nome,
            href: "/portal/documentos",
            tone: documento.status === "ajustes" ? ("danger" as const) : ("gold" as const),
          })),
        ...pagamentos
          .filter(
            (pagamento) => pagamento.clienteId === clienteAtivo.id && pagamento.status !== "pago",
          )
          .slice(0, 1)
          .map((pagamento) => ({
            id: `pagamento-${pagamento.id}`,
            title: pagamento.status === "atrasado" ? "Pagamento em atraso" : "Pagamento pendente",
            description: pagamento.descricao,
            href: "/portal/pagamentos",
            tone: pagamento.status === "atrasado" ? ("danger" as const) : ("gold" as const),
          })),
        ...reunioes
          .filter(
            (reuniao) => reuniao.clienteId === clienteAtivo.id && reuniao.status === "agendada",
          )
          .slice(0, 1)
          .map((reuniao) => ({
            id: `reuniao-${reuniao.id}`,
            title: "Próxima reunião agendada",
            description: new Date(reuniao.inicio).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            }),
            href: "/portal/agenda",
            tone: "navy" as const,
          })),
        ...eventos
          .filter(
            (evento) =>
              evento.clienteOuLeadId === clienteAtivo.id &&
              evento.canal === "sistema" &&
              evento.conteudo.includes("liberada"),
          )
          .slice(-1)
          .map((evento) => ({
            id: `jornada-${evento.id}`,
            title: "Nova fase liberada",
            description: "Sua jornada avançou. Veja as novas orientações e atividades.",
            href: "/portal/jornada",
            tone: "gold" as const,
          })),
        ...eventos
          .filter(
            (evento) =>
              evento.clienteOuLeadId === clienteAtivo.id &&
              evento.canal === "sistema" &&
              evento.conteudo.includes("aprovada"),
          )
          .slice(-2)
          .map((evento) => ({
            id: `etapa-aprovada-${evento.id}`,
            title: "Etapa aprovada pela Akros",
            description: evento.conteudo,
            href: "/portal/jornada",
            tone: "gold" as const,
          })),
        ...eventos
          .filter(
            (evento) =>
              evento.clienteOuLeadId === clienteAtivo.id &&
              evento.canal === "sistema" &&
              evento.conteudo.includes("devolvida para ajustes"),
          )
          .slice(-2)
          .map((evento) => ({
            id: `etapa-ajuste-${evento.id}`,
            title: "Etapa devolvida para ajustes",
            description: evento.conteudo,
            href: "/portal/jornada",
            tone: "danger" as const,
          })),
      ]
    : [];
  return <NotificationCenter items={notificacoes} />;
}
