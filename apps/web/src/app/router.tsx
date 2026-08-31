import { RequireRole } from "@/features/sessao/interfaces/RequireRole";
import { AdminLayout } from "@/shared/layout/AdminLayout";
import { PortalLayout } from "@/shared/layout/PortalLayout";
import { PublicLayout } from "@/shared/layout/PublicLayout";
import { isDemoMode } from "@/shared/lib/env";
import { createBrowserRouter } from "react-router-dom";
import { admin, portal, rota, site } from "./rota";

/**
 * E12-S02: fora do modo demo, `/portal` e `/admin` exigem sessão real do papel correspondente.
 * Em modo demo (padrão — ver `shared/lib/env.ts`), zero guarda: comportamento igual ao de sempre.
 *
 * E15-S01: cada rota é carregada por `rota()` — chunk próprio, retry no `import()` e
 * `ErrorBoundary` **abaixo** do shell. O layout e o `RequireRole` continuam sendo import
 * estático: são o esqueleto que precisa sobreviver à queda do conteúdo, então não podem estar
 * no mesmo chunk que cai.
 */
const portalElement = isDemoMode ? (
  <PortalLayout />
) : (
  <RequireRole papel="cliente">
    <PortalLayout />
  </RequireRole>
);
const adminElement = isDemoMode ? (
  <AdminLayout />
) : (
  <RequireRole papel="admin">
    <AdminLayout />
  </RequireRole>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: rota(site, () =>
          import("@/features/site/interfaces/HomePage").then((m) => ({ default: m.HomePage })),
        ),
      },
      {
        path: "quem-somos",
        element: rota(site, () =>
          import("@/features/site/interfaces/QuemSomosPage").then((m) => ({
            default: m.QuemSomosPage,
          })),
        ),
      },
      {
        path: "servicos",
        element: rota(site, () =>
          import("@/features/site/interfaces/ServicosPage").then((m) => ({
            default: m.ServicosPage,
          })),
        ),
      },
      {
        path: "metodologia",
        element: rota(site, () =>
          import("@/features/site/interfaces/MetodologiaPage").then((m) => ({
            default: m.MetodologiaPage,
          })),
        ),
      },
      {
        path: "vistos",
        element: rota(site, () =>
          import("@/features/site/interfaces/VistosPage").then((m) => ({ default: m.VistosPage })),
        ),
      },
      {
        path: "blog",
        element: rota(site, () =>
          import("@/features/site/interfaces/BlogPage").then((m) => ({ default: m.BlogPage })),
        ),
      },
      {
        path: "blog/:slug",
        element: rota(site, () =>
          import("@/features/site/interfaces/BlogPostPage").then((m) => ({
            default: m.BlogPostPage,
          })),
        ),
      },
      {
        path: "contatos",
        element: rota(site, () =>
          import("@/features/site/interfaces/ContatosPage").then((m) => ({
            default: m.ContatosPage,
          })),
        ),
      },
    ],
  },
  {
    path: "/login",
    element: rota(site, () =>
      import("@/features/sessao/interfaces/LoginPage").then((m) => ({ default: m.LoginPage })),
    ),
  },
  {
    path: "/portal",
    element: portalElement,
    children: [
      {
        index: true,
        element: rota(portal, () =>
          import("@/features/jornada/interfaces/DashboardPage").then((m) => ({
            default: m.DashboardPage,
          })),
        ),
      },
      {
        path: "jornada",
        element: rota(portal, () =>
          import("@/features/jornada/interfaces/JornadaPage").then((m) => ({
            default: m.JornadaPage,
          })),
        ),
      },
      {
        path: "documentos",
        element: rota(portal, () =>
          import("@/features/documentos/interfaces/DocumentosPage").then((m) => ({
            default: m.DocumentosPage,
          })),
        ),
      },
      {
        path: "pagamentos",
        element: rota(portal, () =>
          import("@/features/pagamentos/interfaces/PagamentosPage").then((m) => ({
            default: m.PagamentosPage,
          })),
        ),
      },
      {
        path: "mensagens",
        element: rota(portal, () =>
          import("@/features/comunicacao/interfaces/MensagensPage").then((m) => ({
            default: m.MensagensPage,
          })),
        ),
      },
      {
        path: "agenda",
        element: rota(portal, () =>
          import("@/features/agenda/interfaces/AgendaPage").then((m) => ({
            default: m.AgendaPage,
          })),
        ),
      },
      {
        path: "perfil",
        element: rota(portal, () =>
          import("@/features/crm/interfaces/PerfilPage").then((m) => ({ default: m.PerfilPage })),
        ),
      },
    ],
  },
  {
    path: "/admin",
    element: adminElement,
    children: [
      {
        index: true,
        element: rota(admin, () =>
          import("@/features/crm/interfaces/AdminDashboardPage").then((m) => ({
            default: m.AdminDashboardPage,
          })),
        ),
      },
      {
        path: "leads",
        element: rota(admin, () =>
          import("@/features/crm/interfaces/KanbanPage").then((m) => ({ default: m.KanbanPage })),
        ),
      },
      {
        path: "aprovacoes",
        element: rota(admin, () =>
          import("@/features/crm/interfaces/AprovacoesPage").then((m) => ({
            default: m.AprovacoesPage,
          })),
        ),
      },
      {
        path: "clientes",
        element: rota(admin, () =>
          import("@/features/crm/interfaces/Clientes360Page").then((m) => ({
            default: m.Clientes360Page,
          })),
        ),
      },
      {
        path: "documentos",
        element: rota(admin, () =>
          import("@/features/documentos/interfaces/FilaRevisaoPage").then((m) => ({
            default: m.FilaRevisaoPage,
          })),
        ),
      },
      {
        path: "propostas",
        element: rota(admin, () =>
          import("@/features/crm/interfaces/PropostasPage").then((m) => ({
            default: m.PropostasPage,
          })),
        ),
      },
      {
        path: "propostas/:id",
        element: rota(admin, () =>
          import("@/features/crm/interfaces/PropostaDocumentoPage").then((m) => ({
            default: m.PropostaDocumentoPage,
          })),
        ),
      },
      {
        path: "pagamentos",
        element: rota(admin, () =>
          import("@/features/pagamentos/interfaces/ConciliacaoPage").then((m) => ({
            default: m.ConciliacaoPage,
          })),
        ),
      },
      {
        path: "programas",
        element: rota(admin, () =>
          import("@/features/programas/interfaces/ProgramasPage").then((m) => ({
            default: m.ProgramasPage,
          })),
        ),
      },
      {
        path: "operacao",
        element: rota(admin, () =>
          import("@/features/jornada/interfaces/OperacaoPage").then((m) => ({
            default: m.OperacaoPage,
          })),
        ),
      },
      {
        path: "reativacao",
        element: rota(admin, () =>
          import("@/features/crm/interfaces/ReativacaoPage").then((m) => ({
            default: m.ReativacaoPage,
          })),
        ),
      },
      {
        path: "comunicacao",
        element: rota(admin, () =>
          import("@/features/comunicacao/interfaces/ComunicacaoPage").then((m) => ({
            default: m.ComunicacaoPage,
          })),
        ),
      },
      {
        path: "agenda",
        element: rota(admin, () =>
          import("@/features/agenda/interfaces/AdminAgendaPage").then((m) => ({
            default: m.AdminAgendaPage,
          })),
        ),
      },
      {
        path: "configuracoes",
        element: rota(admin, () =>
          import("@/features/configuracoes/interfaces/ConfiguracoesPage").then((m) => ({
            default: m.ConfiguracoesPage,
          })),
        ),
      },
    ],
  },
  {
    path: "/dev/ui",
    element: rota(site, () =>
      import("@/shared/ui/UiShowcase").then((m) => ({ default: m.UiShowcase })),
    ),
  },
]);
