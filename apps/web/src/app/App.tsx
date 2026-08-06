import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { UiShowcase } from "@/shared/ui/UiShowcase";
import { useTranslation } from "react-i18next";

export function App() {
  const { t } = useTranslation();

  if (window.location.pathname === "/dev/ui") {
    return <UiShowcase />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <LanguageSwitcher className="absolute right-6 top-6" />
      <img
        src="/logo-akros.png"
        alt={`${t("app.name")} ${t("app.tagline")}`}
        className="h-24 w-24 rounded-full"
      />
      <h1 className="text-3xl font-semibold text-navy">
        {t("app.name")} {t("app.tagline")}
      </h1>
      <p className="max-w-md text-ink-soft">
        Scaffold em andamento — dados mockados e rotas chegam nas próximas stories (E00-S04 e
        E00-S05). Design system disponível em <code>/dev/ui</code>.
      </p>
    </div>
  );
}
