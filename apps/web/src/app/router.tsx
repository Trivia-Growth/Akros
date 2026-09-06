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
          isDemoMode
            ? import("@/features/jornada/interfaces/DashboardPage").then((m) => ({
                default: m.DashboardPage,
              }))
            : import("@/features/jornada/interfaces/DashboardRealPage").then((m) => ({
                default: m.DashboardRealPage,
              })),
        ),
      },
      {
        path: "jornada",
        element: rota(portal, () =>
          isDemoMode
            ? import("@/features/jornada/interfaces/JornadaPage").then((m) => ({
                default: m.JornadaPage,
              }))
            : import("@/features/jornada/interfaces/JornadaRealPage").then((m) => ({
                default: m.JornadaRealPage,
              })),
        ),
      },
      {
        path: "documentos",
        element: rota(portal, () =>
          isDemoMode
            ? import("@/features/documentos/interfaces/DocumentosPage").then((m) => ({
                default: m.DocumentosPage,
              }))
            : import("@/features/documentos/interfaces/DocumentosRealPage").then((m) => ({
                default: m.DocumentosRealPage,
              })),
        ),
      },
      {
        path: "pagamentos",
        element: rota(portal, () =>
          isDemoMode
            ? import("@/features/pagamentos/interfaces/PagamentosPage").then((m) => ({
                default: m.PagamentosPage,
              }))
            : import("@/features/pagamentos/interfaces/PagamentosRealPage").then((m) => ({
                default: m.PagamentosRealPage,
              })),
        ),
      },
      {
        path: "mensagens",
        element: rota(portal, () =>
          isDemoMode
            ? import("@/features/comunicacao/interfaces/MensagensPage").then((m) => ({
                default: m.MensagensPage,
              }))
            : import("@/features/comunicacao/interfaces/MensagensRealPage").then((m) => ({
                default: m.MensagensRealPage,
              })),
        ),
      },
      {
        path: "agenda",
        element: rota(portal, () =>
          isDemoMode
            ? import("@/features/agenda/interfaces/AgendaPage").then((m) => ({
                default: m.AgendaPage,
              }))
            : import("@/features/agenda/interfaces/AgendaRealPage").then((m) => ({
                default: m.AgendaRealPage,
              })),
        ),
      },
      {
        path: "perfil",
        element: rota(portal, () =>
          isDemoMode
            ? import("@/features/crm/interfaces/PerfilPage").then((m) => ({
                default: m.PerfilPage,
              }))
            : import("@/features/crm/interfaces/PerfilRealPage").then((m) => ({
                default: m.PerfilRealPage,
              })),
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
          isDemoMode
            ? import("@/features/crm/interfaces/AdminDashboardPage").then((m) => ({
                default: m.AdminDashboardPage,
              }))
            : import("@/features/crm/interfaces/AdminDashboardRealPage").then((m) => ({
                default: m.AdminDashboardRealPage,
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
          isDemoMode
            ? import("@/features/crm/interfaces/Clientes360Page").then((m) => ({
                default: m.Clientes360Page,
              }))
            : import("@/features/crm/interfaces/Clientes360RealPage").then((m) => ({
                default: m.Clientes360RealPage,
              })),
        ),
      },
      {
        path: "documentos",
        element: rota(admin, () =>
          isDemoMode
            ? import("@/features/documentos/interfaces/FilaRevisaoPage").then((m) => ({
                default: m.FilaRevisaoPage,
              }))
            : import("@/features/documentos/interfaces/FilaRevisaoRealPage").then((m) => ({
                default: m.FilaRevisaoRealPage,
              })),
        ),
      },
      {
        path: "propostas",
        element: rota(admin, () =>
          isDemoMode
            ? import("@/features/crm/interfaces/PropostasPage").then((m) => ({
                default: m.PropostasPage,
              }))
            : import("@/features/crm/interfaces/PropostasRealPage").then((m) => ({
                default: m.PropostasRealPage,
              })),
        ),
      },
      {
        path: "propostas/:id",
        element: rota(admin, () =>
          isDemoMode
            ? import("@/features/crm/interfaces/PropostaDocumentoPage").then((m) => ({
                default: m.PropostaDocumentoPage,
              }))
            : import("@/features/crm/interfaces/PropostaDocumentoRealPage").then((m) => ({
                default: m.PropostaDocumentoRealPage,
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
          isDemoMode
            ? import("@/features/jornada/interfaces/OperacaoPage").then((m) => ({
                default: m.OperacaoPage,
              }))
            : import("@/features/jornada/interfaces/OperacaoRealPage").then((m) => ({
                default: m.OperacaoRealPage,
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
          isDemoMode
            ? import("@/features/comunicacao/interfaces/ComunicacaoPage").then((m) => ({
                default: m.ComunicacaoPage,
              }))
            : import("@/features/comunicacao/interfaces/ComunicacaoRealPage").then((m) => ({
                default: m.ComunicacaoRealPage,
              })),
        ),
      },
      {
        path: "agenda",
        element: rota(admin, () =>
          isDemoMode
            ? import("@/features/agenda/interfaces/AdminAgendaPage").then((m) => ({
                default: m.AdminAgendaPage,
              }))
            : import("@/features/agenda/interfaces/AdminAgendaRealPage").then((m) => ({
                default: m.AdminAgendaRealPage,
              })),
        ),
      },
      {
        path: "configuracoes",
        element: rota(admin, () =>
          isDemoMode
            ? import("@/features/configuracoes/interfaces/ConfiguracoesPage").then((m) => ({
                default: m.ConfiguracoesPage,
              }))
            : import("@/features/configuracoes/interfaces/ConfiguracoesRealPage").then((m) => ({
                default: m.ConfiguracoesRealPage,
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
