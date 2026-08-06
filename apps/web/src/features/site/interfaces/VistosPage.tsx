import { Badge, Button, Card } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const IMIGRANTES = ["eb1", "eb2", "eb2niw", "eb3", "eb4"] as const;
const NAO_IMIGRANTES = ["f1", "l1", "e2", "p1", "r", "h1b", "h2b"] as const;

type Filtro = "all" | "immigrant" | "nonImmigrant";

export function VistosPage() {
  const { t } = useTranslation("site");
  const [filtro, setFiltro] = useState<Filtro>("all");

  const mostrarImigrantes = filtro !== "nonImmigrant";
  const mostrarNaoImigrantes = filtro !== "immigrant";

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("visasPage.eyebrow")}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy sm:text-4xl">
          {t("visasPage.title")}
        </h1>
        <p className="mt-3 text-ink-soft">{t("visasPage.subtitle")}</p>
      </div>

      <div className="mb-10 flex gap-2">
        <FilterButton active={filtro === "all"} onClick={() => setFiltro("all")}>
          {t("visasPage.filterAll")}
        </FilterButton>
        <FilterButton active={filtro === "immigrant"} onClick={() => setFiltro("immigrant")}>
          {t("visasPage.filterImmigrant")}
        </FilterButton>
        <FilterButton active={filtro === "nonImmigrant"} onClick={() => setFiltro("nonImmigrant")}>
          {t("visasPage.filterNonImmigrant")}
        </FilterButton>
      </div>

      {mostrarImigrantes && (
        <section className="mb-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("visasPage.categoryImmigrant")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {IMIGRANTES.map((key) => (
              <VisaCard key={key} visaKey={key} destaque={key === "eb2niw"} />
            ))}
          </div>
        </section>
      )}

      {mostrarNaoImigrantes && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("visasPage.categoryNonImmigrant")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {NAO_IMIGRANTES.map((key) => (
              <VisaCard key={key} visaKey={key} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150",
        active ? "bg-navy text-white" : "bg-white text-ink-soft hover:bg-cream-200",
      )}
    >
      {children}
    </button>
  );
}

function VisaCard({ visaKey, destaque }: { visaKey: string; destaque?: boolean }) {
  const { t } = useTranslation("site");
  return (
    <Card className={cn("flex flex-col gap-2", destaque && "border-gold-300 bg-gold-50/30")}>
      <div className="flex items-center gap-2">
        <h3 className="font-display text-lg font-semibold text-navy">
          {t(`visasPage.list.${visaKey}.name`)}
        </h3>
        {destaque && <Badge variant="gold">{t("visasPage.niwHighlight")}</Badge>}
      </div>
      <p className="text-sm text-ink-soft">{t(`visasPage.list.${visaKey}.description`)}</p>
      <Link to="/contatos" className="mt-2">
        <Button size="sm" variant="secondary">
          {t("visasPage.cta")}
        </Button>
      </Link>
    </Card>
  );
}
