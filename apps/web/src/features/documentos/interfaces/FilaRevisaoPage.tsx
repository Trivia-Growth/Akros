import { container } from "@/app/di";
import { useMockDb } from "@/mocks/store";
import { Badge, Button, Card, Modal, Textarea, toast } from "@/shared/ui";
import { AlertTriangle, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { requisitoDoDocumento, useCaminhoArquivoDrive } from "../application/hooks";
import type { Documento } from "../domain/types";

const ADERENCIA_VARIANT = {
  atende: "success",
  atende_com_ressalva: "gold",
  nao_atende: "danger",
  tipo_incorreto: "danger",
} as const;

function CaminhoArquivoLegenda({ documento }: { documento: Documento }) {
  const caminho = useCaminhoArquivoDrive(documento);
  if (!caminho) return null;
  return (
    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
      <FolderOpen className="h-3 w-3 shrink-0" aria-hidden />
      {caminho}
    </p>
  );
}

function horasEsperando(doc: Documento): number {
  if (!doc.enviadoEm) return 0;
  return Math.round((Date.now() - new Date(doc.enviadoEm).getTime()) / 3_600_000);
}

/** E07-S03 — fila priorizada por tempo de espera. Decisão humana é a única que muda status. */
export function FilaRevisaoPage() {
  const { t } = useTranslation("admin");
  const documentos = useMockDb((s) => s.documentos);
  const clientes = useMockDb((s) => s.clientes);
  const [selecionado, setSelecionado] = useState<Documento | null>(null);

  const fila = useMemo(
    () =>
      documentos
        .filter((d) => d.status === "em_analise")
        .sort((a, b) => horasEsperando(b) - horasEsperando(a)),
    [documentos],
  );

  const nomeCliente = (clienteId: string) =>
    clientes.find((c) => c.id === clienteId)?.nome ?? clienteId;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("docQueue.title")}</h1>
        <p className="text-sm text-ink-soft">{t("docQueue.subtitle")}</p>
      </div>

      {fila.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("docQueue.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {fila.map((doc) => {
            const requisito = requisitoDoDocumento(doc);
            return (
              <Card
                key={doc.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-navy">{doc.nome}</p>
                  <p className="text-xs text-ink-muted">
                    {nomeCliente(doc.clienteId)} · {requisito?.titulo ?? doc.tipo}
                  </p>
                  <CaminhoArquivoLegenda documento={doc} />
                </div>
                <div className="flex items-center gap-3">
                  {doc.enviadoApesarDoAlerta && (
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      {t("docQueue.sentAnyway")}
                    </Badge>
                  )}
                  {doc.analise && (
                    <Badge variant={ADERENCIA_VARIANT[doc.analise.aderencia]}>
                      {t(`documents.analysis.aderencia.${doc.analise.aderencia}`)}
                    </Badge>
                  )}
                  <span className="text-xs text-ink-muted">
                    {t("docQueue.waitingFor", { hours: horasEsperando(doc) })}
                  </span>
                  <Button size="sm" onClick={() => setSelecionado(doc)}>
                    {t("docQueue.review")}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selecionado && <RevisaoModal documento={selecionado} onClose={() => setSelecionado(null)} />}
    </div>
  );
}

function RevisaoModal({ documento, onClose }: { documento: Documento; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const requisito = requisitoDoDocumento(documento);
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function decidir(decisao: "aprovado" | "ajustes") {
    if (decisao === "ajustes" && !motivoAjuste.trim()) return;
    if (salvando) return;
    setSalvando(true);
    try {
      await container.documentos.decidir(
        documento.id,
        decisao,
        "Case manager",
        motivoAjuste.trim() || undefined,
      );
      toast.success(
        t(decisao === "aprovado" ? "docQueue.approved" : "docQueue.sentBackForChanges"),
      );
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={documento.nome} description={requisito?.objetivo}>
      <div className="flex flex-col gap-4">
        <CaminhoArquivoLegenda documento={documento} />
        {documento.analise ? (
          <div className="rounded-md border border-border bg-cream-100 p-3 text-sm">
            <p className="font-medium text-navy">
              {t(`documents.analysis.aderencia.${documento.analise.aderencia}`)} ·{" "}
              {t("documents.analysis.confidence", {
                value: Math.round(documento.analise.confianca * 100),
              })}
            </p>
            {documento.analise.lacunas.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-ink-soft">
                {documento.analise.lacunas.map((l) => (
                  <li key={l.id}>{l.descricao}</li>
                ))}
              </ul>
            )}
            {documento.analise.sugestoes.map((s) => (
              <p key={s} className="mt-2 text-ink-soft">
                {s}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t("docQueue.noAnalysis")}</p>
        )}

        <Textarea
          label={t("docQueue.adjustReasonLabel")}
          placeholder={t("docQueue.adjustReasonPlaceholder")}
          value={motivoAjuste}
          onChange={(e) => setMotivoAjuste(e.target.value)}
          rows={3}
        />

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => decidir("ajustes")}
            disabled={salvando || !motivoAjuste.trim()}
          >
            {t("docQueue.requestChanges")}
          </Button>
          <Button onClick={() => decidir("aprovado")} loading={salvando} disabled={salvando}>
            {t("docQueue.approve")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
