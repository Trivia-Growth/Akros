import { DashboardPage } from "@/features/jornada/interfaces/DashboardPage";
import { JornadaPage } from "@/features/jornada/interfaces/JornadaPage";
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
      { path: "documentos", element: <Placeholder title="Documentos" story="E02-S03" /> },
      { path: "pagamentos", element: <Placeholder title="Pagamentos" story="E02-S05" /> },
      { path: "agenda", element: <Placeholder title="Agenda" story="E02-S06" /> },
      { path: "perfil", element: <Placeholder title="Meu perfil" story="E02-S07" /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Placeholder title="Dashboard" story="E03-S05" /> },
      { path: "leads", element: <Placeholder title="Leads (Kanban)" story="E03-S01" /> },
      { path: "clientes", element: <Placeholder title="Clientes" story="E03-S02" /> },
      { path: "propostas", element: <Placeholder title="Propostas" story="E03-S04" /> },
      { path: "comunicacao", element: <Placeholder title="Comunicação" story="E04-S01" /> },
    ],
  },
  {
    path: "/dev/ui",
    element: <UiShowcase />,
  },
]);
