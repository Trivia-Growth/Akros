import { logout } from "@/features/sessao/application/hooks";
import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { isDemoMode } from "@/shared/lib/env";
import { NotificationCenter } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageSquare,
  User,
  Wallet,
  X,
} from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/portal", icon: LayoutDashboard, label: "Visão geral", end: true },
  { to: "/portal/jornada", icon: MapIcon, label: "Minha jornada" },
  { to: "/portal/documentos", icon: FileText, label: "Documentos" },
  { to: "/portal/pagamentos", icon: Wallet, label: "Pagamentos" },
  { to: "/portal/mensagens", icon: MessageSquare, label: "Mensagens" },
  { to: "/portal/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/portal/perfil", icon: User, label: "Meu perfil" },
];

const PortalDemoNotifications = lazy(() => import("./PortalDemoNotifications"));
const PortalDemoIdentity = lazy(() => import("./PortalDemoIdentity"));
const DemoBar = lazy(() =>
  import("@/features/demo/interfaces/DemoBar").then((modulo) => ({ default: modulo.DemoBar })),
);

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
          <span className="font-display text-base font-semibold text-white">{t("app.name")}</span>
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
      <p className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/70">
        Sua jornada
      </p>
      <nav className="mt-3 flex flex-1 flex-col gap-1" aria-label="Navegação do portal">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/12 text-white shadow-subtle ring-1 ring-white/10"
                  : "text-white/60 hover:bg-white/8 hover:text-white",
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

export function PortalLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 bg-cream-200">
        <aside className="hidden w-64 shrink-0 flex-col bg-navy px-4 py-6 lg:flex">
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
            <aside className="relative flex h-full w-64 flex-col bg-navy px-4 py-6">
              <SidebarContent
                onNavigate={() => setMenuOpen(false)}
                onClose={() => setMenuOpen(false)}
              />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[4.5rem] items-center justify-between border-b border-border bg-white/95 px-5 backdrop-blur-sm lg:px-8">
            <button
              type="button"
              className="p-2 text-navy lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {isDemoMode ? (
              <Suspense fallback={null}>
                <PortalDemoIdentity />
              </Suspense>
            ) : (
              <div className="hidden lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-label text-gold-700">
                  Portal Akros
                </p>
                <p className="mt-0.5 text-sm font-medium text-navy">Portal do Cliente</p>
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher />
              {isDemoMode ? (
                <Suspense fallback={<NotificationCenter items={[]} />}>
                  <PortalDemoNotifications />
                </Suspense>
              ) : (
                <NotificationCenter items={[]} />
              )}
              {!isDemoMode && (
                <button
                  type="button"
                  onClick={() => logout().then(() => navigate("/login"))}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-ink-muted hover:bg-cream-200 hover:text-navy"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Sair
                </button>
              )}
            </div>
          </header>
          <main className="workspace-main flex-1 px-5 py-7 lg:px-8 lg:py-9">
            <Outlet />
          </main>
        </div>
      </div>

      {isDemoMode && (
        <Suspense fallback={null}>
          <DemoBar />
        </Suspense>
      )}
    </div>
  );
}
