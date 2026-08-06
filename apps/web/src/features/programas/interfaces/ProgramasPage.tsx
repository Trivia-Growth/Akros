import { catalogoProgramas } from "@/mocks/programas";
import { useMockDb } from "@/mocks/store";
import { Badge, Card } from "@/shared/ui";
import { Building2, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Programa } from "../domain/types";

/** E06-S04 — somente leitura (ADR-0004). Comparação lado a lado dos programas do catálogo. */
export function ProgramasPage() {
  const { t } = useTranslation("admin");
  const clientes = useMockDb((s) => s.clientes);
  const [selecionado, setSelecionado] = useState<Programa>(catalogoProgramas[0]);

  const clientesPorPrograma = useMemo(() => {
    const contagem: Record<string, number> = {};
    for (const c of clientes) {
      if (c.programaId) contagem[c.programaId] = (contagem[c.programaId] ?? 0) + 1;
    }
    return contagem;
  }, [clientes]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("programs.title")}</h1>
        <p className="text-sm text-ink-soft">{t("programs.subtitle")}</p>
        <p className="mt-2 text-xs italic text-ink-muted">{t("programs.readOnlyNote")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {catalogoProgramas.map((programa) => {
          const ativo = programa.codigo === selecionado.codigo;
          const totalDocs = programa.documentosExigidos.length;
          return (
            <button
              key={programa.codigo}
              type="button"
              onClick={() => setSelecionado(programa)}
              className={`rounded-lg border p-5 text-left transition-colors ${
                ativo
                  ? "border-gold-400 bg-gold-50/40"
                  : "border-border bg-white hover:border-gold-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {programa.sujeito === "organizacao" ? (
                  <Building2 className="h-4 w-4 text-navy" aria-hidden />
                ) : (
                  <User className="h-4 w-4 text-navy" aria-hidden />
                )}
                <h2 className="font-display text-lg font-medium text-navy">{programa.nome}</h2>
                <Badge variant={programa.ativo ? "success" : "neutral"} className="ml-auto">
                  v{programa.versao}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {t(`programs.subject.${programa.sujeito}`)} · {programa.fasesTemplate.length}{" "}
                {t("programs.phases")} · {totalDocs} {t("programs.requiredDocs")}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {t("programs.activeClients", { count: clientesPorPrograma[programa.codigo] ?? 0 })}
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <h2 className="mb-4 font-display text-xl font-medium text-navy">{selecionado.nome}</h2>
        <ol className="flex flex-col gap-4">
          {selecionado.fasesTemplate.map((fase) => (
            <li key={fase.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-navy">
                {fase.ordem}. {fase.titulo}
              </p>
              <p className="text-xs text-ink-soft">{fase.descricao}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {fase.etapas.map((etapa) => (
                  <li key={etapa.id} className="flex items-center gap-2 text-xs text-ink-muted">
                    <Badge variant="neutral">{t(`journey.responsible.${etapa.responsavel}`)}</Badge>
                    {etapa.titulo}
                    {etapa.prazoMedioDiasUteis && ` · ${etapa.prazoMedioDiasUteis}du`}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-xl font-medium text-navy">
          {t("programs.requiredDocsTitle")}
        </h2>
        <ul className="flex flex-col gap-2">
          {selecionado.documentosExigidos.map((req) => (
            <li
              key={req.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-navy">{req.titulo}</p>
                <p className="text-xs text-ink-muted">{req.objetivo}</p>
              </div>
              <Badge variant={req.obrigatorio ? "gold" : "neutral"}>
                {t(req.obrigatorio ? "programs.required" : "programs.optional")}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
