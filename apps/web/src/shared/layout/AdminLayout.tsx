import { DemoBar } from "@/features/demo/interfaces/DemoBar";
import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { cn } from "@/shared/ui/utils/cn";
import {
  CalendarClock,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  MessageCircle,
  ScrollText,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/leads", icon: KanbanSquare, label: "Leads (Kanban)" },
  { to: "/admin/clientes", icon: Users, label: "Clientes" },
  { to: "/admin/propostas", icon: ScrollText, label: "Propostas" },
  { to: "/admin/comunicacao", icon: MessageCircle, label: "Comunicação" },
  { to: "/admin/agenda", icon: CalendarClock, label: "Agenda" },
];

function SidebarContent({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center justify-between px-2 py-1">
        <NavLink to="/" className="flex items-center gap-2">
          <img src="/logo-akros.png" alt={t("app.name")} className="h-8 w-8 rounded-full" />
          <span className="font-display text-base font-semibold text-white">
            {t("app.name")} <span className="text-gold">Admin</span>
          </span>
        </NavLink>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="p-1 text-white/60 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Navegação do admin">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
              )
            }
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <NavLink
        to="/"
        className="mt-auto rounded-md px-3 py-2 text-xs text-white/40 hover:text-white/70"
      >
        ← Voltar ao site
      </NavLink>
    </>
  );
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 bg-cream-200">
        <aside className="hidden w-64 shrink-0 flex-col bg-navy-950 px-4 py-6 lg:flex">
          <SidebarContent />
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 bg-navy-950/50"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="relative flex h-full w-64 flex-col bg-navy-950 px-4 py-6">
              <SidebarContent
                onNavigate={() => setMenuOpen(false)}
                onClose={() => setMenuOpen(false)}
              />
            </aside>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
            <button
              type="button"
              className="p-2 text-navy lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden text-sm font-medium text-ink-soft lg:block">Painel Admin</span>
            <LanguageSwitcher />
          </header>
          <main className="flex-1 px-6 py-8">
            <Outlet />
          </main>
        </div>
      </div>

      <DemoBar />
    </div>
  );
}
