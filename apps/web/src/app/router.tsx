import { AdminAgendaPage } from "@/features/agenda/interfaces/AdminAgendaPage";
import { AgendaPage } from "@/features/agenda/interfaces/AgendaPage";
import { ComunicacaoPage } from "@/features/comunicacao/interfaces/ComunicacaoPage";
import { MensagensPage } from "@/features/comunicacao/interfaces/MensagensPage";
import { ConfiguracoesPage } from "@/features/configuracoes/interfaces/ConfiguracoesPage";
import { AdminDashboardPage } from "@/features/crm/interfaces/AdminDashboardPage";
import { AprovacoesPage } from "@/features/crm/interfaces/AprovacoesPage";
import { Clientes360Page } from "@/features/crm/interfaces/Clientes360Page";
import { KanbanPage } from "@/features/crm/interfaces/KanbanPage";
import { PerfilPage } from "@/features/crm/interfaces/PerfilPage";
import { PropostaDocumentoPage } from "@/features/crm/interfaces/PropostaDocumentoPage";
import { PropostasPage } from "@/features/crm/interfaces/PropostasPage";
import { ReativacaoPage } from "@/features/crm/interfaces/ReativacaoPage";
import { DocumentosPage } from "@/features/documentos/interfaces/DocumentosPage";
import { FilaRevisaoPage } from "@/features/documentos/interfaces/FilaRevisaoPage";
import { DashboardPage } from "@/features/jornada/interfaces/DashboardPage";
import { JornadaPage } from "@/features/jornada/interfaces/JornadaPage";
import { OperacaoPage } from "@/features/jornada/interfaces/OperacaoPage";
import { ConciliacaoPage } from "@/features/pagamentos/interfaces/ConciliacaoPage";
import { PagamentosPage } from "@/features/pagamentos/interfaces/PagamentosPage";
import { ProgramasPage } from "@/features/programas/interfaces/ProgramasPage";
import { LoginPage } from "@/features/sessao/interfaces/LoginPage";
import { RequireRole } from "@/features/sessao/interfaces/RequireRole";
import { BlogPage } from "@/features/site/interfaces/BlogPage";
import { BlogPostPage } from "@/features/site/interfaces/BlogPostPage";
import { ContatosPage } from "@/features/site/interfaces/ContatosPage";
import { HomePage } from "@/features/site/interfaces/HomePage";
import { MetodologiaPage } from "@/features/site/interfaces/MetodologiaPage";
import { QuemSomosPage } from "@/features/site/interfaces/QuemSomosPage";
import { ServicosPage } from "@/features/site/interfaces/ServicosPage";
import { VistosPage } from "@/features/site/interfaces/VistosPage";
import { AdminLayout } from "@/shared/layout/AdminLayout";
import { PortalLayout } from "@/shared/layout/PortalLayout";
import { PublicLayout } from "@/shared/layout/PublicLayout";
import { isDemoMode } from "@/shared/lib/env";
import { UiShowcase } from "@/shared/ui/UiShowcase";
import { createBrowserRouter } from "react-router-dom";

/**
 * E12-S02: fora do modo demo, `/portal` e `/admin` exigem sessão real do papel correspondente.
 * Em modo demo (padrão — ver `shared/lib/env.ts`), zero guarda: comportamento igual ao de sempre.
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
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/portal",
    element: portalElement,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "jornada", element: <JornadaPage /> },
      { path: "documentos", element: <DocumentosPage /> },
      { path: "pagamentos", element: <PagamentosPage /> },
      { path: "mensagens", element: <MensagensPage /> },
      { path: "agenda", element: <AgendaPage /> },
      { path: "perfil", element: <PerfilPage /> },
    ],
  },
  {
    path: "/admin",
    element: adminElement,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "leads", element: <KanbanPage /> },
      { path: "aprovacoes", element: <AprovacoesPage /> },
      { path: "clientes", element: <Clientes360Page /> },
      { path: "documentos", element: <FilaRevisaoPage /> },
      { path: "propostas", element: <PropostasPage /> },
      { path: "propostas/:id", element: <PropostaDocumentoPage /> },
      { path: "pagamentos", element: <ConciliacaoPage /> },
      { path: "programas", element: <ProgramasPage /> },
      { path: "operacao", element: <OperacaoPage /> },
      { path: "reativacao", element: <ReativacaoPage /> },
      { path: "comunicacao", element: <ComunicacaoPage /> },
      { path: "agenda", element: <AdminAgendaPage /> },
      { path: "configuracoes", element: <ConfiguracoesPage /> },
    ],
  },
  {
    path: "/dev/ui",
    element: <UiShowcase />,
  },
]);
