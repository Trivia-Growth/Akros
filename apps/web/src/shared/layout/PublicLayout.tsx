import { DemoBar } from "@/features/demo/interfaces/DemoBar";
import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", key: "home" as const, end: true },
  { to: "/quem-somos", key: "about" as const },
  { to: "/servicos", key: "services" as const },
  { to: "/metodologia", key: "methodology" as const },
  { to: "/vistos", key: "visas" as const },
  { to: "/blog", key: "blog" as const },
  { to: "/contatos", key: "contact" as const },
];

export function PublicLayout() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <NavLink to="/" className="flex items-center gap-2">
            <img src="/logo-akros.png" alt={t("app.name")} className="h-9 w-9 rounded-full" />
            <span className="font-display text-lg font-semibold text-navy">{t("app.name")}</span>
          </NavLink>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "text-sm font-medium transition-colors duration-150",
                    isActive ? "text-navy" : "text-ink-soft hover:text-navy",
                  )
                }
              >
                {t(`nav.${item.key}`)}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <LanguageSwitcher />
            <NavLink to="/portal">
              <Button size="sm" variant="secondary">
                {t("nav.portal")}
              </Button>
            </NavLink>
            <NavLink to="/contatos">
              <Button size="sm" variant="gold">
                {t("actions.scheduleCall")}
              </Button>
            </NavLink>
          </div>

          <button
            type="button"
            className="p-2 text-navy lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav
            className="flex flex-col gap-1 border-t border-border bg-white px-6 py-4 lg:hidden"
            aria-label="Navegação principal (mobile)"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium",
                    isActive ? "bg-navy-50 text-navy" : "text-ink-soft hover:bg-cream-200",
                  )
                }
              >
                {t(`nav.${item.key}`)}
              </NavLink>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <LanguageSwitcher />
              <NavLink to="/portal" onClick={() => setMenuOpen(false)}>
                <Button size="sm" variant="secondary">
                  {t("nav.portal")}
                </Button>
              </NavLink>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-navy">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-white">
              {t("app.name")} <span className="text-gold">{t("app.tagline")}</span>
            </p>
            <p className="mt-1 text-sm text-white/50">akrosimmigration.com</p>
          </div>
          <div className="flex flex-col gap-1 text-sm text-white/70">
            <a href="mailto:hello@akrosimmigration.com" className="hover:text-gold">
              hello@akrosimmigration.com
            </a>
            <a href="tel:+14697589773" className="hover:text-gold">
              +1 (469) 758-9773
            </a>
          </div>
          <div className="flex flex-col gap-1 text-sm text-white/50">
            <span>
              © {new Date().getFullYear()} {t("app.name")}. {t("footer.rights")}
            </span>
            <div className="flex gap-4">
              <a href="/privacidade" className="hover:text-gold">
                {t("footer.privacy")}
              </a>
              <a href="/termos" className="hover:text-gold">
                {t("footer.terms")}
              </a>
            </div>
          </div>
        </div>
      </footer>

      <DemoBar />
    </div>
  );
}
