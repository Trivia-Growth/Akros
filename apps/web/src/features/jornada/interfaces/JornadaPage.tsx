import { useClienteAtivo } from "@/features/demo/application/hooks";
import {
  calcularProgresso,
  concluirEtapa,
  obterFaseAtual,
  useJornadaAtiva,
} from "@/features/jornada/application/hooks";
import { Badge, Button, Card, Progress, Stepper, type StepperItem, toast } from "@/shared/ui";
import { Lock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function JornadaPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const jornada = useJornadaAtiva();
  const faseAtual = obterFaseAtual(jornada);
  const [faseSelecionadaId, setFaseSelecionadaId] = useState<string | undefined>(faseAtual?.id);

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

  const handleConcluirEtapa = async (etapaId: string) => {
    await concluirEtapa(cliente.id, etapaId);
    toast.success(t("journey.completed"));
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("journey.title")}</h1>
        <p className="text-sm text-ink-soft">{t("journey.subtitle")}</p>
      </div>

      <Progress value={progresso} label={t("journey.overallProgress")} className="max-w-md" />

      <div className="overflow-x-auto rounded-lg border border-border bg-white p-6">
        <Stepper items={stepperItems} onSelect={setFaseSelecionadaId} />
      </div>

      {faseSelecionada && (
        <Card>
          <div className="mb-4 flex items-start justify-between gap-4">
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
                  className="flex flex-col gap-2 rounded-md border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">{etapa.titulo}</p>
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
                  <div className="shrink-0">
                    {etapa.status === "concluida" ? (
                      <Badge variant="success">{t("journey.completed")}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleConcluirEtapa(etapa.id)}
                      >
                        {t("journey.markComplete")}
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
