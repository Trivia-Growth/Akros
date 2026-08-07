import { Button, Card, Reveal } from "@/shared/ui";
import { BriefcaseBusiness, FilePenLine, FileText, MapPinned } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const CATEGORY_ICONS = [MapPinned, BriefcaseBusiness, FileText, FilePenLine] as const;
const CATEGORY_KEYS = [
  "immigrationPlan",
  "businessPlan",
  "americanResume",
  "recommendationLetters",
] as const;

export function ServicosPage() {
  const { t } = useTranslation("site");

  return (
    <div>
      <section className="border-b border-border bg-cream-200">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-12 lg:py-24">
          <Reveal className="lg:col-span-6">
            <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
              {t("servicesPage.eyebrow")}
            </span>
            <h1 className="mt-3 font-display text-4xl font-medium leading-tight text-navy sm:text-5xl">
              {t("servicesPage.title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              {t("servicesPage.subtitle")}
            </p>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-6">
            <img
              src="/akros-consultation.png"
              alt={t("servicesPage.imageAlt")}
              width={1536}
              height={1024}
              loading="lazy"
              className="aspect-[3/2] w-full rounded-2xl object-cover shadow-elevated"
            />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {CATEGORY_KEYS.map((key, i) => {
            const Icon = CATEGORY_ICONS[i];
            return (
              <Card
                key={key}
                className="flex min-h-64 flex-col gap-4 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold-300 hover:shadow-elevated"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gold-50 text-gold-700">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-navy">
                    {t(`servicesPage.categories.${key}.title`)}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
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
      </section>
    </div>
  );
}
