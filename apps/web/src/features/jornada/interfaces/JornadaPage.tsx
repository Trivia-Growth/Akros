import { useClienteAtivo } from "@/features/demo/application/hooks";
import {
  calcularProgresso,
  enviarEtapaParaAvaliacao,
  obterFaseAtual,
  useJornadaAtiva,
} from "@/features/jornada/application/hooks";
import { Badge, Button, Card, Progress, Stepper, type StepperItem, toast } from "@/shared/ui";
import { CheckCircle2, Clock, Lock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Etapa } from "../domain/types";

export function JornadaPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const jornada = useJornadaAtiva();
  const faseAtual = obterFaseAtual(jornada);
  const [faseSelecionadaId, setFaseSelecionadaId] = useState<string | undefined>(faseAtual?.id);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  if (!jornada || !cliente) {
    return <p className="text-ink-muted">Nenhuma jornada encontrada para esta persona.</p>;
  }

  const progresso = calcularProgresso(jornada);
  const stepperItems: StepperItem[] = jornada.fases.map((f) => ({
    id: f.id,
    title: f.titulo,
    status: f.status,
  }));

  const faseSelecionada =
    jornada.fases.find((f) => f.id === faseSelecionadaId) ?? faseAtual ?? jornada.fases[0];

  const handleEnviarEtapa = async (etapaId: string) => {
    if (enviandoId) return;
    setEnviandoId(etapaId);
    try {
      await enviarEtapaParaAvaliacao(cliente.id, etapaId);
      toast.success(t("journey.sentForReview"));
    } finally {
      setEnviandoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white shadow-elevated sm:p-8">
        <div
          aria-hidden
          className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gold/20 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-label text-gold">
            Sua jornada Akros
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            {t("journey.title")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65">{t("journey.subtitle")}</p>
        </div>
      </div>

      <Card className="border-gold-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
              {t("journey.overallProgress")}
            </p>
            <p className="mt-1 font-display text-2xl font-medium text-navy">
              {progresso}% concluído
            </p>
          </div>
          {faseAtual && <FaseStatusBadge status={faseAtual.status} />}
        </div>
        <Progress value={progresso} className="mt-4" />
      </Card>

      <div className="overflow-x-auto rounded-xl border border-border bg-white p-6 shadow-subtle">
        <Stepper items={stepperItems} onSelect={setFaseSelecionadaId} />
      </div>

      {faseSelecionada && (
        <Card className="border-border p-6 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-navy">
                {faseSelecionada.titulo}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{faseSelecionada.descricao}</p>
            </div>
            <FaseStatusBadge status={faseSelecionada.status} />
          </div>

          {faseSelecionada.status === "bloqueada" ? (
            <div className="flex items-center gap-3 rounded-md bg-cream-200 px-4 py-6 text-center text-sm text-ink-muted">
              <Lock className="mx-auto h-5 w-5" aria-hidden />
              <span className="mx-auto">{t("journey.locked")}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-label text-gold-700">
                {t("journey.stepsTitle")}
              </h3>
              {faseSelecionada.etapas.map((etapa) => (
                <div
                  key={etapa.id}
                  className="group flex flex-col gap-3 rounded-xl border border-border p-4 transition-all duration-200 hover:border-gold-300 hover:bg-gold-50/30 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        etapa.status === "concluida"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : etapa.status === "em_analise"
                            ? "border-navy-200 bg-navy-50 text-navy-700"
                            : "border-gold-300 bg-gold-50 text-gold-700"
                      }`}
                    >
                      {etapa.status === "concluida" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                      ) : etapa.status === "em_analise" ? (
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-navy">{etapa.titulo}</p>
                        {etapa.status === "pendente" && <ResponsavelBadge etapa={etapa} />}
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{etapa.descricao}</p>
                      {etapa.prazoMedioDiasUteis && (
                        <p className="mt-1 text-xs text-ink-muted">
                          {t("journey.deadline", { days: etapa.prazoMedioDiasUteis })}
                        </p>
                      )}
                      {etapa.documentosRequeridos && etapa.documentosRequeridos.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-ink-muted">
                            {t("journey.requiredDocs")}:
                          </p>
                          <ul className="mt-1 list-inside list-disc text-xs text-ink-soft">
                            {etapa.documentosRequeridos.map((doc) => (
                              <li key={doc}>{doc}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {etapa.status === "concluida" ? (
                      <Badge variant="success">{t("journey.completed")}</Badge>
                    ) : etapa.status === "em_analise" ? (
                      <Badge variant="navy">{t("journey.underReview")}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEnviarEtapa(etapa.id)}
                        loading={enviandoId === etapa.id}
                        disabled={enviandoId === etapa.id}
                      >
                        {t("journey.sendForReview")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {faseSelecionada.status === "concluida" && (
                <p className="mt-2 text-sm text-gold-700">{t("journey.phaseCompleted")}</p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/** E09-S01 AC-6 — responsável sempre por rótulo, nunca só por cor. */
function ResponsavelBadge({ etapa }: { etapa: Etapa }) {
  const { t } = useTranslation("portal");
  const map: Record<Etapa["responsavel"], "gold" | "navy" | "neutral"> = {
    cliente: "gold",
    akros: "navy",
    terceiro: "neutral",
    uscis: "neutral",
  };
  return (
    <Badge variant={map[etapa.responsavel]}>
      {t(`journey.responsible.${etapa.responsavel}`)}
      {etapa.responsavelDetalhe ? ` · ${etapa.responsavelDetalhe}` : ""}
    </Badge>
  );
}

function FaseStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "success" | "gold" | "navy" | "neutral"; label: string }> = {
    concluida: { variant: "success", label: "Concluída" },
    em_andamento: { variant: "gold", label: "Em andamento" },
    liberada: { variant: "navy", label: "Liberada" },
    bloqueada: { variant: "neutral", label: "Bloqueada" },
  };
  const info = map[status] ?? map.bloqueada;
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
