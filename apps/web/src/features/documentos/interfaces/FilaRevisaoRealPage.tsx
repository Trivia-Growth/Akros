import { Badge, Button, Card, Textarea } from "@/shared/ui";
import { AlertTriangle, CircleAlert, FileSearch } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDocumentosAdminSupabase } from "../application/useDocumentosAdminSupabase";
import { useRevisaoComandos } from "../application/useRevisaoComandos";
import type { Documento } from "../domain/types";

const ADERENCIA_VARIANT = {
  atende: "success",
  atende_com_ressalva: "gold",
  nao_atende: "danger",
  tipo_incorreto: "danger",
} as const;
function horasEsperando(documento: Documento) {
  return documento.enviadoEm
    ? Math.max(0, Math.round((Date.now() - new Date(documento.enviadoEm).getTime()) / 3_600_000))
    : 0;
}

export function FilaRevisaoRealPage() {
  const { t } = useTranslation("admin");
  const { documentos, nomesClientes, carregando, erro, refetch } = useDocumentosAdminSupabase();
  const { revisar, processandoId, erro: erroRevisao } = useRevisaoComandos();
  const [devolvendoId, setDevolvendoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  if (carregando) return <Estado mensagem="Carregando fila real…" />;
  if (erro) return <Estado mensagem="Não foi possível carregar a fila." erro />;
  const fila = documentos
    .filter((documento) => documento.status === "em_analise")
    .sort((a, b) => horasEsperando(b) - horasEsperando(a));

  async function aprovar(documento: Documento) {
    const ok = await revisar({
      documentoId: documento.id,
      revisaoEsperada: documento.revisao ?? 1,
      decisao: "aprovado",
    });
    if (ok) void refetch();
  }

  async function devolver(documento: Documento) {
    if (!motivo.trim()) return;
    const ok = await revisar({
      documentoId: documento.id,
      revisaoEsperada: documento.revisao ?? 1,
      decisao: "ajustes",
      justificativa: motivo,
    });
    if (ok) {
      setDevolvendoId(null);
      setMotivo("");
      void refetch();
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="fila-revisao-real">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("docQueue.title")}</h1>
        <p className="text-sm text-ink-soft">{t("docQueue.subtitle")}</p>
      </div>
      {erroRevisao && (
        <Card className="border-red-200 bg-red-50/60 text-sm text-red-700">
          Não foi possível concluir a decisão. Recarregue a fila e tente de novo.
        </Card>
      )}
      {fila.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("docQueue.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {fila.map((documento) => (
            <Card key={documento.id} className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-navy">{documento.nome}</p>
                  <p className="text-xs text-ink-muted">
                    {nomesClientes[documento.clienteId] ?? documento.clienteId} · {documento.tipo}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {documento.enviadoApesarDoAlerta && (
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {t("docQueue.sentAnyway")}
                    </Badge>
                  )}
                  {documento.analise && (
                    <Badge variant={ADERENCIA_VARIANT[documento.analise.aderencia]}>
                      {t(`documents.analysis.aderencia.${documento.analise.aderencia}`)}
                    </Badge>
                  )}
                  <span className="text-xs text-ink-muted">
                    {t("docQueue.waitingFor", { hours: horasEsperando(documento) })}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button
                  size="sm"
                  variant="gold"
                  onClick={() => void aprovar(documento)}
                  loading={processandoId === documento.id}
                  disabled={processandoId === documento.id}
                >
                  {t("docQueue.approve")}
                </Button>
                {devolvendoId === documento.id ? (
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start">
                    <Textarea
                      placeholder={t("docQueue.adjustReasonPlaceholder")}
                      rows={2}
                      value={motivo}
                      onChange={(evento) => setMotivo(evento.target.value)}
                      className="sm:flex-1"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void devolver(documento)}
                      loading={processandoId === documento.id}
                      disabled={processandoId === documento.id || !motivo.trim()}
                    >
                      {t("docQueue.confirmReturn")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDevolvendoId(documento.id);
                      setMotivo("");
                    }}
                    disabled={processandoId === documento.id}
                  >
                    {t("docQueue.requestChanges")}
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
function Estado({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <Card className="flex items-center gap-3 text-sm text-ink-soft">
      {erro ? <CircleAlert className="h-4 w-4 text-red-600" /> : <FileSearch className="h-4 w-4" />}
      {mensagem}
    </Card>
  );
}
