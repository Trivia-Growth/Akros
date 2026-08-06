import { container } from "@/app/di";
import { useMockDb } from "@/mocks/store";
import { Badge, Button, Card, Input, Modal, toast } from "@/shared/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Pagamento } from "../domain/types";

function formatarValor(valor: number, moeda: "BRL" | "USD"): string {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

/** E10-S01 (lado admin) — conciliação manual: sem gateway, a equipe confere o comprovante. */
export function ConciliacaoPage() {
  const { t } = useTranslation("admin");
  const pagamentos = useMockDb((s) => s.pagamentos);
  const clientes = useMockDb((s) => s.clientes);
  const [selecionado, setSelecionado] = useState<Pagamento | null>(null);

  const nomeCliente = (clienteId: string) =>
    clientes.find((c) => c.id === clienteId)?.nome ?? clienteId;

  const fila = useMemo(
    () => pagamentos.filter((p) => p.status === "em_conferencia" || p.status === "divergente"),
    [pagamentos],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">
          {t("reconciliation.title")}
        </h1>
        <p className="text-sm text-ink-soft">{t("reconciliation.subtitle")}</p>
      </div>

      {fila.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("reconciliation.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {fila.map((p) => (
            <Card key={p.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy">
                  {nomeCliente(p.clienteId)} · {p.descricao}
                </p>
                <p className="text-xs text-ink-muted">{formatarValor(p.valor, p.moeda)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={p.status === "divergente" ? "danger" : "gold"}>
                  {t(
                    `common:status.${p.status === "divergente" ? "divergent" : "underConference"}`,
                  )}
                </Badge>
                <Button size="sm" onClick={() => setSelecionado(p)}>
                  {t("reconciliation.review")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selecionado && (
        <ConciliacaoModal pagamento={selecionado} onClose={() => setSelecionado(null)} />
      )}
    </div>
  );
}

function ConciliacaoModal({ pagamento, onClose }: { pagamento: Pagamento; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const [valorRecebido, setValorRecebido] = useState(String(pagamento.valor));
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    if (salvando) return;
    setSalvando(true);
    try {
      await container.pagamentos.confirmar(pagamento.id, "Financeiro Akros");
      toast.success(t("reconciliation.confirmed"));
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  async function marcarDivergente() {
    const valor = Number(valorRecebido);
    if (Number.isNaN(valor) || salvando) return;
    setSalvando(true);
    try {
      await container.pagamentos.marcarDivergencia(pagamento.id, valor, "Financeiro Akros");
      toast.success(t("reconciliation.divergenceRecorded"));
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={pagamento.descricao}
      description={t("reconciliation.modalDescription")}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          {t("reconciliation.expectedValue")}: {formatarValor(pagamento.valor, pagamento.moeda)}
        </p>
        <Input
          label={t("reconciliation.receivedValueLabel")}
          type="number"
          value={valorRecebido}
          onChange={(e) => setValorRecebido(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={marcarDivergente} disabled={salvando}>
            {t("reconciliation.markDivergent")}
          </Button>
          <Button onClick={confirmar} loading={salvando} disabled={salvando}>
            {t("reconciliation.confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
