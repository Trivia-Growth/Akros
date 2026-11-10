import { useNotificacoesAdmin } from "@/features/comunicacao/application/useNotificacoesAdmin";
import { NotificationCenter } from "@/shared/ui";

/** E08-S06 — badge do sininho fora do modo demo: mensagem de cliente no chat do portal. */
export default function AdminRealNotifications() {
  const { itens, marcarVisto } = useNotificacoesAdmin();
  const notificacoes = itens.map((item) => ({
    id: item.clienteId,
    title: "Nova mensagem no chat",
    description: item.nomeCliente,
    href: `/admin/clientes?cliente=${item.clienteId}`,
    tone: "navy" as const,
  }));
  return <NotificationCenter items={notificacoes} label="Mensagens" onOpen={marcarVisto} />;
}
