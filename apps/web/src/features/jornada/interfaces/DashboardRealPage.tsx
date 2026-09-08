import { usePerfilClienteSupabase } from "@/features/crm/application/usePerfilClienteSupabase";
import { Badge, Card, Progress, Stepper, type StepperItem } from "@/shared/ui";
import { ArrowRight, ArrowUpRight, CircleAlert, Map as MapIcon, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { calcularProgresso, obterFaseAtual } from "../application/calculos";
import { useJornadaClienteReal } from "../application/real-hooks";

/** Portal inicial real: perfil e jornada vêm de portas Supabase, nunca do dashboard demo. */
export function DashboardRealPage() {
  const { t } = useTranslation("portal");
  const perfil = usePerfilClienteSupabase();
  const jornadaConsulta = useJornadaClienteReal();

  if (perfil.carregando || jornadaConsulta.carregando)
    return <Estado mensagem="Carregando painel real…" />;
  if (perfil.erro || jornadaConsulta.erro || !perfil.cliente)
    return <Estado mensagem="Não foi possível carregar o painel." erro />;

  const cliente = perfil.cliente;
  const jornada = jornadaConsulta.jornada;
  const faseAtual = jornada ? obterFaseAtual(jornada) : undefined;
  const progresso = jornada ? calcularProgresso(jornada) : 0;
  const etapasPendentes = faseAtual?.etapas.filter((etapa) => etapa.status === "pendente") ?? [];
  const etapas =
    jornada?.fases.map((fase) => ({ id: fase.id, title: fase.titulo, status: fase.status })) ?? [];

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:gap-8"
      data-testid="dashboard-real"
    >
      <section className="relative overflow-hidden rounded-[1.25rem] bg-navy px-6 py-7 text-white shadow-elevated sm:px-8 sm:py-9">
        <div
          aria-hidden
          className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl"
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
                className="group inline-flex items-center gap-2 self-start rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:border-gold/40 hover:bg-white/15 lg:self-auto"
              >
                <MapIcon className="h-4 w-4 text-gold" />
                {faseAtual.titulo}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
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
              <Progress
                value={progresso}
                className="mt-3 max-w-md [&::-webkit-progress-bar]:bg-white/15"
              />
            </div>
            <Link
              to="/portal/jornada"
              className="inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-white"
            >
              Ver jornada completa
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
        <p>
          Dados carregados pelo Supabase com RLS. Ações de processo continuam indisponíveis até
          fluxo seguro de RPC/Edge Function.
        </p>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
            Sua prioridade agora
          </p>
          <h2 className="mt-2 font-display text-2xl font-medium text-navy">Próximas ações</h2>
          {etapasPendentes.length ? (
            <ul className="mt-5 flex flex-col gap-2">
              {etapasPendentes.map((etapa) => (
                <li key={etapa.id} className="rounded-xl bg-cream-100 p-4">
                  <p className="font-medium text-navy">{etapa.titulo}</p>
                  <p className="mt-1 text-sm text-ink-soft">{etapa.descricao}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-emerald-800">Nenhuma ação pendente nesta fase.</p>
          )}
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-label text-ink-soft">Panorama</p>
          <p className="mt-3 text-sm text-ink-soft">
            {jornada
              ? `${jornada.fases.length} fases registradas`
              : "Jornada ainda não registrada."}
          </p>
          <Badge variant="navy" className="mt-3">
            Leitura protegida por RLS
          </Badge>
        </Card>
      </div>
      {etapas.length > 0 && (
        <Card>
          <div className="mb-5 flex items-center justify-between">
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
              className="text-sm font-semibold text-gold-700 hover:text-navy"
            >
              {t("dashboard.viewJourney")}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <Stepper items={etapas as StepperItem[]} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Estado({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <Card className="mx-auto flex w-full max-w-6xl items-center gap-3 text-sm text-ink-soft">
      {erro && <CircleAlert className="h-4 w-4 text-red-600" />}
      {mensagem}
    </Card>
  );
}
