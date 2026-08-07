import { Button, Reveal } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const PASSOS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export function MetodologiaPage() {
  const { t } = useTranslation("site");

  return (
    <div>
      <section className="bg-navy-950">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-12 lg:py-24">
          <Reveal className="lg:col-span-7">
            <span className="text-xs font-semibold uppercase tracking-label text-gold">
              {t("methodologyPage.eyebrow")}
            </span>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-tight text-white sm:text-5xl">
              {t("methodologyPage.title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/65">
              {t("methodologyPage.subtitle")}
            </p>
            <p className="mt-8 max-w-xl border-l border-gold pl-4 text-sm leading-relaxed text-white/60">
              {t("methodologyPage.journeyNote")}
            </p>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-5">
            <img
              src="/akros-methodology.png"
              alt={t("methodologyPage.imageAlt")}
              width={1122}
              height={1402}
              loading="lazy"
              className="mx-auto aspect-[4/5] w-full max-w-sm rounded-2xl object-cover shadow-2xl ring-1 ring-white/15"
            />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 lg:py-24">
        <ol className="flex flex-col">
          {PASSOS.map((num, idx) => (
            <li key={num} className="relative flex gap-5 pb-10 last:pb-0">
              {idx < PASSOS.length - 1 && (
                <div aria-hidden className="absolute left-[19px] top-10 h-full w-px bg-border" />
              )}
              <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-navy text-sm font-semibold text-white shadow-subtle">
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
      </section>
    </div>
  );
}
