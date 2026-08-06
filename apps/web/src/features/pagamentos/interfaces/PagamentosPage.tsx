import { container } from "@/app/di";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { usePagamentosCliente } from "@/features/pagamentos/application/hooks";
import { Badge, Button, Card, Modal, toast } from "@/shared/ui";
import { Copy, Upload, Wallet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Pagamento } from "../domain/types";

const STATUS_VARIANT = {
  pendente: "gold",
  em_conferencia: "navy",
  pago: "success",
  divergente: "danger",
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
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null);

  const totalPago = pagamentos.filter((p) => p.status === "pago").length;
  const totalPendente = pagamentos.filter((p) => p.status === "pendente").length;
  const proximoVencimento = pagamentos
    .filter((p) => p.status === "pendente")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("payments.title")}</h1>
        <p className="text-sm text-ink-soft">{t("payments.subtitle")}</p>
        <p className="mt-2 text-xs italic text-ink-muted">{t("payments.transferNote")}</p>
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
                  {t(`common:status.${statusI18nKey(p.status)}`)}
                </Badge>
                {p.status === "pendente" && (
                  <Button size="sm" variant="secondary" onClick={() => setPagamentoSelecionado(p)}>
                    {t("payments.viewTransferData")}
                  </Button>
                )}
                {p.status === "divergente" && (
                  <span className="text-xs text-red-600">
                    {t("payments.divergenceNotice", {
                      expected: formatarValor(p.valor, p.moeda),
                      received: formatarValor(p.valorRecebido ?? 0, p.moeda),
                    })}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {pagamentoSelecionado && (
        <TransferenciaModal
          pagamento={pagamentoSelecionado}
          onClose={() => setPagamentoSelecionado(null)}
        />
      )}
    </div>
  );
}

function TransferenciaModal({
  pagamento,
  onClose,
}: {
  pagamento: Pagamento;
  onClose: () => void;
}) {
  const { t } = useTranslation("portal");
  const dados = container.pagamentos.dadosRecebimento(pagamento.moeda);
  const [anexando, setAnexando] = useState(false);

  async function copiar(valor: string | undefined) {
    if (!valor) return;
    await navigator.clipboard?.writeText(valor).catch(() => undefined);
    toast.success(t("payments.copied"));
  }

  async function handleAnexar() {
    if (anexando) return;
    setAnexando(true);
    try {
      await container.pagamentos.anexarComprovante(
        pagamento.id,
        `/mock-files/comprovante-${pagamento.id}.pdf`,
      );
      toast.success(t("payments.receiptAttached"));
      onClose();
    } finally {
      setAnexando(false);
    }
  }

  const campos: [string, string | undefined][] = [
    [t("payments.fields.holder"), dados.titular],
    [t("payments.fields.bank"), dados.banco],
    [t("payments.fields.agency"), dados.agencia],
    [t("payments.fields.account"), dados.conta],
    [t("payments.fields.pixKey"), dados.chavePix],
    [t("payments.fields.routingNumber"), dados.routingNumber],
    [t("payments.fields.accountNumber"), dados.accountNumber],
    [t("payments.fields.swift"), dados.swift],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={t("payments.transferDataTitle")}
      description={pagamento.descricao}
    >
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2 rounded-md border border-border p-3">
          {campos
            .filter(([, valor]) => valor)
            .map(([label, valor]) => (
              <li key={label} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">{label}</span>
                <span className="flex items-center gap-2 font-medium text-navy">
                  {valor}
                  <button
                    type="button"
                    onClick={() => copiar(valor)}
                    aria-label={t("payments.copy")}
                    className="text-ink-muted hover:text-gold-700"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              </li>
            ))}
        </ul>
        <p className="text-xs text-ink-muted">{dados.instrucoes}</p>
        <p className="text-xs font-medium text-navy">
          {t("payments.paymentId")}: {pagamento.id}
        </p>
        <Button onClick={handleAnexar} loading={anexando} disabled={anexando}>
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {t("payments.attachReceipt")}
        </Button>
      </div>
    </Modal>
  );
}

function statusI18nKey(status: Pagamento["status"]): string {
  const map: Record<Pagamento["status"], string> = {
    pendente: "pending",
    em_conferencia: "underConference",
    pago: "paid",
    divergente: "divergent",
    atrasado: "overdue",
  };
  return map[status];
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{value}</p>
    </Card>
  );
}
