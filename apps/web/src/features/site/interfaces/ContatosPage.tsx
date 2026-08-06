import { Calendar, Mail, MessageCircle, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LeadForm } from "./LeadForm";

export function ContatosPage() {
  const { t } = useTranslation("site");

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10 max-w-xl">
        <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("contact.eyebrow")}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy sm:text-4xl">
          {t("contact.title")}
        </h1>
        <p className="mt-3 text-ink-soft">{t("contact.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          <ContactChannel
            icon={Mail}
            label={t("contact.channels.email")}
            value="hello@akrosimmigration.com"
            href="mailto:hello@akrosimmigration.com"
          />
          <ContactChannel
            icon={Phone}
            label={t("contact.channels.phone")}
            value="+1 (469) 758-9773"
            href="tel:+14697589773"
          />
          <ContactChannel
            icon={MessageCircle}
            label={t("contact.channels.whatsapp")}
            value="+1 (689) 322-4429"
            href="https://wa.me/16893224429"
            external
          />
          <ContactChannel
            icon={Calendar}
            label={t("contact.channels.schedule")}
            value="calendly.com/nataliaakrosimmigration"
            href="https://calendly.com/nataliaakrosimmigration/reuniao-de-atendimento-service-meeting"
            external
          />
        </div>

        <LeadForm />
      </div>
    </div>
  );
}

interface ContactChannelProps {
  icon: typeof Mail;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

function ContactChannel({ icon: Icon, label, value, href, external }: ContactChannelProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex items-start gap-3 rounded-lg border border-border bg-white p-4 transition-colors duration-150 hover:border-gold-300 hover:bg-gold-50/30"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="text-sm font-medium text-navy">{value}</p>
      </div>
    </a>
  );
}
