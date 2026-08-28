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
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  Gauge,
  Map as MapIcon,
  Wallet,
} from "lucide-react";
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

  const proximaAcao = acoesPendentes[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:gap-8">
      <section className="relative overflow-hidden rounded-[1.25rem] bg-navy px-6 py-7 text-white shadow-elevated sm:px-8 sm:py-9">
        <div
          aria-hidden
          className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 left-1/3 h-48 w-72 rounded-full bg-navy-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-label text-gold">
                Portal Akros · Seu processo
              </p>
              <h1 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                {t("dashboard.greeting", { nome: cliente.nome.split(" ")[0] })}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
                {t("dashboard.visaType")}:{" "}
                <strong className="font-medium text-white">{cliente.tipoVisto}</strong>
                <span className="mx-2 text-gold/70">·</span>
                {t("dashboard.caseManager")}:{" "}
                <strong className="font-medium text-white">{cliente.caseManager}</strong>
              </p>
            </div>
            {faseAtual && (
              <Link
                to="/portal/jornada"
                className="group inline-flex items-center gap-2 self-start rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-gold/40 hover:bg-white/15 lg:self-auto"
              >
                <MapIcon className="h-4 w-4 text-gold" aria-hidden />
                {faseAtual.titulo}
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </Link>
            )}
          </div>

          <div className="mt-8 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-label text-gold">
                Seu avanço
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-display text-3xl font-medium">{progresso}%</span>
                <span className="text-sm text-white/60">da jornada concluída</span>
              </div>
              <div className="mt-3 max-w-md">
                <Progress value={progresso} className="[&::-webkit-progress-bar]:bg-white/15" />
              </div>
            </div>
            <Link
              to="/portal/jornada"
              className="inline-flex items-center gap-2 text-sm font-medium text-gold transition-colors hover:text-white"
            >
              Ver jornada completa
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
        <section className="rounded-[1.25rem] border border-gold-200/80 bg-white p-5 shadow-subtle sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
                Sua prioridade agora
              </p>
              <h2 className="mt-2 font-display text-2xl font-medium text-navy">Próximas ações</h2>
            </div>
            {acoesPendentes.length > 0 && (
              <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-gold-100 px-2 text-sm font-semibold text-gold-800">
                {acoesPendentes.length}
              </span>
            )}
          </div>

          {proximaAcao ? (
            <div className="mt-6">
              <Link
                to="/portal/jornada"
                className="group flex flex-col gap-4 rounded-xl bg-cream-100 p-5 transition-all duration-200 hover:bg-gold-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-navy shadow-gold">
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
                      Faça agora
                    </p>
                    <p className="mt-1 text-base font-semibold text-navy">{proximaAcao.titulo}</p>
                    <p className="mt-1 text-sm text-ink-soft">{proximaAcao.descricao}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy group-hover:text-gold-800">
                  Continuar
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
              </Link>

              {acoesPendentes.length > 1 && (
                <ul className="mt-3 divide-y divide-border">
                  {acoesPendentes.slice(1).map((etapa) => (
                    <li key={etapa.id}>
                      <Link
                        to="/portal/jornada"
                        className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:text-gold-800"
                      >
                        <span className="font-medium text-navy">{etapa.titulo}</span>
                        <span className="shrink-0 text-xs font-medium text-ink-muted">
                          Ver etapa
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
              <p>{t("dashboard.noActions")}</p>
            </div>
          )}
        </section>

        <aside className="rounded-[1.25rem] bg-cream-300/65 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-label text-ink-soft">Panorama</p>
          <div className="mt-5 flex flex-col divide-y divide-border/80">
            <div className="pb-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
                <Gauge className="h-4 w-4 text-gold-700" aria-hidden />
                {t("dashboard.forecastTitle")}
              </h2>
              {previsao ? (
                <>
                  <p className="mt-2 font-display text-xl font-medium text-navy">
                    {t("dashboard.forecastRange", {
                      min: Math.round(previsao.diasOtimista / 30),
                      max: Math.round(previsao.diasProvavel / 30),
                    })}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    {previsao.dadosSuficientes
                      ? t("dashboard.forecastPace", { factor: previsao.fatorRitmo.toFixed(1) })
                      : t("dashboard.forecastDefaultPace")}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">—</p>
              )}
            </div>
            <div className="pt-4">
              <h2 className="text-sm font-semibold text-navy">{t("dashboard.ballWith")}</h2>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <BolaRow
                  label={t("journey.responsible.cliente")}
                  count={porResponsavel.cliente.length}
                  destaque
                />
                <BolaRow
                  label={t("journey.responsible.akros")}
                  count={porResponsavel.akros.length}
                />
                <BolaRow
                  label={t("journey.responsible.terceiro")}
                  count={porResponsavel.terceiro.length}
                />
                <BolaRow
                  label={t("journey.responsible.uscis")}
                  count={porResponsavel.uscis.length}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-[1.25rem] border border-border/80 bg-white p-5 shadow-subtle sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-label text-ink-soft">
              {t("dashboard.progress")}
            </p>
            <h2 className="mt-1 font-display text-2xl font-medium text-navy">
              Sua jornada, etapa por etapa
            </h2>
          </div>
          <Link
            to="/portal/jornada"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gold-700 transition-colors hover:text-navy"
          >
            {t("dashboard.viewJourney")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-6 overflow-x-auto pb-1">
          <Stepper items={stepperItems} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium text-navy">Acompanhe também</h2>
          <p className="hidden text-sm text-ink-muted sm:block">
            Tudo que pede sua atenção, em um só lugar.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </section>
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
    <Link to={to} className="group">
      <Card className="h-full border-border/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-200 hover:shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy transition-colors group-hover:bg-gold-100">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{title}</p>
            <p className={`mt-0.5 text-sm font-medium ${alert ? "text-red-600" : "text-navy"}`}>
              {value}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
