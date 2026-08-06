import { useMockDb } from "@/mocks/store";
import { Badge, Card, Select } from "@/shared/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * E11-S05 — visão sobre leads em estágio terminal (não uma tabela nova), segmentável por
 * objeção e momento de vida. AC-6: quem pediu para não ser contatado nunca aparece aqui.
 */
export function ReativacaoPage() {
  const { t } = useTranslation("admin");
  const leads = useMockDb((s) => s.leads);
  const [filtroBudget, setFiltroBudget] = useState("todos");
  const [filtroMomento, setFiltroMomento] = useState("todos");

  const base = useMemo(
    () =>
      leads.filter(
        (l) =>
          (l.estagio === "descartado" || l.cadencia?.motivoEncerramento === "esgotada") &&
          !l.naoContatar,
      ),
    [leads],
  );

  const filtrados = base.filter((l) => {
    const passaBudget = filtroBudget === "todos" || l.perfil?.faixaBudget === filtroBudget;
    const passaMomento = filtroMomento === "todos" || l.perfil?.momentoVida === filtroMomento;
    return passaBudget && passaMomento;
  });

  const sugeridos = filtrados.filter(
    (l) => l.perfil?.faixaBudget && l.perfil.faixaBudget !== "prefiro_nao_informar",
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("reactivation.title")}</h1>
        <p className="text-sm text-ink-soft">{t("reactivation.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          label={t("profile.budget")}
          value={filtroBudget}
          onChange={(e) => setFiltroBudget(e.target.value)}
          className="max-w-xs"
        >
          <option value="todos">{t("reactivation.all")}</option>
          <option value="ate_15k">ate_15k</option>
          <option value="15k_30k">15k_30k</option>
          <option value="30k_50k">30k_50k</option>
          <option value="acima_50k">acima_50k</option>
        </Select>
        <Select
          label={t("profile.lifeMoment")}
          value={filtroMomento}
          onChange={(e) => setFiltroMomento(e.target.value)}
          className="max-w-xs"
        >
          <option value="todos">{t("reactivation.all")}</option>
          <option value="explorando">explorando</option>
          <option value="decidido_sem_prazo">decidido_sem_prazo</option>
          <option value="decidido_com_prazo">decidido_com_prazo</option>
          <option value="urgente">urgente</option>
        </Select>
      </div>

      <p className="text-xs text-ink-muted">
        {t("reactivation.count", { count: filtrados.length, suggested: sugeridos.length })}
      </p>

      {filtrados.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("reactivation.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map((lead) => (
            <Card key={lead.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy">{lead.nome}</p>
                <p className="text-xs text-ink-muted">
                  {lead.perfil?.objecaoPrincipal ?? t("reactivation.noObjection")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {lead.perfil?.faixaBudget && (
                  <Badge variant="neutral">{lead.perfil.faixaBudget}</Badge>
                )}
                {lead.perfil?.momentoVida && (
                  <Badge variant="gold">{lead.perfil.momentoVida}</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
