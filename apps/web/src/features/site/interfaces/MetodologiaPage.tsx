import { Button } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const PASSOS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export function MetodologiaPage() {
  const { t } = useTranslation("site");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-4 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("methodologyPage.eyebrow")}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy sm:text-4xl">
          {t("methodologyPage.title")}
        </h1>
        <p className="mt-3 text-ink-soft">{t("methodologyPage.subtitle")}</p>
      </div>

      <p className="mb-10 rounded-md bg-navy-50 px-4 py-3 text-sm text-navy-700">
        {t("methodologyPage.journeyNote")}
      </p>

      <ol className="flex flex-col">
        {PASSOS.map((num, idx) => (
          <li key={num} className="relative flex gap-4 pb-10 last:pb-0">
            {idx < PASSOS.length - 1 && (
              <div aria-hidden className="absolute left-[19px] top-10 h-full w-px bg-border" />
            )}
            <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
              {num}
            </div>
            <div className="pt-1.5">
              <h2 className="font-medium text-navy">{t(`methodologyPage.steps.${num}.title`)}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {t(`methodologyPage.steps.${num}.description`)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <Link to="/contatos" className="mt-6 inline-block">
        <Button size="lg">{t("methodologyPage.cta")}</Button>
      </Link>
    </div>
  );
}
