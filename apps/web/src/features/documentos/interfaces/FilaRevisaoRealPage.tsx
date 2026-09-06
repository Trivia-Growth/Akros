import { Badge, Card } from "@/shared/ui";
import { AlertTriangle, CircleAlert, FileSearch, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDocumentosAdminSupabase } from "../application/useDocumentosAdminSupabase";
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
  const { documentos, nomesClientes, carregando, erro } = useDocumentosAdminSupabase();
  if (carregando) return <Estado mensagem="Carregando fila real…" />;
  if (erro) return <Estado mensagem="Não foi possível carregar a fila." erro />;
  const fila = documentos
    .filter((documento) => documento.status === "em_analise")
    .sort((a, b) => horasEsperando(b) - horasEsperando(a));
  return (
    <div className="flex flex-col gap-6" data-testid="fila-revisao-real">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("docQueue.title")}</h1>
        <p className="text-sm text-ink-soft">{t("docQueue.subtitle")}</p>
      </div>
      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
        <p>
          Aprovar ou devolver segue bloqueado até RPC que aplique transição e auditoria. Esta tela
          não grava status no navegador.
        </p>
      </Card>
      {fila.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("docQueue.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {fila.map((documento) => (
            <Card
              key={documento.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
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
