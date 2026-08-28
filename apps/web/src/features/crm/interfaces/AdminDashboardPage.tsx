import { useMockDb } from "@/mocks/store";
import type { EstagioLead } from "@/shared/contracts/lead";
import { Badge, Card } from "@/shared/ui";
import { ArrowUpRight, CircleDollarSign, ClipboardCheck, Clock3, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const ESTAGIOS: EstagioLead[] = [
  "lead",
  "qualificado",
  "reuniao_agendada",
  "em_negociacao",
  "fechado",
  "descartado",
];

const SAUDE_VARIANT = {
  em_dia: "success",
  atencao: "warning",
  atrasado: "danger",
} as const;

function formatarValor(valor: number, moeda: "BRL" | "USD"): string {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

export function AdminDashboardPage() {
  const { t } = useTranslation("admin");
  const leads = useMockDb((s) => s.leads);
  const clientes = useMockDb((s) => s.clientes);
  const jornadas = useMockDb((s) => s.jornadas);
  const pagamentos = useMockDb((s) => s.pagamentos);
  const reunioes = useMockDb((s) => s.reunioes);
  const eventos = useMockDb((s) => s.eventosComunicacao);
  const documentos = useMockDb((s) => s.documentos);

  const funil = ESTAGIOS.map((estagio) => ({
    estagio,
    count: leads.filter((l) => l.estagio === estagio).length,
  }));
  const maxFunil = Math.max(...funil.map((f) => f.count), 1);

  const fechados = leads.filter((l) => l.estagio === "fechado").length;
  const totalLeads = leads.length;
  const taxaConversao = totalLeads === 0 ? 0 : Math.round((fechados / totalLeads) * 100);

  const clientesPorFase = jornadas.map((j) => {
    const faseAtual =
      j.fases.find((f) => f.status === "em_andamento") ??
      j.fases.find((f) => f.status === "liberada");
    return faseAtual?.titulo ?? "Sem fase ativa";
  });
  const fasesUnicas = Array.from(new Set(clientesPorFase));
  const maxFase = Math.max(
    ...fasesUnicas.map((f) => clientesPorFase.filter((x) => x === f).length),
    1,
  );

  const saudeCounts = {
    em_dia: clientes.filter((c) => c.saude === "em_dia").length,
    atencao: clientes.filter((c) => c.saude === "atencao").length,
    atrasado: clientes.filter((c) => c.saude === "atrasado").length,
  };

  const totalPago = pagamentos.filter((p) => p.status === "pago").reduce((a, p) => a + p.valor, 0);
  const totalPendente = pagamentos
    .filter((p) => p.status === "pendente")
    .reduce((a, p) => a + p.valor, 0);
  const totalAtrasado = pagamentos
    .filter((p) => p.status === "atrasado")
    .reduce((a, p) => a + p.valor, 0);

  const proximasReunioes = reunioes
    .filter((r) => r.status === "agendada")
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, 5);

  const atividadeRecente = [...eventos]
    .filter((e) => e.canal === "sistema")
    .sort((a, b) => b.ocorridoEm.localeCompare(a.ocorridoEm))
    .slice(0, 6);
  const pendencias = documentos.filter((documento) => documento.status === "em_analise").length;
  const reunioesHoje = proximasReunioes.filter(
    (reuniao) => new Date(reuniao.inicio).toDateString() === new Date().toDateString(),
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-label text-gold-700">Akros OS</p>
          <h1 className="mt-2 font-display text-3xl font-medium text-navy">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("dashboard.subtitle")}</p>
        </div>
        <p className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft">
          Atualizado agora
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Leads ativos"
          value={leads.filter((lead) => !["fechado", "descartado"].includes(lead.estagio)).length}
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
          value={formatarValor(totalPago, "BRL")}
          detail={`${formatarValor(totalPendente, "BRL")} em aberto`}
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
            {funil.map((f) => (
              <BarRow
                key={f.estagio}
                label={t(`kanban.columns.${f.estagio}`)}
                value={f.count}
                max={maxFunil}
              />
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("dashboard.clientsByPhaseTitle")}
          </h2>
          <div className="flex flex-col gap-2.5">
            {fasesUnicas.map((fase) => (
              <BarRow
                key={fase}
                label={fase}
                value={clientesPorFase.filter((x) => x === fase).length}
                max={maxFase}
              />
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("dashboard.caseHealthTitle")}
          </h2>
          <div className="flex items-center gap-4">
            {(Object.keys(saudeCounts) as (keyof typeof saudeCounts)[]).map((key) => (
              <div
                key={key}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-md bg-cream-200 py-4"
              >
                <span className="font-display text-2xl font-semibold text-navy">
                  {saudeCounts[key]}
                </span>
                <Badge variant={SAUDE_VARIANT[key]}>{t(`clientes.health_${key}`)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("dashboard.revenueTitle")}
          </h2>
          <div className="flex flex-col gap-3 text-sm">
            <RevenueRow label={t("dashboard.revenuePaid")} value={totalPago} variant="success" />
            <RevenueRow
              label={t("dashboard.revenuePending")}
              value={totalPendente}
              variant="gold"
            />
            <RevenueRow
              label={t("dashboard.revenueOverdue")}
              value={totalAtrasado}
              variant="danger"
            />
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
              {proximasReunioes.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{r.titulo}</span>
                  <span className="text-xs text-ink-muted">
                    {new Date(r.inicio).toLocaleDateString("pt-BR")}
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
              {atividadeRecente.map((i) => (
                <li key={i.id} className="text-sm text-ink-soft">
                  {i.conteudo}
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
    <Card className="min-w-0 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated">
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
  const pct = max === 0 ? 0 : (value / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-xs text-ink-soft" title={label}>
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-300">
        <div
          className="h-full rounded-full bg-navy transition-[width] duration-500 ease-out-soft"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-medium text-navy">{value}</span>
    </div>
  );
}

function RevenueRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "gold" | "danger";
}) {
  const dotClass = {
    success: "bg-emerald-500",
    gold: "bg-gold-500",
    danger: "bg-red-500",
  }[variant];
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-ink-soft">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
        {label}
      </span>
      <span className="font-medium text-navy">{formatarValor(value, "BRL")}</span>
    </div>
  );
}
