import { useReunioesCliente } from "@/features/agenda/application/hooks";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { useDocumentosCliente } from "@/features/documentos/application/hooks";
import {
  calcularProgresso,
  obterFaseAtual,
  useEtapasPorResponsavel,
  useJornadaAtiva,
  usePrevisao,
} from "@/features/jornada/application/hooks";
import { usePagamentosCliente } from "@/features/pagamentos/application/hooks";
import { Badge, Card, Progress, Stepper, type StepperItem } from "@/shared/ui";
import { ArrowUpRight, CalendarDays, FileText, Gauge, Map as MapIcon, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const jornada = useJornadaAtiva();
  const documentos = useDocumentosCliente(cliente?.id);
  const pagamentos = usePagamentosCliente(cliente?.id);
  const reunioes = useReunioesCliente(cliente?.id);

  if (!cliente || !jornada) {
    return <p className="text-ink-muted">Nenhum cliente ativo selecionado.</p>;
  }

  const progresso = calcularProgresso(jornada);
  const faseAtual = obterFaseAtual(jornada);
  const acoesPendentes = faseAtual?.etapas.filter((e) => e.status === "pendente") ?? [];
  const stepperItems: StepperItem[] = jornada.fases.map((f) => ({
    id: f.id,
    title: f.titulo,
    status: f.status,
  }));

  const porResponsavel = useEtapasPorResponsavel(jornada);
  const previsao = usePrevisao(jornada);

  const docsPendentes = documentos.filter((d) => d.status === "pendente").length;
  const pagamentoAtrasado = pagamentos.some((p) => p.status === "atrasado");
  const pagamentoPendente = pagamentos.some((p) => p.status === "pendente");
  const proximaReuniao = reunioes
    .filter((r) => r.status === "agendada")
    .sort((a, b) => a.inicio.localeCompare(b.inicio))[0];

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white shadow-elevated sm:p-8">
        <div
          aria-hidden
          className="absolute -right-10 top-0 h-48 w-48 rounded-full bg-gold/15 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-label text-gold">Portal Akros</p>
            <h1 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
              {t("dashboard.greeting", { nome: cliente.nome.split(" ")[0] })}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
              {t("dashboard.visaType")}:{" "}
              <strong className="font-medium text-white">{cliente.tipoVisto}</strong> ·{" "}
              {t("dashboard.caseManager")}:{" "}
              <strong className="font-medium text-white">{cliente.caseManager}</strong>
            </p>
          </div>
          {faseAtual && (
            <Link
              to="/portal/jornada"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <MapIcon className="h-4 w-4 text-gold" aria-hidden />
              {faseAtual.titulo}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </section>

      <Card className="border-gold-200 p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
              {t("dashboard.progress")}
            </p>
            <p className="mt-1 font-display text-2xl font-medium text-navy">
              {progresso}% da jornada
            </p>
          </div>
          <Link to="/portal/jornada" className="text-sm font-medium text-gold-700 hover:text-navy">
            {t("dashboard.viewJourney")} →
          </Link>
        </div>
        <Progress value={progresso} className="mb-7" />
        <div className="overflow-x-auto">
          <Stepper items={stepperItems} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("dashboard.ballWith")}
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            <BolaRow
              label={t("journey.responsible.cliente")}
              count={porResponsavel.cliente.length}
              destaque
            />
            <BolaRow label={t("journey.responsible.akros")} count={porResponsavel.akros.length} />
            <BolaRow
              label={t("journey.responsible.terceiro")}
              count={porResponsavel.terceiro.length}
            />
            <BolaRow label={t("journey.responsible.uscis")} count={porResponsavel.uscis.length} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-gold-700">
            <Gauge className="h-3.5 w-3.5" aria-hidden />
            {t("dashboard.forecastTitle")}
          </h2>
          {previsao ? (
            <>
              <p className="font-display text-xl font-medium text-navy">
                {t("dashboard.forecastRange", {
                  min: Math.round(previsao.diasOtimista / 30),
                  max: Math.round(previsao.diasProvavel / 30),
                })}
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                {previsao.dadosSuficientes
                  ? t("dashboard.forecastPace", { factor: previsao.fatorRitmo.toFixed(1) })
                  : t("dashboard.forecastDefaultPace")}
              </p>
              <p className="mt-2 text-xs text-ink-muted">{t("dashboard.forecastNote")}</p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">—</p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("dashboard.nextActions")}
        </h2>
        {acoesPendentes.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("dashboard.noActions")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {acoesPendentes.map((etapa) => (
              <li key={etapa.id}>
                <Link
                  to="/portal/jornada"
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm transition-all hover:border-gold-300 hover:bg-gold-50/30"
                >
                  <span className="font-medium text-navy">{etapa.titulo}</span>
                  <Badge variant="gold">{t("common:status.pending")}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ShortcutCard
          icon={FileText}
          title={t("dashboard.documents")}
          value={
            docsPendentes > 0
              ? t("dashboard.documentsPending", { count: docsPendentes })
              : t("dashboard.documentsUpToDate")
          }
          alert={docsPendentes > 0}
          to="/portal/documentos"
        />
        <ShortcutCard
          icon={Wallet}
          title={t("dashboard.payments")}
          value={
            pagamentoAtrasado
              ? t("dashboard.paymentsOverdue")
              : pagamentoPendente
                ? t("dashboard.paymentsPending")
                : t("dashboard.paymentsUpToDate")
          }
          alert={pagamentoAtrasado}
          to="/portal/pagamentos"
        />
        <ShortcutCard
          icon={CalendarDays}
          title={t("dashboard.nextMeeting")}
          value={
            proximaReuniao
              ? new Date(proximaReuniao.inicio).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : t("dashboard.noMeeting")
          }
          to="/portal/agenda"
        />
      </div>
    </div>
  );
}

function BolaRow({ label, count, destaque }: { label: string; count: number; destaque?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={destaque ? "font-medium text-navy" : "text-ink-soft"}>{label}</span>
      <Badge variant={count > 0 && destaque ? "gold" : "neutral"}>{count}</Badge>
    </div>
  );
}

interface ShortcutCardProps {
  icon: typeof FileText;
  title: string;
  value: string;
  alert?: boolean;
  to: string;
}

function ShortcutCard({ icon: Icon, title, value, alert, to }: ShortcutCardProps) {
  return (
    <Link to={to}>
      <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{title}</p>
            <p className={`text-sm font-medium ${alert ? "text-red-600" : "text-navy"}`}>{value}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
