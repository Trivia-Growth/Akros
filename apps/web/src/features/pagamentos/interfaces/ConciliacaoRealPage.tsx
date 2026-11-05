import { useDownloadDocumento } from "@/features/documentos/application/useDownloadDocumento";
import { Badge, Button, Card, Input, Modal, Textarea } from "@/shared/ui";
import { CircleAlert, Download, Wallet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConciliacaoComandos } from "../application/useConciliacaoComandos";
import { usePagamentosAdminSupabase } from "../application/usePagamentosAdminSupabase";
import type { Pagamento } from "../domain/types";

function formatarValor(valor: number, moeda: "BRL" | "USD"): string {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

/** E03-S07 (Fase 7/US4) — conciliação real: confere comprovante recebido via OneDrive e decide
 *  (pago/divergente) contra `revisao-comandos`. Substitui `ConciliacaoPage` (mock) só na rota
 *  real — fila é só `em_conferencia` (`conciliar_pagamento` recusa qualquer outro status). */
export function ConciliacaoRealPage() {
  const { t } = useTranslation("admin");
  const { pagamentos, nomesClientes, carregando, erro, refetch } = usePagamentosAdminSupabase();
  const [selecionado, setSelecionado] = useState<Pagamento | null>(null);

  if (carregando) return <Estado mensagem="Carregando conciliação real…" />;
  if (erro) return <Estado mensagem="Não foi possível carregar a conciliação." erro />;

  const fila = pagamentos.filter((pagamento) => pagamento.status === "em_conferencia");

  return (
    <div className="flex flex-col gap-6" data-testid="conciliacao-real">
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
          {fila.map((pagamento) => (
            <Card key={pagamento.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy">
                  {nomesClientes[pagamento.clienteId] ?? pagamento.clienteId} ·{" "}
                  {pagamento.descricao}
                </p>
                <p className="text-xs text-ink-muted">
                  {formatarValor(pagamento.valor, pagamento.moeda)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="gold">{t("common:status.underConference")}</Badge>
                <Button size="sm" onClick={() => setSelecionado(pagamento)}>
                  {t("reconciliation.review")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selecionado && (
        <ConciliacaoModal
          pagamento={selecionado}
          onClose={() => setSelecionado(null)}
          onConciliado={() => {
            setSelecionado(null);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

function ConciliacaoModal({
  pagamento,
  onClose,
  onConciliado,
}: {
  pagamento: Pagamento;
  onClose: () => void;
  onConciliado: () => void;
}) {
  const { t } = useTranslation("admin");
  const { conciliar, processandoId, erro } = useConciliacaoComandos();
  const { baixar, baixando } = useDownloadDocumento();
  const [valorRecebido, setValorRecebido] = useState(String(pagamento.valor));
  const [motivo, setMotivo] = useState("");
  const [mostrarDivergencia, setMostrarDivergencia] = useState(false);

  const processando = processandoId === pagamento.id;
  const comprovanteVersaoId = pagamento.comprovanteVersaoId;

  async function confirmar() {
    const valor = Number(valorRecebido);
    if (Number.isNaN(valor) || processando) return;
    const ok = await conciliar({
      pagamentoId: pagamento.id,
      decisao: "pago",
      valorRecebido: valor,
      revisaoEsperada: pagamento.revisao ?? 1,
    });
    if (ok) onConciliado();
  }

  async function marcarDivergente() {
    const valor = Number(valorRecebido);
    if (Number.isNaN(valor) || processando || !motivo.trim()) return;
    const ok = await conciliar({
      pagamentoId: pagamento.id,
      decisao: "divergente",
      valorRecebido: valor,
      motivoDivergencia: motivo,
      revisaoEsperada: pagamento.revisao ?? 1,
    });
    if (ok) onConciliado();
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
        {comprovanteVersaoId && (
          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            onClick={() => void baixar(comprovanteVersaoId, `comprovante-${pagamento.id}.pdf`)}
            loading={baixando}
            disabled={baixando}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {t("reconciliation.viewReceipt")}
          </Button>
        )}
        {erro && <p className="text-xs text-red-700">Não foi possível concluir. Tente de novo.</p>}
        <Input
          label={t("reconciliation.receivedValueLabel")}
          type="number"
          value={valorRecebido}
          onChange={(e) => setValorRecebido(e.target.value)}
        />
        {mostrarDivergencia && (
          <Textarea
            label={t("reconciliation.divergenceReasonLabel")}
            placeholder={t("reconciliation.divergenceReasonPlaceholder")}
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-3">
          {mostrarDivergencia ? (
            <Button
              variant="secondary"
              onClick={() => void marcarDivergente()}
              loading={processando}
              disabled={processando || !motivo.trim()}
            >
              {t("reconciliation.markDivergent")}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setMostrarDivergencia(true)}>
              {t("reconciliation.markDivergent")}
            </Button>
          )}
          <Button onClick={() => void confirmar()} loading={processando} disabled={processando}>
            {t("reconciliation.confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Estado({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Conciliação</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? <CircleAlert className="h-4 w-4 text-red-600" /> : <Wallet className="h-4 w-4" />}
        {mensagem}
      </Card>
    </div>
  );
}
