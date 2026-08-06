import { container } from "@/app/di";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { usePagamentosCliente } from "@/features/pagamentos/application/hooks";
import { Badge, Button, Card, toast } from "@/shared/ui";
import { Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

const STATUS_VARIANT = {
  pendente: "gold",
  pago: "success",
  atrasado: "danger",
} as const;

function formatarValor(valor: number, moeda: "BRL" | "USD"): string {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

export function PagamentosPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const pagamentos = usePagamentosCliente(cliente?.id);

  const totalPago = pagamentos.filter((p) => p.status === "pago").length;
  const totalPendente = pagamentos.filter((p) => p.status !== "pago").length;
  const proximoVencimento = pagamentos
    .filter((p) => p.status !== "pago")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];

  async function handlePagar(id: string) {
    await container.pagamentos.marcarComoPago(id);
    toast.success(t("payments.paid", { data: new Date().toLocaleDateString("pt-BR") }));
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("payments.title")}</h1>
        <p className="text-sm text-ink-soft">{t("payments.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label={t("payments.totalPaid")} value={String(totalPago)} />
        <SummaryCard label={t("payments.totalPending")} value={String(totalPendente)} />
        <SummaryCard
          label={t("payments.nextDue")}
          value={
            proximoVencimento
              ? new Date(proximoVencimento.vencimento).toLocaleDateString("pt-BR")
              : "—"
          }
        />
      </div>

      {pagamentos.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("payments.noPayments")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pagamentos.map((p) => (
            <Card
              key={p.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy">
                  <Wallet className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy">{p.descricao}</p>
                  <p className="text-xs text-ink-muted">
                    {formatarValor(p.valor, p.moeda)} · vencimento{" "}
                    {new Date(p.vencimento).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[p.status]}>
                  {t(
                    `common:status.${p.status === "atrasado" ? "overdue" : p.status === "pago" ? "paid" : "pending"}`,
                  )}
                </Badge>
                {p.status !== "pago" && (
                  <Button size="sm" variant="secondary" onClick={() => handlePagar(p.id)}>
                    {t("payments.payNow")}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{value}</p>
    </Card>
  );
}
