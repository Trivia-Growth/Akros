import { container } from "@/app/di";
import { useReunioesCliente } from "@/features/agenda/application/hooks";
import { useTimeline } from "@/features/comunicacao/application/hooks";
import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import type { PropostaStatus } from "@/features/crm/domain/types";
import { roteiroQualificacaoMock } from "@/mocks/qualificacao";
import { useMockDb } from "@/mocks/store";
import type { EstagioLead, Lead } from "@/shared/contracts/lead";
import {
  Badge,
  Button,
  Card,
  Modal,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  GripVertical,
  ScrollText,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
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

const LANE_STYLE: Record<EstagioLead, { bar: string; surface: string; dot: string }> = {
  lead: { bar: "bg-navy", surface: "bg-slate-50", dot: "bg-navy" },
  qualificado: { bar: "bg-blue-500", surface: "bg-blue-50/55", dot: "bg-blue-500" },
  reuniao_agendada: { bar: "bg-gold-500", surface: "bg-gold-50/60", dot: "bg-gold-500" },
  em_negociacao: { bar: "bg-violet-500", surface: "bg-violet-50/55", dot: "bg-violet-500" },
  fechado: { bar: "bg-emerald-600", surface: "bg-emerald-50/60", dot: "bg-emerald-600" },
  descartado: { bar: "bg-slate-400", surface: "bg-slate-100/75", dot: "bg-slate-400" },
};

export function KanbanPage() {
  const { t } = useTranslation("admin");
  const leads = useMockDb((s) => s.leads);
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<EstagioLead | null>(null);
  const [busca, setBusca] = useState("");

  const termo = busca.trim().toLowerCase();
  const leadsFiltrados = leads.filter(
    (lead) =>
      !termo ||
      [lead.nome, lead.email, lead.tipoVistoInteresse, lead.areaProfissao, lead.origem]
        .filter(Boolean)
        .some((valor) => valor?.toLowerCase().includes(termo)),
  );
  const leadsAtivos = leads.filter(
    (lead) => !["fechado", "descartado"].includes(lead.estagio),
  ).length;
  const gatesPendentes = leads.filter((lead) => lead.gateAgendamento?.status === "pendente").length;
  const emNegociacao = leads.filter((lead) => lead.estagio === "em_negociacao").length;

  async function moverLead(id: string, estagio: EstagioLead) {
    const lead = leads.find((l) => l.id === id);
    if (estagio === "reuniao_agendada" && lead?.gateAgendamento?.status !== "aprovado") {
      toast.error(t("kanban.gateBlocked"));
      return;
    }
    await container.leads.moverEstagio(id, estagio);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
            Pipeline comercial
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
            {t("kanban.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("kanban.subtitle")}</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
          <PipelineMetric icon={UsersRound} value={leadsAtivos} label="em andamento" />
          <PipelineMetric
            icon={ShieldCheck}
            value={gatesPendentes}
            label="aprovações"
            tone="text-amber-700"
          />
          <PipelineMetric
            icon={CircleDollarSign}
            value={emNegociacao}
            label="em negociação"
            tone="text-emerald-700"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, visto ou origem"
            className="h-10 w-full rounded-lg border border-border bg-cream-50 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:bg-white focus:ring-2 focus:ring-gold-100"
          />
        </div>
        <p className="shrink-0 text-xs text-ink-muted">
          {leadsFiltrados.length} de {leads.length} oportunidades visíveis
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-5 [scrollbar-width:thin]">
        {ESTAGIOS.map((estagio) => {
          const leadsDaColuna = leadsFiltrados.filter((l) => l.estagio === estagio);
          const style = LANE_STYLE[estagio];
          return (
            <div
              key={estagio}
              className={cn(
                "relative flex w-[19rem] shrink-0 flex-col gap-3 overflow-hidden rounded-xl border p-3 transition-colors",
                style.surface,
                dragOverStage === estagio
                  ? "border-gold-400 ring-2 ring-gold-100"
                  : "border-border",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverStage(estagio);
              }}
              onDragLeave={() =>
                setDragOverStage((current) => (current === estagio ? null : current))
              }
              onDrop={() => {
                if (draggingId) moverLead(draggingId, estagio);
                setDraggingId(null);
                setDragOverStage(null);
              }}
            >
              <div className={cn("absolute inset-x-0 top-0 h-1", style.bar)} />
              <div className="flex items-center justify-between px-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                  <h2 className="text-xs font-semibold uppercase tracking-label text-ink-soft">
                    {t(`kanban.columns.${estagio}`)}
                  </h2>
                </div>
                <span className="rounded-full bg-white/85 px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
                  {leadsDaColuna.length}
                </span>
              </div>
              <div className="min-h-[12rem] flex flex-col gap-2">
                {leadsDaColuna.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    draggable
                    onDragStart={() => setDraggingId(lead.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => setLeadSelecionado(lead)}
                    className={cn(
                      "group cursor-grab rounded-lg border border-border/90 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-elevated active:cursor-grabbing",
                      draggingId === lead.id && "scale-[0.98] opacity-45",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-semibold text-navy">{lead.nome}</p>
                      <GripVertical
                        className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted/50 transition group-hover:text-ink-muted"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-ink-soft">
                      {lead.tipoVistoInteresse}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
                      <span className="truncate text-xs text-ink-muted">{lead.origem}</span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-ink-muted transition group-hover:text-gold-700"
                        aria-hidden
                      />
                    </div>
                    {lead.gateAgendamento?.status === "pendente" && (
                      <Badge variant="warning" className="mt-3">
                        {t("kanban.gatePending")}
                      </Badge>
                    )}
                  </button>
                ))}
                {leadsDaColuna.length === 0 && (
                  <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border bg-white/45 px-4 text-center text-xs text-ink-muted">
                    {termo
                      ? "Nenhuma oportunidade encontrada"
                      : "Arraste uma oportunidade para esta etapa"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {leadSelecionado && (
        <LeadDetailModal lead={leadSelecionado} onClose={() => setLeadSelecionado(null)} />
      )}
    </div>
  );
}

function PipelineMetric({
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

const PROPOSTA_STATUS_VARIANT: Record<PropostaStatus, "neutral" | "gold" | "success" | "danger"> = {
  rascunho: "neutral",
  enviada: "gold",
  aceita: "success",
  recusada: "danger",
};

function LeadDetailModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const leadAtual = useMockDb((s) => s.leads.find((l) => l.id === lead.id)) ?? lead;
  const timeline = useTimeline(leadAtual.id);
  const reunioes = useReunioesCliente(leadAtual.id);
  const propostas = useMockDb((s) => s.propostas.filter((p) => p.leadOuClienteId === leadAtual.id));
  const [nota, setNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  async function handleMover(estagio: EstagioLead) {
    if (estagio === "reuniao_agendada" && leadAtual.gateAgendamento?.status !== "aprovado") {
      toast.error(t("kanban.gateBlocked"));
      return;
    }
    await container.leads.moverEstagio(leadAtual.id, estagio);
  }

  async function handleAdicionarNota() {
    if (!nota.trim() || salvandoNota) return;
    setSalvandoNota(true);
    try {
      await container.leads.adicionarNota(leadAtual.id, nota.trim());
      setNota("");
      toast.success(t("kanban.noteAdded"));
    } finally {
      setSalvandoNota(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={leadAtual.nome} description={leadAtual.email}>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("kanban.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="profile">{t("kanban.tabs.profile")}</TabsTrigger>
          <TabsTrigger value="qualification">{t("kanban.tabs.qualification")}</TabsTrigger>
          <TabsTrigger value="timeline">{t("kanban.tabs.timeline")}</TabsTrigger>
          <TabsTrigger value="meetings">Reuniões</TabsTrigger>
          <TabsTrigger value="proposal">Proposta</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Telefone" value={leadAtual.telefone} />
              <Info label="Origem" value={leadAtual.origem} />
              <Info label="Visto" value={leadAtual.tipoVistoInteresse} />
              <Info label="Área/Profissão" value={leadAtual.areaProfissao ?? "Não informado"} />
            </div>

            <Select
              label={t("kanban.moveTo")}
              value={leadAtual.estagio}
              onChange={(e) => handleMover(e.target.value as EstagioLead)}
            >
              {ESTAGIOS.map((estagio) => (
                <option key={estagio} value={estagio}>
                  {t(`kanban.columns.${estagio}`)}
                </option>
              ))}
            </Select>

            {leadAtual.gateAgendamento && (
              <p className="text-xs text-ink-muted">
                {t("kanban.gateStatus", {
                  status: t(`gate.status.${leadAtual.gateAgendamento.status}`),
                })}{" "}
                {leadAtual.gateAgendamento.status === "pendente" && (
                  <Link to="/admin/aprovacoes" className="text-gold-700 hover:underline">
                    {t("kanban.gateGoTo")}
                  </Link>
                )}
              </p>
            )}

            {leadAtual.estagio === "fechado" && (
              <Button onClick={() => setConvertModalOpen(true)}>
                {t("kanban.convertToClient")}
              </Button>
            )}

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-label text-gold-700">
                {t("kanban.notes")}
              </h3>
              {leadAtual.notas.length === 0 ? (
                <p className="text-sm text-ink-muted">{t("kanban.noNotes")}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {leadAtual.notas.map((n) => (
                    <li key={n} className="rounded-md bg-cream-200 px-3 py-2 text-sm text-ink-soft">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
              <Textarea
                className="mt-2"
                placeholder={t("kanban.notePlaceholder")}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
              />
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={handleAdicionarNota}
                loading={salvandoNota}
                disabled={salvandoNota || !nota.trim()}
              >
                {t("kanban.addNote")}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <PerfilLeadView lead={leadAtual} />
        </TabsContent>

        <TabsContent value="qualification">
          <QualificacaoView lead={leadAtual} />
        </TabsContent>

        <TabsContent value="timeline">
          <Timeline eventos={[...timeline].reverse()} emptyLabel={t("kanban.noTimeline")} />
        </TabsContent>

        <TabsContent value="meetings">
          {reunioes.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma reunião agendada com este lead ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {reunioes.map((r) => (
                <Card key={r.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-gold-700" aria-hidden />
                    <p className="text-sm text-navy">{r.titulo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "realizada" ? "success" : "navy"}>
                      {r.status}
                    </Badge>
                    <p className="text-xs text-ink-muted">
                      {new Date(r.inicio).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proposal">
          {propostas.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma proposta enviada a este lead ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {propostas.map((p) => (
                <Card key={p.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4 shrink-0 text-gold-700" aria-hidden />
                      <p className="text-sm font-medium text-navy">{p.tipoVisto}</p>
                    </div>
                    <Badge variant={PROPOSTA_STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  </div>
                  <p className="text-sm text-ink-soft">
                    {new Intl.NumberFormat(p.moeda === "BRL" ? "pt-BR" : "en-US", {
                      style: "currency",
                      currency: p.moeda,
                    }).format(p.valor)}
                  </p>
                  <p className="text-xs text-ink-muted">{p.condicoes}</p>
                  <Link
                    to={`/admin/propostas/${p.id}`}
                    className="w-fit text-xs font-medium text-gold-700 hover:underline"
                  >
                    Ver documento da proposta →
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {convertModalOpen && (
        <ConverterModal
          lead={leadAtual}
          onClose={() => setConvertModalOpen(false)}
          onDone={onClose}
        />
      )}
    </Modal>
  );
}

function PerfilLeadView({ lead }: { lead: Lead }) {
  const { t } = useTranslation("admin");
  const perfil = lead.perfil;

  if (!perfil || Object.keys(perfil).length === 0) {
    return <p className="text-sm text-ink-muted">{t("kanban.noProfile")}</p>;
  }

  const linhas: [string, string | undefined, keyof typeof perfil][] = [
    [t("profile.education"), perfil.formacao, "formacao"],
    [t("profile.experienceYears"), perfil.anosExperiencia?.toString(), "anosExperiencia"],
    [t("profile.area"), perfil.areaAtuacao, "areaAtuacao"],
    [t("profile.budget"), perfil.faixaBudget, "faixaBudget"],
    [t("profile.lifeMoment"), perfil.momentoVida, "momentoVida"],
    [t("profile.timeline"), perfil.prazoDesejado, "prazoDesejado"],
    [t("profile.family"), perfil.familia, "familia"],
    [
      t("profile.inUS"),
      perfil.estaNosEUA === undefined ? undefined : perfil.estaNosEUA ? "sim" : "não",
      "estaNosEUA",
    ],
    [t("profile.mainObjection"), perfil.objecaoPrincipal, "objecaoPrincipal"],
  ];

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {linhas.map(([label, valor, campo]) => {
        const origem = lead.perfilOrigem?.[campo];
        return (
          <div key={label}>
            <p className="text-xs text-ink-muted">{label}</p>
            <p className="font-medium text-navy">{valor || "Não informado"}</p>
            {valor && origem && (
              <p className="text-[10px] uppercase tracking-wide text-ink-muted">
                {t(`profile.origin.${origem}`)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QualificacaoView({ lead }: { lead: Lead }) {
  const { t } = useTranslation("admin");
  const qualificacao = lead.qualificacao;
  const respostas = qualificacao?.respostas ?? {};

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs italic text-ink-muted">{t("kanban.qualificationFictional")}</p>
      {qualificacao ? (
        <Badge variant={qualificacao.status === "concluida" ? "success" : "gold"}>
          {t(`qualification.status.${qualificacao.status}`)}
        </Badge>
      ) : (
        <p className="text-sm text-ink-muted">{t("kanban.qualificationNotStarted")}</p>
      )}
      <ul className="flex flex-col gap-2">
        {roteiroQualificacaoMock.map((pergunta) => (
          <li key={pergunta.id} className="rounded-md border border-border px-3 py-2 text-sm">
            <p className="text-ink-muted">{pergunta.texto}</p>
            <p className="mt-1 font-medium text-navy">
              {respostas[pergunta.id] ?? "Não informado"}
            </p>
          </li>
        ))}
      </ul>
      {lead.cadencia && (
        <div className="rounded-md bg-cream-200 px-3 py-2 text-xs text-ink-soft">
          {t("cadence.status", {
            status: t(`cadence.statusValue.${lead.cadencia.status}`),
            step: lead.cadencia.toqueAtual,
          })}
        </div>
      )}
    </div>
  );
}

function ConverterModal({
  lead,
  onClose,
  onDone,
}: {
  lead: Lead;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation("admin");
  const programas = useMockDb((state) => state.programas.filter((programa) => programa.ativo));
  const [programaCodigo, setProgramaCodigo] = useState(programas[0]?.codigo ?? "");
  const [convertendo, setConvertendo] = useState(false);

  useEffect(() => {
    if (!programas.some((programa) => programa.codigo === programaCodigo)) {
      setProgramaCodigo(programas[0]?.codigo ?? "");
    }
  }, [programas, programaCodigo]);

  async function handleConverter() {
    if (convertendo) return;
    setConvertendo(true);
    try {
      await container.clientes.criarAPartirDeLead(lead.id, programaCodigo);
      toast.success(t("kanban.converted"));
      onClose();
      onDone();
    } finally {
      setConvertendo(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t("kanban.chooseProgramTitle")}
      description={t("kanban.chooseProgramDescription")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {programas.map((programa) => (
            <button
              key={programa.codigo}
              type="button"
              onClick={() => setProgramaCodigo(programa.codigo)}
              className={cn(
                "rounded-md border p-3 text-left text-sm transition-colors",
                programaCodigo === programa.codigo
                  ? "border-gold-400 bg-gold-50/40"
                  : "border-border bg-white hover:border-gold-200",
              )}
            >
              <p className="font-medium text-navy">{programa.nome}</p>
              <p className="text-xs text-ink-muted">
                {programa.fasesTemplate.length} fases · {programa.documentosExigidos.length}{" "}
                documentos
              </p>
            </button>
          ))}
          {programas.length === 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Ative ao menos um programa para converter este lead.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConverter}
            loading={convertendo}
            disabled={convertendo || !programaCodigo}
          >
            {t("kanban.convertToClient")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-medium text-navy">{value}</p>
    </div>
  );
}
