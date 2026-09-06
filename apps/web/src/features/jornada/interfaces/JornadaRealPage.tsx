import { Badge, Card, Progress, Stepper, type StepperItem } from "@/shared/ui";
import { CalendarClock, CheckCircle2, CircleAlert, Clock, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { calcularProgresso, obterFaseAtual } from "../application/calculos";
import { useJornadaClienteReal } from "../application/real-hooks";
import type { Etapa } from "../domain/types";

export function JornadaRealPage() {
  const { t } = useTranslation("portal");
  const { jornada, carregando, erro } = useJornadaClienteReal();
  const [faseSelecionadaId, setFaseSelecionadaId] = useState<string>();

  if (carregando) return <EstadoJornada mensagem="Carregando jornada real…" />;
  if (erro) return <EstadoJornada mensagem="Não foi possível carregar a jornada." erro />;
  if (!jornada) return <EstadoJornada mensagem="Nenhuma jornada real registrada ainda." />;

  const faseAtual = obterFaseAtual(jornada);
  const progresso = calcularProgresso(jornada);
  const stepperItems: StepperItem[] = jornada.fases.map((fase) => ({
    id: fase.id,
    title: fase.titulo,
    status: fase.status,
  }));
  const faseSelecionada =
    jornada.fases.find((fase) => fase.id === faseSelecionadaId) ?? faseAtual ?? jornada.fases[0];

  return (
    <div className="flex flex-col gap-8" data-testid="jornada-real">
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

      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
        <p>
          Envio para análise permanece indisponível até existir um fluxo seguro de arquivo e RPC de
          transição. Esta tela não grava status diretamente no navegador.
        </p>
      </Card>

      {jornada.fases.length === 0 ? (
        <Card className="text-sm text-ink-muted">Nenhuma fase real cadastrada ainda.</Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-white p-6 shadow-subtle">
            <Stepper items={stepperItems} onSelect={setFaseSelecionadaId} />
          </div>

          {faseSelecionada && (
            <Card className="border-border p-6 sm:p-7" data-testid="jornada-fase-real">
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
              ) : faseSelecionada.etapas.length === 0 ? (
                <p className="text-sm text-ink-muted">Nenhuma etapa real cadastrada nesta fase.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-label text-gold-700">
                    {t("journey.stepsTitle")}
                  </h3>
                  {faseSelecionada.etapas.map((etapa) => (
                    <EtapaCard key={etapa.id} etapa={etapa} />
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function EtapaCard({ etapa }: { etapa: Etapa }) {
  const { t } = useTranslation("portal");
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between">
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
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
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
            <ul className="mt-2 list-inside list-disc text-xs text-ink-soft">
              {etapa.documentosRequeridos.map((documento) => (
                <li key={documento}>{documento}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Badge
        variant={
          etapa.status === "concluida" ? "success" : etapa.status === "em_analise" ? "navy" : "gold"
        }
      >
        {etapa.status === "concluida"
          ? t("journey.completed")
          : etapa.status === "em_analise"
            ? t("journey.underReview")
            : "Pendente"}
      </Badge>
    </div>
  );
}

function ResponsavelBadge({ etapa }: { etapa: Etapa }) {
  const { t } = useTranslation("portal");
  const variantes: Record<Etapa["responsavel"], "gold" | "navy" | "neutral"> = {
    cliente: "gold",
    akros: "navy",
    terceiro: "neutral",
    uscis: "neutral",
  };
  return (
    <Badge variant={variantes[etapa.responsavel]}>
      {t(`journey.responsible.${etapa.responsavel}`)}
      {etapa.responsavelDetalhe ? ` · ${etapa.responsavelDetalhe}` : ""}
    </Badge>
  );
}

function FaseStatusBadge({ status }: { status: string }) {
  const informacao: Record<
    string,
    { variant: "success" | "gold" | "navy" | "neutral"; label: string }
  > = {
    concluida: { variant: "success", label: "Concluída" },
    em_andamento: { variant: "gold", label: "Em andamento" },
    liberada: { variant: "navy", label: "Liberada" },
    bloqueada: { variant: "neutral", label: "Bloqueada" },
  };
  const atual = informacao[status] ?? informacao.bloqueada;
  return <Badge variant={atual.variant}>{atual.label}</Badge>;
}

function EstadoJornada({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">Jornada</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? (
          <CircleAlert className="h-4 w-4 text-red-600" />
        ) : (
          <CalendarClock className="h-4 w-4" />
        )}
        {mensagem}
      </Card>
    </div>
  );
}
