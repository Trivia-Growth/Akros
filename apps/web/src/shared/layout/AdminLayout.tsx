import { DemoBar } from "@/features/demo/interfaces/DemoBar";
import { useMockDb } from "@/mocks/store";
import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { NotificationCenter } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import {
  Activity,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  MessageCircle,
  RotateCcw,
  ScrollText,
  Settings2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/leads", icon: KanbanSquare, label: "Leads (Kanban)" },
  { to: "/admin/aprovacoes", icon: CheckCircle2, label: "Aprovações" },
  { to: "/admin/clientes", icon: Users, label: "Clientes" },
  { to: "/admin/documentos", icon: FileSearch, label: "Revisão de documentos" },
  { to: "/admin/propostas", icon: ScrollText, label: "Propostas" },
  { to: "/admin/pagamentos", icon: Wallet, label: "Conciliação" },
  { to: "/admin/programas", icon: BookOpen, label: "Programas" },
  { to: "/admin/operacao", icon: Activity, label: "Operação" },
  { to: "/admin/reativacao", icon: RotateCcw, label: "Reativação" },
  { to: "/admin/comunicacao", icon: MessageCircle, label: "Comunicação" },
  { to: "/admin/agenda", icon: CalendarClock, label: "Agenda" },
  { to: "/admin/configuracoes", icon: Settings2, label: "Configurações" },
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
      <p className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/70">
        Operação
      </p>
      <nav className="mt-3 flex flex-1 flex-col gap-1" aria-label="Navegação do admin">
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

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const leads = useMockDb((s) => s.leads);
  const documentos = useMockDb((s) => s.documentos);
  const pagamentos = useMockDb((s) => s.pagamentos);
  const notificacoes = [
    ...leads
      .filter((lead) => lead.gateAgendamento?.status === "pendente")
      .slice(0, 2)
      .map((lead) => ({
        id: `gate-${lead.id}`,
        title: "Aprovação de agenda pendente",
        description: lead.nome,
        href: "/admin/aprovacoes",
        tone: "gold" as const,
      })),
    ...documentos
      .filter((documento) => documento.status === "em_analise")
      .slice(0, 2)
      .map((documento) => ({
        id: `revisao-${documento.id}`,
        title: "Documento aguardando revisão",
        description: documento.nome,
        href: "/admin/documentos",
        tone: "navy" as const,
      })),
    ...pagamentos
      .filter((pagamento) =>
        ["em_conferencia", "divergente", "atrasado"].includes(pagamento.status),
      )
      .slice(0, 1)
      .map((pagamento) => ({
        id: `financeiro-${pagamento.id}`,
        title:
          pagamento.status === "divergente" ? "Pagamento com divergência" : "Conciliação pendente",
        description: pagamento.descricao,
        href: "/admin/pagamentos",
        tone: pagamento.status === "divergente" ? ("danger" as const) : ("gold" as const),
      })),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 bg-cream-200 print:bg-white">
        <aside className="hidden w-64 shrink-0 flex-col bg-navy-950 px-4 py-6 lg:flex print:hidden">
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

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[4.5rem] items-center justify-between border-b border-border bg-white/95 px-5 backdrop-blur-sm lg:px-8 print:hidden">
            <button
              type="button"
              className="p-2 text-navy lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-label text-gold-700">
                Akros OS
              </p>
              <p className="mt-0.5 text-sm font-medium text-navy">Visão operacional</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher />
              <NotificationCenter items={notificacoes} label="Fila de atenção" />
            </div>
          </header>
          <main className="workspace-main flex-1 px-5 py-7 lg:px-8 lg:py-9 print:p-0">
            <Outlet />
          </main>
        </div>
      </div>

      <DemoBar />
    </div>
  );
}
