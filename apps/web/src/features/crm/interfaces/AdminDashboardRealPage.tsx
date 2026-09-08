import { Badge, Card } from "@/shared/ui";
import {
  ArrowUpRight,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDashboardAdminSupabase } from "../application/useDashboardAdminSupabase";

const SAUDE_VARIANT = { emDia: "success", atencao: "warning", atrasado: "danger" } as const;

export function AdminDashboardRealPage() {
  const { t } = useTranslation("admin");
  const {
    funil,
    clientesPorFase,
    saude,
    receita,
    proximasReunioes,
    atividadeRecente,
    pendencias,
    carregando,
    erro,
  } = useDashboardAdminSupabase();

  if (carregando) return <EstadoDashboard mensagem="Carregando dashboard real…" />;
  if (erro) return <EstadoDashboard mensagem="Não foi possível carregar o dashboard." erro />;

  const totalLeads = funil.reduce((soma, item) => soma + item.quantidade, 0);
  const fechados = funil.find((item) => item.estagio === "fechado")?.quantidade ?? 0;
  const ativos = funil
    .filter((item) => !["fechado", "descartado"].includes(item.estagio))
    .reduce((soma, item) => soma + item.quantidade, 0);
  const taxaConversao = totalLeads === 0 ? 0 : Math.round((fechados / totalLeads) * 100);
  const maxFunil = Math.max(...funil.map((item) => item.quantidade), 1);
  const maxFase = Math.max(...clientesPorFase.map((item) => item.quantidade), 1);
  const hoje = new Date().toDateString();
  const reunioesHoje = proximasReunioes.filter(
    (item) => new Date(item.inicio).toDateString() === hoje,
  ).length;
  const receitaResumo =
    receita.map((item) => formatarValor(item.pago, item.moeda)).join(" · ") || "—";
  const pendenteResumo =
    receita.map((item) => formatarValor(item.pendente, item.moeda)).join(" · ") || "—";

  return (
    <div className="flex flex-col gap-8" data-testid="admin-dashboard-real">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-label text-gold-700">Akros OS</p>
          <h1 className="mt-2 font-display text-3xl font-medium text-navy">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("dashboard.subtitle")}</p>
        </div>
        <p className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft">
          Dados reais protegidos por RLS
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Leads ativos"
          value={ativos}
          detail={`${taxaConversao}% de conversão`}
          icon={UsersRound}
        />
        <MetricCard
          label="Revisões pendentes"
          value={pendencias}
          detail={pendencias ? "Prioridade para operação" : "Fila em dia"}
          icon={ClipboardCheck}
          tone={pendencias ? "gold" : "navy"}
        />
        <MetricCard
          label="Reuniões hoje"
          value={reunioesHoje}
          detail={`${proximasReunioes.length} próximas na agenda`}
          icon={Clock3}
        />
        <MetricCard
          label="Receita recebida"
          value={receitaResumo}
          detail={`${pendenteResumo} em aberto`}
          icon={CircleDollarSign}
          tone="gold"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-label text-gold-700">
              {t("dashboard.funnelTitle")}
            </h2>
            <span className="text-xs text-ink-muted">
              {t("dashboard.conversionRate")}:{" "}
              <strong className="text-navy">{taxaConversao}%</strong>
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {funil.map((item) => (
              <BarRow
                key={item.estagio}
                label={t(`kanban.columns.${item.estagio}`)}
                value={item.quantidade}
                max={maxFunil}
              />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("dashboard.clientsByPhaseTitle")}
          </h2>
          {clientesPorFase.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {clientesPorFase.map((item) => (
                <BarRow key={item.fase} label={item.fase} value={item.quantidade} max={maxFase} />
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("dashboard.caseHealthTitle")}
          </h2>
          <div className="flex items-center gap-4">
            {(Object.keys(saude) as (keyof typeof saude)[]).map((chave) => (
              <div
                key={chave}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-md bg-cream-200 py-4"
              >
                <span className="font-display text-2xl font-semibold text-navy">
                  {saude[chave]}
                </span>
                <Badge variant={SAUDE_VARIANT[chave]}>
                  {t(`clientes.health_${chave === "emDia" ? "em_dia" : chave}`)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("dashboard.revenueTitle")}
          </h2>
          <div className="flex flex-col gap-3 text-sm">
            {receita.length === 0 ? (
              <p className="text-ink-muted">—</p>
            ) : (
              receita.map((item) => (
                <div key={item.moeda} className="rounded-md bg-cream-200 p-3">
                  <p className="font-medium text-navy">{item.moeda}</p>
                  <RevenueRow
                    label={t("dashboard.revenuePaid")}
                    value={item.pago}
                    moeda={item.moeda}
                    variant="success"
                  />
                  <RevenueRow
                    label={t("dashboard.revenuePending")}
                    value={item.pendente}
                    moeda={item.moeda}
                    variant="gold"
                  />
                  <RevenueRow
                    label={t("dashboard.revenueOverdue")}
                    value={item.atrasado}
                    moeda={item.moeda}
                    variant="danger"
                  />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("dashboard.upcomingMeetingsTitle")}
          </h2>
          {proximasReunioes.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {proximasReunioes.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{item.titulo}</span>
                  <span className="text-xs text-ink-muted">
                    {new Date(item.inicio).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("dashboard.recentActivityTitle")}
          </h2>
          {atividadeRecente.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("dashboard.noActivity")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {atividadeRecente.map((item) => (
                <li key={item.id} className="text-sm text-ink-soft">
                  {item.conteudo}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Link
        to="/admin/leads"
        className="group inline-flex w-fit items-center gap-1.5 text-sm font-medium text-navy underline decoration-gold decoration-2 underline-offset-4 hover:text-gold-700"
      >
        Ver kanban de leads
        <ArrowUpRight
          className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}

function EstadoDashboard({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Dashboard</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        <CircleAlert className={`h-4 w-4 ${erro ? "text-red-600" : "text-navy"}`} />
        {mensagem}
      </Card>
    </div>
  );
}
function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "navy",
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: typeof UsersRound;
  tone?: "navy" | "gold";
}) {
  const iconClass = tone === "gold" ? "bg-gold-50 text-gold-700" : "bg-navy-50 text-navy";
  return (
    <Card className="min-w-0 p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-5 truncate font-display text-2xl font-medium text-navy">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{detail}</p>
    </Card>
  );
}
function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-xs text-ink-soft" title={label}>
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-300">
        <div className="h-full rounded-full bg-navy" style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-medium text-navy">{value}</span>
    </div>
  );
}
function RevenueRow({
  label,
  value,
  moeda,
  variant,
}: { label: string; value: number; moeda: "BRL" | "USD"; variant: "success" | "gold" | "danger" }) {
  const dotClass = { success: "bg-emerald-500", gold: "bg-gold-500", danger: "bg-red-500" }[
    variant
  ];
  return (
    <div className="mt-2 flex items-center justify-between">
      <span className="flex items-center gap-2 text-ink-soft">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
        {label}
      </span>
      <span className="font-medium text-navy">{formatarValor(value, moeda)}</span>
    </div>
  );
}
function formatarValor(valor: number, moeda: "BRL" | "USD") {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}
