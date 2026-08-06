import { container } from "@/app/di";
import { useMockDb } from "@/mocks/store";
import type { Lead } from "@/shared/contracts/lead";
import { Button, Card, Modal, Textarea, toast } from "@/shared/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * E11-S04 — gate humano de agendamento. Fila de leads com qualificação concluída aguardando
 * aprovação antes de a agenda ser liberada. Nunca há auto-aprovação (AC-5).
 */
export function AprovacoesPage() {
  const { t } = useTranslation("admin");
  const leads = useMockDb((s) => s.leads);
  const [selecionado, setSelecionado] = useState<Lead | null>(null);

  const fila = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.qualificacao?.status === "concluida" &&
          (!l.gateAgendamento || l.gateAgendamento.status === "pendente"),
      ),
    [leads],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("gate.title")}</h1>
        <p className="text-sm text-ink-soft">{t("gate.subtitle")}</p>
      </div>

      {fila.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("gate.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {fila.map((lead) => (
            <Card key={lead.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy">{lead.nome}</p>
                <p className="text-xs text-ink-muted">
                  {lead.tipoVistoInteresse} · {lead.perfil?.faixaBudget ?? "—"} ·{" "}
                  {lead.perfil?.momentoVida ?? "—"}
                </p>
              </div>
              <Button size="sm" onClick={() => setSelecionado(lead)}>
                {t("gate.review")}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {selecionado && <GateModal lead={selecionado} onClose={() => setSelecionado(null)} />}
    </div>
  );
}

function GateModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const fit = calcularFitHeuristico(lead);

  async function decidir(decisao: "aprovado" | "recusado") {
    if (decisao === "recusado" && !motivo.trim()) return;
    if (salvando) return;
    setSalvando(true);
    try {
      await container.leads.decidirGateAgendamento(
        lead.id,
        decisao,
        "Bruno Luz",
        motivo.trim() || undefined,
      );
      if (decisao === "recusado" && motivo.trim()) {
        await container.leads.atualizarPerfil(
          lead.id,
          { objecaoPrincipal: motivo.trim() },
          "preenchido_equipe",
        );
      }
      toast.success(t(decisao === "aprovado" ? "gate.approved" : "gate.rejected"));
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={lead.nome} description={lead.email}>
      <div className="flex flex-col gap-4">
        <div className="rounded-md bg-cream-200 px-3 py-2 text-xs text-ink-soft">
          {t("gate.fitSuggestion", { fit })}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label={t("profile.education")} value={lead.perfil?.formacao} />
          <Field
            label={t("profile.experienceYears")}
            value={lead.perfil?.anosExperiencia?.toString()}
          />
          <Field label={t("profile.budget")} value={lead.perfil?.faixaBudget} />
          <Field label={t("profile.lifeMoment")} value={lead.perfil?.momentoVida} />
        </div>
        <Textarea
          label={t("gate.rejectReasonLabel")}
          placeholder={t("gate.rejectReasonPlaceholder")}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => decidir("recusado")}
            disabled={salvando || !motivo.trim()}
          >
            {t("gate.reject")}
          </Button>
          <Button onClick={() => decidir("aprovado")} loading={salvando} disabled={salvando}>
            {t("gate.approve")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-medium text-navy">{value ?? "—"}</p>
    </div>
  );
}

/** Heurística simples e rotulada como sugestão — a decisão nunca é automática (AC-5). */
function calcularFitHeuristico(lead: Lead): "alto" | "medio" | "baixo" {
  let pontos = 0;
  if (lead.perfil?.faixaBudget === "acima_50k" || lead.perfil?.faixaBudget === "30k_50k")
    pontos += 1;
  if (lead.perfil?.momentoVida === "decidido_com_prazo" || lead.perfil?.momentoVida === "urgente")
    pontos += 1;
  if ((lead.perfil?.anosExperiencia ?? 0) >= 5) pontos += 1;
  if (pontos >= 2) return "alto";
  if (pontos === 1) return "medio";
  return "baixo";
}
