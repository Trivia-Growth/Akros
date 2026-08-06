import { container } from "@/app/di";
import { useMockDb } from "@/mocks/store";
import type { EstagioLead, Lead } from "@/shared/contracts/lead";
import { Badge, Button, Modal, Select, Textarea, toast } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  const [nota, setNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [convertendo, setConvertendo] = useState(false);

  async function handleMover(estagio: EstagioLead) {
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

  async function handleConverter() {
    if (convertendo) return;
    setConvertendo(true);
    try {
      await container.clientes.criarAPartirDeLead(leadAtual.id);
      toast.success(t("kanban.converted"));
      onClose();
    } finally {
      setConvertendo(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={leadAtual.nome} description={leadAtual.email}>
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

        {leadAtual.estagio === "fechado" && (
          <Button onClick={handleConverter} loading={convertendo} disabled={convertendo}>
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
