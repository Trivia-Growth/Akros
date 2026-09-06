import { useMockDb } from "@/mocks/store";
import { NotificationCenter } from "@/shared/ui";

/** Chunk exclusivo da demo: não entra em sessão Supabase real. */
export default function AdminDemoNotifications() {
  const leads = useMockDb((state) => state.leads);
  const documentos = useMockDb((state) => state.documentos);
  const pagamentos = useMockDb((state) => state.pagamentos);
  const notificacoes = [
    ...leads
      .filter((lead) => lead.gateAgendamento?.status === "pendente")
      .slice(0, 2)
      .map((lead) => ({
        id: `gate-${lead.id}`,
        title: "Aprovação de agenda pendente",
        description: lead.nome,
        href: "/admin/aprovacoes",
        tone: "gold" as const,
      })),
    ...documentos
      .filter((documento) => documento.status === "em_analise")
      .slice(0, 2)
      .map((documento) => ({
        id: `revisao-${documento.id}`,
        title: "Documento aguardando revisão",
        description: documento.nome,
        href: "/admin/documentos",
        tone: "navy" as const,
      })),
    ...pagamentos
      .filter((pagamento) =>
        ["em_conferencia", "divergente", "atrasado"].includes(pagamento.status),
      )
      .slice(0, 1)
      .map((pagamento) => ({
        id: `financeiro-${pagamento.id}`,
        title:
          pagamento.status === "divergente" ? "Pagamento com divergência" : "Conciliação pendente",
        description: pagamento.descricao,
        href: "/admin/pagamentos",
        tone: pagamento.status === "divergente" ? ("danger" as const) : ("gold" as const),
      })),
  ];
  return <NotificationCenter items={notificacoes} label="Fila de atenção" />;
}
