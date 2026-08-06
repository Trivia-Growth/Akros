import { container } from "@/app/di";
import { useTimeline } from "@/features/comunicacao/application/hooks";
import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import { catalogoProgramas } from "@/mocks/programas";
import { roteiroQualificacaoMock } from "@/mocks/qualificacao";
import { useMockDb } from "@/mocks/store";
import type { EstagioLead, Lead } from "@/shared/contracts/lead";
import {
  Badge,
  Button,
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
import { useState } from "react";
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

export function KanbanPage() {
  const { t } = useTranslation("admin");
  const leads = useMockDb((s) => s.leads);
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("kanban.title")}</h1>
        <p className="text-sm text-ink-soft">{t("kanban.subtitle")}</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {ESTAGIOS.map((estagio) => {
          const leadsDaColuna = leads.filter((l) => l.estagio === estagio);
          return (
            <div
              key={estagio}
              className="flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-cream-200 p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggingId) moverLead(draggingId, estagio);
                setDraggingId(null);
              }}
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-label text-ink-soft">
                  {t(`kanban.columns.${estagio}`)}
                </h2>
                <Badge variant="neutral">{leadsDaColuna.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {leadsDaColuna.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    draggable
                    onDragStart={() => setDraggingId(lead.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => setLeadSelecionado(lead)}
                    className={cn(
                      "cursor-grab rounded-md border border-border bg-white p-3 text-left shadow-subtle transition-shadow hover:shadow-elevated active:cursor-grabbing",
                      draggingId === lead.id && "opacity-50",
                    )}
                  >
                    <p className="text-sm font-medium text-navy">{lead.nome}</p>
                    <p className="mt-1 text-xs text-ink-muted">{lead.tipoVistoInteresse}</p>
                    <p className="mt-1 text-xs text-ink-muted">{lead.origem}</p>
                    {lead.gateAgendamento?.status === "pendente" && (
                      <Badge variant="warning" className="mt-2">
                        {t("kanban.gatePending")}
                      </Badge>
                    )}
                  </button>
                ))}
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

function LeadDetailModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const leadAtual = useMockDb((s) => s.leads.find((l) => l.id === lead.id)) ?? lead;
  const timeline = useTimeline(leadAtual.id);
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
        </TabsList>

        <TabsContent value="overview">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Telefone" value={leadAtual.telefone} />
              <Info label="Origem" value={leadAtual.origem} />
              <Info label="Visto" value={leadAtual.tipoVistoInteresse} />
              <Info label="Área/Profissão" value={leadAtual.areaProfissao ?? "—"} />
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
            <p className="font-medium text-navy">{valor || "—"}</p>
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
            <p className="mt-1 font-medium text-navy">{respostas[pergunta.id] ?? "—"}</p>
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
  const [programaCodigo, setProgramaCodigo] = useState(catalogoProgramas[0]?.codigo ?? "");
  const [convertendo, setConvertendo] = useState(false);

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
          {catalogoProgramas.map((programa) => (
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
