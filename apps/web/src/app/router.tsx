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
      { index: true, element: <Placeholder title="Início" story="E01-S01" /> },
      { path: "quem-somos", element: <Placeholder title="Quem Somos" story="E01-S02" /> },
      { path: "servicos", element: <Placeholder title="Outros Serviços" story="E01-S05" /> },
      { path: "metodologia", element: <Placeholder title="Metodologia" story="E01-S04" /> },
      { path: "vistos", element: <Placeholder title="Vistos" story="E01-S03" /> },
      { path: "blog", element: <Placeholder title="Blog" story="E01-S06" /> },
      { path: "blog/:slug", element: <Placeholder title="Artigo" story="E01-S06" /> },
      { path: "contatos", element: <Placeholder title="Contatos" story="E01-S07" /> },
    ],
  },
  {
    path: "/portal",
    element: <PortalLayout />,
    children: [
      { index: true, element: <Placeholder title="Visão geral" story="E02-S01" /> },
      { path: "jornada", element: <Placeholder title="Minha jornada" story="E02-S02" /> },
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
