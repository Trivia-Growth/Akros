import { cn } from "@/shared/ui/utils/cn";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "./config";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "light" | "dark";
}

export function LanguageSwitcher({ className, variant = "light" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "pt-BR") as SupportedLanguage;

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={t("language.switch")}
    >
      <Globe
        className={cn("h-3.5 w-3.5", variant === "dark" ? "text-white/50" : "text-ink-muted")}
        aria-hidden
      />
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          aria-current={current === lng ? "true" : undefined}
          className={cn(
            "rounded px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
            current === lng
              ? variant === "dark"
                ? "text-gold"
                : "text-navy"
              : variant === "dark"
                ? "text-white/40 hover:text-white/70"
                : "text-ink-muted hover:text-ink",
          )}
        >
          {lng === "pt-BR" ? "PT" : "EN"}
        </button>
      ))}
    </div>
  );
}
