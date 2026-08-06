import { useReunioesCliente } from "@/features/agenda/application/hooks";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { useDocumentosCliente } from "@/features/documentos/application/hooks";
import {
  calcularProgresso,
  obterFaseAtual,
  useJornadaAtiva,
} from "@/features/jornada/application/hooks";
import { usePagamentosCliente } from "@/features/pagamentos/application/hooks";
import { Badge, Button, Card, Progress, Stepper, type StepperItem } from "@/shared/ui";
import { CalendarDays, FileText, Wallet } from "lucide-react";
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

  const docsPendentes = documentos.filter((d) => d.status === "pendente").length;
  const pagamentoAtrasado = pagamentos.some((p) => p.status === "atrasado");
  const pagamentoPendente = pagamentos.some((p) => p.status === "pendente");
  const proximaReuniao = reunioes
    .filter((r) => r.status === "agendada")
    .sort((a, b) => a.inicio.localeCompare(b.inicio))[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">
          {t("dashboard.greeting", { nome: cliente.nome.split(" ")[0] })}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {t("dashboard.visaType")}: <strong className="text-navy">{cliente.tipoVisto}</strong> ·{" "}
          {t("dashboard.caseManager")}: <strong className="text-navy">{cliente.caseManager}</strong>
        </p>
      </div>

      <Card>
        <Progress value={progresso} label={t("dashboard.progress")} className="mb-6" />
        <div className="overflow-x-auto">
          <Stepper items={stepperItems} />
        </div>
        <Link to="/portal/jornada" className="mt-6 inline-block">
          <Button variant="secondary" size="sm">
            {t("dashboard.viewJourney")}
          </Button>
        </Link>
      </Card>

      <Card>
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
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm transition-colors hover:border-gold-300 hover:bg-gold-50/30"
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
      <Card className="transition-shadow hover:shadow-elevated">
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
