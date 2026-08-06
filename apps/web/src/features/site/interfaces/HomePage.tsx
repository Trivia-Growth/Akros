import { useDepoimentos } from "@/features/site/application/hooks";
import type { Depoimento } from "@/features/site/domain/types";
import { Button, Card, Reveal } from "@/shared/ui";
import { ArrowUpRight, Award, Check, Quote, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const CATEGORY_KEYS = ["qualified", "athletes", "religious", "legalization"] as const;
const NIW_POINTS = ["noOffer", "family", "selfPetition"] as const;
const METHOD_STEPS = ["1", "2", "3", "4", "5", "6", "7"] as const;

/** Malha de pontos do hero: textura de papel técnico, não gradiente decorativo. */
const DOT_GRID = {
  backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
};

export function HomePage() {
  const depoimentos = useDepoimentos();

  return (
    <div className="bg-cream">
      <Hero />
      <StatsBand />
      <Categorias />
      <Niw />
      <Metodologia />
      <Fundadora />
      <Depoimentos depoimentos={depoimentos} />
      <CtaFinal />
    </div>
  );
}

/* ---------------------------------------------------------------------- Hero */

function Hero() {
  const { t } = useTranslation("site");

  return (
    <section className="relative isolate overflow-hidden bg-navy-950">
      <div aria-hidden className="absolute inset-0" style={DOT_GRID} />
      <div
        aria-hidden
        className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-gold/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-navy-950"
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-x-14 gap-y-16 px-6 pb-28 pt-20 lg:grid-cols-12 lg:pb-36 lg:pt-28">
        <div className="lg:col-span-7">
          <Reveal>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-label text-gold">
              <span aria-hidden className="h-px w-8 bg-gold/50" />
              {t("home.hero.eyebrow")}
            </p>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="mt-6 font-display text-[2.75rem] font-medium leading-[1.05] text-white sm:text-6xl">
              {t("home.hero.titleLead")}
              <br />
              <span className="text-gold-300 italic">{t("home.hero.titleAccent")}</span>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-white/65">
              {t("home.hero.subtitle")}
            </p>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/contatos">
                <Button variant="gold" size="lg">
                  {t("home.hero.ctaPrimary")}
                </Button>
              </Link>
              <Link to="/vistos">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white hover:bg-white/10 active:bg-white/15"
                >
                  {t("home.hero.ctaSecondary")}
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <p className="mt-12 flex max-w-md items-start gap-3 border-t border-white/10 pt-6 text-sm leading-relaxed text-white/50">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" aria-hidden />
              {t("home.hero.trust")}
            </p>
          </Reveal>
        </div>

        <Reveal delay={200} className="lg:col-span-5">
          <div className="relative mx-auto max-w-sm lg:max-w-none">
            <div
              aria-hidden
              className="absolute -bottom-4 -right-4 h-full w-full rounded-xl border border-gold/30"
            />
            <img
              src="/equipe/natalia-luz.jpg"
              alt={t("home.hero.photoAlt")}
              width={800}
              height={800}
              loading="eager"
              className="relative aspect-square w-full rounded-xl object-cover object-top ring-1 ring-white/10"
            />
            <div className="absolute -bottom-7 left-4 right-10 rounded-lg bg-white/95 p-4 shadow-elevated backdrop-blur-sm sm:-left-6 sm:right-16">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gold-50 text-gold-700">
                  <Award className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium leading-snug text-navy">
                    {t("home.hero.credentialTitle")}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {t("home.hero.credentialSubtitle")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- Stats */

function StatsBand() {
  const { t } = useTranslation("site");
  const stats = [
    { value: "300+", label: t("home.stats.families") },
    { value: "14+", label: t("home.stats.experience") },
    { value: "98%", label: t("home.stats.satisfaction") },
  ];

  return (
    <div className="relative z-10 mx-auto -mt-12 max-w-4xl px-6">
      <Reveal>
        <div className="grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-white shadow-elevated sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-7 text-center">
              <p className="font-display text-4xl font-medium tabular-nums text-navy">{s.value}</p>
              <p className="mt-1.5 text-sm text-ink-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

/* ---------------------------------------------------------------- Categorias */

function Categorias() {
  const { t } = useTranslation("site");

  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-x-16 gap-y-10 px-6 py-24 lg:grid-cols-12 lg:py-28">
      <div className="lg:col-span-4">
        <Reveal className="lg:sticky lg:top-28">
          <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("home.categories.eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium leading-tight text-navy sm:text-4xl">
            {t("home.categories.title")}
          </h2>
          <p className="mt-4 max-w-sm text-ink-soft">{t("home.categories.subtitle")}</p>
          <Link
            to="/servicos"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy underline decoration-gold decoration-2 underline-offset-4 transition-colors duration-200 hover:text-gold-700"
          >
            {t("home.categories.cta")}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </Reveal>
      </div>

      <ul className="border-t border-border lg:col-span-8">
        {CATEGORY_KEYS.map((key, i) => (
          <li key={key} className="border-b border-border">
            <Reveal delay={i * 70}>
              <Link
                to="/servicos"
                className="group flex items-start gap-6 py-7 transition-colors duration-200 hover:bg-cream-200/60"
              >
                <span className="w-8 shrink-0 pt-1 font-display text-sm tabular-nums text-gold-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">
                  <span className="block font-display text-xl font-medium text-navy">
                    {t(`home.categories.${key}.title`)}
                  </span>
                  <span className="mt-1.5 block max-w-lg text-sm leading-relaxed text-ink-soft">
                    {t(`home.categories.${key}.description`)}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="mt-1 h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 ease-out-soft group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold-700"
                />
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------------------- NIW */

function Niw() {
  const { t } = useTranslation("site");

  return (
    <section className="relative isolate overflow-hidden bg-navy">
      <div
        aria-hidden
        className="absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-gold/[0.07] blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-x-16 gap-y-12 px-6 py-24 lg:grid-cols-2 lg:py-28">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-label text-gold">
            {t("home.niw.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight text-white sm:text-[2.5rem]">
            {t("home.niw.title")}
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-white/60">{t("home.niw.description")}</p>
          <Link to="/vistos" className="mt-8 inline-block">
            <Button variant="gold" size="lg">
              {t("home.niw.cta")}
            </Button>
          </Link>
        </Reveal>

        <Reveal delay={120}>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {NIW_POINTS.map((key) => (
              <li key={key} className="flex items-start gap-4 py-5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                <div>
                  <p className="font-medium text-white">{t(`home.niw.points.${key}.title`)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">
                    {t(`home.niw.points.${key}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-white/40">{t("home.niw.note")}</p>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Metodologia */

function Metodologia() {
  const { t } = useTranslation("site");

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-28">
        <Reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
                {t("home.method.eyebrow")}
              </p>
              <h2 className="mt-3 max-w-md font-display text-3xl font-medium leading-tight text-navy sm:text-4xl">
                {t("home.method.title")}
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
              {t("home.method.subtitle")}
            </p>
          </div>
        </Reveal>

        <div className="relative mt-14">
          {/* Linha que costura os 7 nós: só no desktop, onde eles ficam lado a lado. */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-4 hidden h-px bg-gradient-to-r from-border via-border to-transparent lg:block"
          />
          <ol className="relative grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 lg:grid-cols-7">
            {METHOD_STEPS.map((n, i) => (
              <li key={n}>
                <Reveal delay={i * 60}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white font-display text-sm tabular-nums text-gold-700">
                    {n}
                  </span>
                  <p className="mt-4 text-sm font-medium leading-snug text-navy">
                    {t(`methodologyPage.steps.${n}.title`)}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <Reveal>
          <Link
            to="/metodologia"
            className="mt-12 inline-flex items-center gap-1.5 text-sm font-medium text-navy underline decoration-gold decoration-2 underline-offset-4 transition-colors duration-200 hover:text-gold-700"
          >
            {t("home.method.cta")}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Fundadora */

function Fundadora() {
  const { t } = useTranslation("site");

  return (
    <section className="bg-cream-200">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-x-14 gap-y-12 px-6 py-24 lg:grid-cols-12 lg:py-28">
        <Reveal className="lg:col-span-5">
          <div className="relative mx-auto max-w-xs lg:max-w-none">
            <div
              aria-hidden
              className="absolute -left-4 -top-4 h-full w-full rounded-xl border border-gold/40"
            />
            <img
              src="/equipe/natalia-luz.jpg"
              alt={t("home.about.photoAlt")}
              width={800}
              height={800}
              loading="lazy"
              className="relative aspect-[4/5] w-full rounded-xl object-cover object-top shadow-subtle"
            />
          </div>
        </Reveal>

        <Reveal delay={100} className="lg:col-span-7">
          <Quote className="h-7 w-7 text-gold" aria-hidden />
          <blockquote className="mt-5 font-display text-2xl font-medium leading-snug text-navy sm:text-[1.75rem]">
            {t("home.about.quote")}
          </blockquote>
          <div className="mt-6 flex items-baseline gap-2">
            <p className="font-medium text-navy">{t("home.about.name")}</p>
            <span aria-hidden className="h-px w-5 bg-gold" />
            <p className="text-sm text-ink-muted">{t("home.about.role")}</p>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">
            {t("home.about.bio")}
          </p>
          <Link to="/quem-somos" className="mt-7 inline-block">
            <Button variant="secondary">{t("home.about.cta")}</Button>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Depoimentos */

function Depoimentos({ depoimentos }: { depoimentos: Depoimento[] }) {
  const { t } = useTranslation("site");

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-28">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("home.testimonials.eyebrow")}
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-medium leading-tight text-navy sm:text-4xl">
            {t("home.testimonials.title")}
          </h2>
          <p className="mt-3 max-w-md text-ink-soft">{t("home.testimonials.subtitle")}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {depoimentos.map((d, i) => {
            const featured = i === 0;
            return (
              <Reveal
                key={d.id}
                delay={i * 90}
                className={featured ? "lg:col-span-6" : "lg:col-span-3"}
              >
                <Card
                  className={
                    featured
                      ? "flex h-full flex-col gap-5 border-navy-800 bg-navy p-7"
                      : "flex h-full flex-col gap-4"
                  }
                >
                  <Quote
                    className={featured ? "h-6 w-6 text-gold" : "h-5 w-5 text-gold-400"}
                    aria-hidden
                  />
                  <p
                    className={
                      featured
                        ? "flex-1 font-display text-xl leading-relaxed text-white"
                        : "flex-1 text-sm leading-relaxed text-ink-soft"
                    }
                  >
                    {d.texto}
                  </p>
                  <div
                    className={
                      featured ? "border-t border-white/10 pt-4" : "border-t border-border pt-3.5"
                    }
                  >
                    <p
                      className={
                        featured
                          ? "text-sm font-medium text-white"
                          : "text-sm font-medium text-navy"
                      }
                    >
                      {d.nomeCliente}
                    </p>
                    <p className={featured ? "text-xs text-white/50" : "text-xs text-ink-muted"}>
                      {d.tipoVisto}
                    </p>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ CTA final */

function CtaFinal() {
  const { t } = useTranslation("site");

  return (
    <section className="relative isolate overflow-hidden bg-navy-950">
      <div aria-hidden className="absolute inset-0" style={DOT_GRID} />
      <div
        aria-hidden
        className="absolute left-1/2 top-full h-96 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-24 text-center lg:py-28">
        <Reveal>
          <h2 className="font-display text-3xl font-medium leading-tight text-white sm:text-4xl">
            {t("home.cta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/60">{t("home.cta.subtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/contatos">
              <Button variant="gold" size="lg">
                {t("home.cta.button")}
              </Button>
            </Link>
            <Link to="/metodologia">
              <Button
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10 active:bg-white/15"
              >
                {t("home.cta.secondary")}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/40">{t("home.cta.note")}</p>
        </Reveal>
      </div>
    </section>
  );
}
