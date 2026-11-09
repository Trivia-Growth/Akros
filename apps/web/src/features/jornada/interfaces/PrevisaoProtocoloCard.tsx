import { Card } from "@/shared/ui";
import { CalendarCheck2, CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePrevisaoProtocolo } from "../application/usePrevisaoProtocolo";

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** E03-S07 (Fase 9/US7) — progresso + estimativa de protocolo, contra as RPCs reais. Usado no
 *  portal (JornadaRealPage e DashboardRealPage). */
export function PrevisaoProtocoloCard() {
  const { t } = useTranslation("portal");
  const { progresso, previsao, carregando, erro } = usePrevisaoProtocolo();

  if (carregando || erro || !progresso || !previsao) {
    return (
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro && <CircleAlert className="h-4 w-4 text-red-600" />}
        {erro ? "Não foi possível carregar a previsão." : "Carregando previsão…"}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
        {t("progress.title")}
      </p>

      {progresso.criterio === "cadastro_incompleto" ? (
        <p className="text-sm text-ink-soft">{t("progress.incomplete")}</p>
      ) : progresso.criterio === "sem_dado" ? (
        <p className="text-sm text-ink-soft">{t("progress.noData")}</p>
      ) : (
        <div>
          <p className="font-display text-2xl font-medium text-navy">
            {progresso.percentual ?? 0}%
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {progresso.criterio === "documentos"
              ? t("progress.requisitosConcluidos", {
                  concluidos: progresso.requisitosConcluidos,
                  total: progresso.requisitosTotal,
                })
              : t("progress.etapasConcluidas", {
                  concluidas: progresso.etapasConcluidas,
                  total: progresso.etapasTotal,
                })}
          </p>
        </div>
      )}

      <div className="border-t border-border pt-3">
        <div className="flex items-start gap-2.5">
          <CalendarCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-label text-ink-muted">
              {t("progress.estimateLabel")}
            </p>
            <p className="mt-1 text-sm font-medium text-navy">
              {previsao.dataEstimada
                ? formatarData(previsao.dataEstimada)
                : previsao.motivoSemPrevisao
                  ? t(`progress.noForecastReason.${previsao.motivoSemPrevisao}`)
                  : t("progress.noData")}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-muted">{t("progress.estimateDisclaimer")}</p>
      </div>
    </Card>
  );
}
