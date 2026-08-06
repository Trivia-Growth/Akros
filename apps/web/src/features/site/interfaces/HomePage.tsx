import { useDepoimentos } from "@/features/site/application/hooks";
import { Avatar, Badge, Button, Card } from "@/shared/ui";
import { Church, FileCheck, GraduationCap, Quote, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const CATEGORY_ICONS = [GraduationCap, Trophy, Church, FileCheck] as const;
const CATEGORY_KEYS = ["qualified", "athletes", "religious", "legalization"] as const;

export function HomePage() {
  const { t } = useTranslation("site");
  const depoimentos = useDepoimentos();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-gold/15"
        />
        <div
          aria-hidden
          className="absolute -right-8 bottom-0 h-80 w-80 rounded-full border border-gold/10"
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
          <span className="text-xs font-semibold uppercase tracking-label text-gold">
            {t("home.hero.eyebrow")}
          </span>
          <h1 className="font-display text-4xl font-semibold text-white sm:text-6xl">
            {t("home.hero.title")}
          </h1>
          <p className="max-w-xl text-lg text-white/70">{t("home.hero.subtitle")}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <Link to="/contatos">
              <Button variant="gold" size="lg">
                {t("home.hero.ctaPrimary")}
              </Button>
            </Link>
            <Link to="/vistos">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white/5 text-white hover:bg-white/10"
              >
                {t("home.hero.ctaSecondary")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-3">
          <Stat value="300+" label={t("home.stats.families")} />
          <Stat value="14+" label={t("home.stats.experience")} />
          <Stat value="98%" label={t("home.stats.satisfaction")} />
        </div>
      </section>

      {/* Categorias de serviço */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold text-navy">
            {t("home.categories.title")}
          </h2>
          <p className="mt-2 text-ink-soft">{t("home.categories.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_KEYS.map((key, i) => {
            const Icon = CATEGORY_ICONS[i];
            return (
              <Card key={key} className="flex flex-col gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gold-50 text-gold-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="font-medium text-navy">{t(`home.categories.${key}.title`)}</h3>
                <p className="text-sm text-ink-soft">{t(`home.categories.${key}.description`)}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Destaque EB-2 NIW */}
      <section className="bg-navy-50">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-20 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <Badge variant="gold" className="mb-3">
              {t("home.niw.eyebrow")}
            </Badge>
            <h2 className="font-display text-3xl font-semibold text-navy">{t("home.niw.title")}</h2>
            <p className="mt-3 text-ink-soft">{t("home.niw.description")}</p>
          </div>
          <Link to="/vistos" className="shrink-0">
            <Button size="lg">{t("home.niw.cta")}</Button>
          </Link>
        </div>
      </section>

      {/* Sobre a CEO */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
          <Avatar name={t("home.about.name")} size="lg" className="h-28 w-28 text-2xl" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
              {t("home.about.eyebrow")}
            </span>
            <h2 className="mt-1 font-display text-2xl font-semibold text-navy">
              {t("home.about.name")}{" "}
              <span className="text-base font-normal text-ink-muted">— {t("home.about.role")}</span>
            </h2>
            <p className="mt-3 text-ink-soft">{t("home.about.bio")}</p>
            <Link to="/quem-somos" className="mt-4 inline-block">
              <Button variant="secondary">{t("home.about.cta")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="bg-cream-200">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold text-navy">
              {t("home.testimonials.title")}
            </h2>
            <p className="mt-2 text-ink-soft">{t("home.testimonials.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {depoimentos.map((d) => (
              <Card key={d.id} className="flex flex-col gap-3">
                <Quote className="h-5 w-5 text-gold" aria-hidden />
                <p className="flex-1 text-sm italic text-ink-soft">"{d.texto}"</p>
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <Avatar name={d.nomeCliente} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-navy">{d.nomeCliente}</p>
                    <p className="text-xs text-ink-muted">{d.tipoVisto}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-navy">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-20 text-center">
          <h2 className="font-display text-3xl font-semibold text-white">{t("home.cta.title")}</h2>
          <p className="text-white/70">{t("home.cta.subtitle")}</p>
          <Link to="/contatos" className="mt-2">
            <Button variant="gold" size="lg">
              {t("home.cta.button")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-4xl font-semibold text-navy">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
    </div>
  );
}
