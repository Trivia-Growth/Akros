import { Avatar, Button, Card } from "@/shared/ui";
import { HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const VALUE_ICONS = [ShieldCheck, Users, HeartHandshake] as const;
const VALUE_KEYS = ["transparency", "professionalism", "closeness"] as const;

export function QuemSomosPage() {
  const { t } = useTranslation("site");

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("aboutPage.eyebrow")}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy sm:text-4xl">
          {t("aboutPage.title")}
        </h1>
        <p className="mt-4 text-ink-soft">{t("aboutPage.intro")}</p>
      </div>

      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar name={t("aboutPage.ceo.name")} size="lg" className="h-24 w-24 text-2xl" />
        <div>
          <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("aboutPage.ceo.eyebrow")}
          </span>
          <h2 className="mt-1 font-display text-xl font-semibold text-navy">
            {t("aboutPage.ceo.name")}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">{t("aboutPage.ceo.bio1")}</p>
          <p className="mt-2 text-sm text-ink-soft">{t("aboutPage.ceo.bio2")}</p>
        </div>
      </div>

      <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar name={t("aboutPage.partner.name")} size="lg" className="h-24 w-24 text-2xl" />
        <div>
          <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("aboutPage.partner.eyebrow")}
          </span>
          <h2 className="mt-1 font-display text-xl font-semibold text-navy">
            {t("aboutPage.partner.name")}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">{t("aboutPage.partner.bio")}</p>
        </div>
      </div>

      <h2 className="mb-4 font-display text-2xl font-semibold text-navy">
        {t("aboutPage.values.title")}
      </h2>
      <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {VALUE_KEYS.map((key, i) => {
          const Icon = VALUE_ICONS[i];
          return (
            <Card key={key} className="flex flex-col gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gold-50 text-gold-700">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="font-medium text-navy">{t(`aboutPage.values.${key}.title`)}</h3>
              <p className="text-sm text-ink-soft">{t(`aboutPage.values.${key}.description`)}</p>
            </Card>
          );
        })}
      </div>

      <Link to="/contatos">
        <Button size="lg">{t("aboutPage.cta")}</Button>
      </Link>
    </div>
  );
}
