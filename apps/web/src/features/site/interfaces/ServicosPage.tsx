import { Button, Card } from "@/shared/ui";
import { Church, FileCheck, GraduationCap, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const CATEGORY_ICONS = [GraduationCap, Trophy, Church, FileCheck] as const;
const CATEGORY_KEYS = ["qualified", "athletes", "religious", "legalization"] as const;

export function ServicosPage() {
  const { t } = useTranslation("site");

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-12 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("servicesPage.eyebrow")}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy sm:text-4xl">
          {t("servicesPage.title")}
        </h1>
        <p className="mt-3 text-ink-soft">{t("servicesPage.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CATEGORY_KEYS.map((key, i) => {
          const Icon = CATEGORY_ICONS[i];
          return (
            <Card key={key} className="flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gold-50 text-gold-700">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-navy">
                  {t(`servicesPage.categories.${key}.title`)}
                </h2>
                <p className="mt-2 text-sm text-ink-soft">
                  {t(`servicesPage.categories.${key}.description`)}
                </p>
              </div>
              <Link to="/contatos" className="mt-auto">
                <Button size="sm" variant="secondary">
                  {t("servicesPage.cta")}
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
