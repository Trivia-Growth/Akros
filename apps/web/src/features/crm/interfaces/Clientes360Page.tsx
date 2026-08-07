import { useMockDb } from "@/mocks/store";
import { Avatar, Badge } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import { AlertTriangle, ArrowUpRight, Clock3, Search, UsersRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Cliente360 } from "./Cliente360";

const SAUDE_VARIANT = {
  em_dia: "success",
  atencao: "warning",
  atrasado: "danger",
} as const;

export function Clientes360Page() {
  const { t } = useTranslation("admin");
  const clientes = useMockDb((s) => s.clientes);
  const jornadas = useMockDb((s) => s.jornadas);
  const [busca, setBusca] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [filtroSaude, setFiltroSaude] = useState<"todos" | keyof typeof SAUDE_VARIANT>("todos");

  if (clienteId) {
    return <Cliente360 clienteId={clienteId} onBack={() => setClienteId(null)} />;
  }

  const termo = busca.trim().toLowerCase();
  const filtrados = clientes.filter(
    (cliente) =>
      (filtroSaude === "todos" || cliente.saude === filtroSaude) &&
      (!termo ||
        [cliente.nome, cliente.email, cliente.tipoVisto, cliente.caseManager].some((valor) =>
          valor.toLowerCase().includes(termo),
        )),
  );
  const emAtencao = clientes.filter((cliente) => cliente.saude === "atencao").length;
  const atrasados = clientes.filter((cliente) => cliente.saude === "atrasado").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
            Carteira de processos
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
            {t("clientes.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("clientes.subtitle")}</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
          <PortfolioMetric icon={UsersRound} value={clientes.length} label="clientes" />
          <PortfolioMetric
            icon={AlertTriangle}
            value={emAtencao}
            label="em atenção"
            tone="text-amber-700"
          />
          <PortfolioMetric icon={Clock3} value={atrasados} label="atrasados" tone="text-red-700" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 shadow-subtle lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            placeholder={t("clientes.search")}
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-cream-50 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:bg-white focus:ring-2 focus:ring-gold-100"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-cream-100 p-1">
          {(["todos", "em_dia", "atencao", "atrasado"] as const).map((filtro) => (
            <button
              key={filtro}
              type="button"
              onClick={() => setFiltroSaude(filtro)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition",
                filtroSaude === filtro
                  ? "bg-white text-navy shadow-subtle"
                  : "text-ink-muted hover:text-ink-soft",
              )}
            >
              {filtro === "todos" ? "Todos" : t(`clientes.health_${filtro}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
        <div className="hidden grid-cols-[minmax(17rem,1.7fr)_minmax(7rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.8fr)_auto] items-center gap-5 border-b border-border bg-cream-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-label text-ink-muted lg:grid">
          <span>Cliente</span>
          <span>Processo</span>
          <span>Fase atual</span>
          <span>Responsável</span>
          <span>Saúde</span>
        </div>
        <div className="divide-y divide-border">
          {filtrados.map((cliente) => {
            const jornada = jornadas.find((j) => j.clienteId === cliente.id);
            const faseAtual = jornada?.fases.find(
              (fase) => fase.status === "em_andamento" || fase.status === "liberada",
            );
            const fasesConcluidas =
              jornada?.fases.filter((fase) => fase.status === "concluida").length ?? 0;
            const progresso = jornada
              ? Math.round((fasesConcluidas / jornada.fases.length) * 100)
              : 0;
            return (
              <button
                key={cliente.id}
                type="button"
                onClick={() => setClienteId(cliente.id)}
                className="group grid w-full gap-3 px-4 py-4 text-left transition hover:bg-gold-50/35 lg:grid-cols-[minmax(17rem,1.7fr)_minmax(7rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.8fr)_auto] lg:items-center lg:gap-5 lg:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={cliente.nome} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{cliente.nome}</p>
                    <p className="truncate text-xs text-ink-muted">{cliente.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-ink-muted lg:hidden">Processo</p>
                  <p className="text-sm font-medium text-ink-soft">{cliente.tipoVisto}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-ink-muted lg:hidden">Fase atual</p>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                    <p className="truncate text-sm font-medium text-ink-soft">
                      {faseAtual?.titulo ?? "Processo concluído"}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-cream-200">
                      <div
                        className="h-full rounded-full bg-gold-500"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums text-ink-muted">{progresso}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-ink-muted lg:hidden">Responsável</p>
                  <p className="text-sm text-ink-soft">{cliente.caseManager}</p>
                </div>
                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <Badge variant={SAUDE_VARIANT[cliente.saude]}>
                    {t(`clientes.health_${cliente.saude}`)}
                  </Badge>
                  <ArrowUpRight
                    className="h-4 w-4 text-ink-muted transition group-hover:text-gold-700"
                    aria-hidden
                  />
                </div>
              </button>
            );
          })}
          {filtrados.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-navy">Nenhum cliente encontrado</p>
              <p className="mt-1 text-xs text-ink-muted">
                Ajuste a busca ou o filtro de saúde da carteira.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PortfolioMetric({
  icon: Icon,
  value,
  label,
  tone = "text-navy",
}: {
  icon: typeof UsersRound;
  value: number;
  label: string;
  tone?: string;
}) {
  return (
    <div className="flex min-w-28 items-center gap-2.5 px-3.5 py-2.5">
      <Icon className={cn("h-4 w-4", tone)} aria-hidden />
      <div>
        <p className={cn("text-sm font-semibold tabular-nums", tone)}>{value}</p>
        <p className="text-[11px] leading-none text-ink-muted">{label}</p>
      </div>
    </div>
  );
}
