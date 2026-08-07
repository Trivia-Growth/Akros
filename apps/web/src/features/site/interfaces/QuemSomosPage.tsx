import { Button, Card, Reveal } from "@/shared/ui";
import { HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const VALUE_ICONS = [ShieldCheck, Users, HeartHandshake] as const;
const VALUE_KEYS = ["transparency", "professionalism", "closeness"] as const;

const TEAM = [
  { key: "natalia", photo: "/equipe/natalia-luz-portrait.png" },
  { key: "denise", photo: "/equipe/denise-sarchiapone.jpg" },
  { key: "bruno", photo: "/equipe/bruno-luz.jpg" },
  { key: "elem", photo: "/equipe/elem-tluczek.jpg" },
] as const;

export function QuemSomosPage() {
  const { t } = useTranslation("site");

  return (
    <div>
      {/* Abertura */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
          <Reveal>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-label text-gold-700">
              <span aria-hidden className="h-px w-8 bg-gold/50" />
              {t("aboutPage.eyebrow")}
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-[2.5rem] font-medium leading-[1.1] text-navy sm:text-5xl">
              {t("aboutPage.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              {t("aboutPage.intro")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Time */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
            {t("aboutPage.teamEyebrow")}
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-medium leading-tight text-navy sm:text-4xl">
            {t("aboutPage.teamTitle")}
          </h2>
          <p className="mt-3 max-w-lg text-ink-soft">{t("aboutPage.teamSubtitle")}</p>
        </Reveal>

        <ul className="mt-14 flex flex-col gap-16">
          {TEAM.map(({ key, photo }, i) => (
            <li key={key}>
              <Reveal delay={i * 60}>
                <div
                  className={`grid grid-cols-1 items-start gap-x-12 gap-y-6 sm:grid-cols-12 ${
                    i % 2 === 1 ? "sm:[&>figure]:order-2" : ""
                  }`}
                >
                  <figure className="relative sm:col-span-4">
                    <div
                      aria-hidden
                      className={`absolute h-full w-full rounded-xl border border-gold/35 ${
                        i % 2 === 1 ? "-right-3 -top-3" : "-bottom-3 -left-3"
                      }`}
                    />
                    <img
                      src={photo}
                      alt={t("aboutPage.photoAlt", { name: t(`aboutPage.team.${key}.name`) })}
                      width={500}
                      height={625}
                      loading="lazy"
                      className="relative aspect-[4/5] w-full rounded-xl object-cover object-top shadow-subtle"
                    />
                  </figure>

                  <div className="sm:col-span-8">
                    <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
                      {t(`aboutPage.team.${key}.role`)}
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-medium text-navy">
                      {t(`aboutPage.team.${key}.name`)}
                    </h3>
                    <span aria-hidden className="mt-4 block h-px w-10 bg-gold" />
                    <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
                      {t(`aboutPage.team.${key}.bio`)}
                    </p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* Valores */}
      <section className="bg-cream-200">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
          <Reveal>
            <h2 className="font-display text-3xl font-medium text-navy">
              {t("aboutPage.values.title")}
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {VALUE_KEYS.map((key, i) => {
              const Icon = VALUE_ICONS[i];
              return (
                <Reveal key={key} delay={i * 80}>
                  <Card className="flex h-full flex-col gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gold-50 text-gold-700">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="font-medium text-navy">{t(`aboutPage.values.${key}.title`)}</h3>
                    <p className="text-sm leading-relaxed text-ink-soft">
                      {t(`aboutPage.values.${key}.description`)}
                    </p>
                  </Card>
                </Reveal>
              );
            })}
          </div>

          <Reveal>
            <Link to="/contatos" className="mt-12 inline-block">
              <Button size="lg">{t("aboutPage.cta")}</Button>
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
