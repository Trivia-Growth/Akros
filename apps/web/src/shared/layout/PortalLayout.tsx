import { useDemoSession } from "@/features/demo/application/useDemoSession";
import { DemoBar } from "@/features/demo/interfaces/DemoBar";
import { useMockDb } from "@/mocks/store";
import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { Avatar, NotificationCenter } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  MessageSquare,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/portal", icon: LayoutDashboard, label: "Visão geral", end: true },
  { to: "/portal/jornada", icon: MapIcon, label: "Minha jornada" },
  { to: "/portal/documentos", icon: FileText, label: "Documentos" },
  { to: "/portal/pagamentos", icon: Wallet, label: "Pagamentos" },
  { to: "/portal/mensagens", icon: MessageSquare, label: "Mensagens" },
  { to: "/portal/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/portal/perfil", icon: User, label: "Meu perfil" },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const personaId = useDemoSession((s) => s.personaId);
  const clientes = useMockDb((s) => s.clientes);
  const documentos = useMockDb((s) => s.documentos);
  const pagamentos = useMockDb((s) => s.pagamentos);
  const reunioes = useMockDb((s) => s.reunioes);
  const eventos = useMockDb((s) => s.eventosComunicacao);
  const clienteAtivo = clientes.find((c) => c.id === personaId);
  const notificacoes = clienteAtivo
    ? [
        ...documentos
          .filter(
            (doc) =>
              doc.clienteId === clienteAtivo.id && ["pendente", "ajustes"].includes(doc.status),
          )
          .slice(0, 2)
          .map((doc) => ({
            id: `documento-${doc.id}`,
            title:
              doc.status === "ajustes"
                ? "Documento precisa de ajuste"
                : "Documento aguardando envio",
            description: doc.nome,
            href: "/portal/documentos",
            tone: doc.status === "ajustes" ? ("danger" as const) : ("gold" as const),
          })),
        ...pagamentos
          .filter(
            (pagamento) => pagamento.clienteId === clienteAtivo.id && pagamento.status !== "pago",
          )
          .slice(0, 1)
          .map((pagamento) => ({
            id: `pagamento-${pagamento.id}`,
            title: pagamento.status === "atrasado" ? "Pagamento em atraso" : "Pagamento pendente",
            description: pagamento.descricao,
            href: "/portal/pagamentos",
            tone: pagamento.status === "atrasado" ? ("danger" as const) : ("gold" as const),
          })),
        ...reunioes
          .filter(
            (reuniao) => reuniao.clienteId === clienteAtivo.id && reuniao.status === "agendada",
          )
          .slice(0, 1)
          .map((reuniao) => ({
            id: `reuniao-${reuniao.id}`,
            title: "Próxima reunião agendada",
            description: new Date(reuniao.inicio).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            }),
            href: "/portal/agenda",
            tone: "navy" as const,
          })),
        ...eventos
          .filter(
            (evento) =>
              evento.clienteOuLeadId === clienteAtivo.id &&
              evento.canal === "sistema" &&
              evento.conteudo.includes("liberada"),
          )
          .slice(-1)
          .map((evento) => ({
            id: `jornada-${evento.id}`,
            title: "Nova fase liberada",
            description: "Sua jornada avançou. Veja as novas orientações e atividades.",
            href: "/portal/jornada",
            tone: "gold" as const,
          })),
      ]
    : [];

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
            <div className="hidden lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-label text-gold-700">
                Portal Akros
              </p>
              <p className="mt-0.5 text-sm font-medium text-navy">
                {clienteAtivo ? `Olá, ${clienteAtivo.nome.split(" ")[0]}` : "Portal do Cliente"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher />
              <NotificationCenter items={notificacoes} />
              {clienteAtivo && (
                <Avatar
                  name={clienteAtivo.nome}
                  size="sm"
                  className="hidden ring-2 ring-gold-100 sm:flex"
                />
              )}
            </div>
          </header>
          <main className="workspace-main flex-1 px-5 py-7 lg:px-8 lg:py-9">
            <Outlet />
          </main>
        </div>
      </div>

      <DemoBar />
    </div>
  );
}
