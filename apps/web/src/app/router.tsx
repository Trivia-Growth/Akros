import { AgendaPage } from "@/features/agenda/interfaces/AgendaPage";
import { AdminDashboardPage } from "@/features/crm/interfaces/AdminDashboardPage";
import { Clientes360Page } from "@/features/crm/interfaces/Clientes360Page";
import { KanbanPage } from "@/features/crm/interfaces/KanbanPage";
import { PerfilPage } from "@/features/crm/interfaces/PerfilPage";
import { PropostasPage } from "@/features/crm/interfaces/PropostasPage";
import { DocumentosPage } from "@/features/documentos/interfaces/DocumentosPage";
import { DashboardPage } from "@/features/jornada/interfaces/DashboardPage";
import { JornadaPage } from "@/features/jornada/interfaces/JornadaPage";
import { PagamentosPage } from "@/features/pagamentos/interfaces/PagamentosPage";
import { BlogPage } from "@/features/site/interfaces/BlogPage";
import { BlogPostPage } from "@/features/site/interfaces/BlogPostPage";
import { ContatosPage } from "@/features/site/interfaces/ContatosPage";
import { HomePage } from "@/features/site/interfaces/HomePage";
import { MetodologiaPage } from "@/features/site/interfaces/MetodologiaPage";
import { QuemSomosPage } from "@/features/site/interfaces/QuemSomosPage";
import { ServicosPage } from "@/features/site/interfaces/ServicosPage";
import { VistosPage } from "@/features/site/interfaces/VistosPage";
import { AdminLayout } from "@/shared/layout/AdminLayout";
import { Placeholder } from "@/shared/layout/Placeholder";
import { PortalLayout } from "@/shared/layout/PortalLayout";
import { PublicLayout } from "@/shared/layout/PublicLayout";
import { UiShowcase } from "@/shared/ui/UiShowcase";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "quem-somos", element: <QuemSomosPage /> },
      { path: "servicos", element: <ServicosPage /> },
      { path: "metodologia", element: <MetodologiaPage /> },
      { path: "vistos", element: <VistosPage /> },
      { path: "blog", element: <BlogPage /> },
      { path: "blog/:slug", element: <BlogPostPage /> },
      { path: "contatos", element: <ContatosPage /> },
    ],
  },
  {
    path: "/portal",
    element: <PortalLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "jornada", element: <JornadaPage /> },
      { path: "documentos", element: <DocumentosPage /> },
      { path: "pagamentos", element: <PagamentosPage /> },
      { path: "agenda", element: <AgendaPage /> },
      { path: "perfil", element: <PerfilPage /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "leads", element: <KanbanPage /> },
      { path: "clientes", element: <Clientes360Page /> },
      { path: "propostas", element: <PropostasPage /> },
      { path: "comunicacao", element: <Placeholder title="Comunicação" story="E04-S01" /> },
    ],
  },
  {
    path: "/dev/ui",
    element: <UiShowcase />,
  },
]);
