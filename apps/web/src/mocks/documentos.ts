import type { Documento, SolicitacaoAssinatura } from "@/features/documentos/domain/types";

export const documentos: Documento[] = [
  // Carlos — Fase 1 em andamento
  {
    id: "doc-carlos-contrato",
    clienteId: "cliente-carlos",
    faseId: "fase-1",
    nome: "Contrato de Prestação de Serviços",
    tipo: "contrato",
    status: "aprovado",
    urlMock: "/mock-files/contrato-carlos.pdf",
    enviadoEm: "2026-06-02T10:30:00-03:00",
  },
  {
    id: "doc-carlos-curriculo",
    clienteId: "cliente-carlos",
    faseId: "fase-1",
    nome: "Currículo profissional",
    tipo: "curriculo",
    status: "em_analise",
    urlMock: "/mock-files/curriculo-carlos.pdf",
    enviadoEm: "2026-06-10T14:00:00-03:00",
  },
  {
    id: "doc-carlos-diploma",
    clienteId: "cliente-carlos",
    faseId: "fase-1",
    nome: "Diploma + histórico escolar",
    tipo: "formacao_academica",
    status: "pendente",
  },
  // Renata — Fase 2
  {
    id: "doc-renata-curriculo",
    clienteId: "cliente-renata",
    faseId: "fase-1",
    nome: "Currículo profissional",
    tipo: "curriculo",
    status: "aprovado",
    urlMock: "/mock-files/curriculo-renata.pdf",
    enviadoEm: "2026-04-20T09:00:00-03:00",
  },
  {
    id: "doc-renata-business-plan",
    clienteId: "cliente-renata",
    faseId: "fase-2",
    nome: "Business Plan — rascunho",
    tipo: "business_plan",
    status: "em_analise",
    urlMock: "/mock-files/business-plan-renata.pdf",
    enviadoEm: "2026-07-15T11:00:00-03:00",
  },
  {
    id: "doc-renata-cartas-recomendacao",
    clienteId: "cliente-renata",
    faseId: "fase-2",
    nome: "Cartas de recomendação (5)",
    tipo: "cartas_recomendacao",
    status: "pendente",
  },
  // Bruno — Fase 5
  {
    id: "doc-bruno-peticao",
    clienteId: "cliente-bruno",
    faseId: "fase-4",
    nome: "Petição EB-2 NIW completa",
    tipo: "peticao",
    status: "aprovado",
    urlMock: "/mock-files/peticao-bruno.pdf",
    enviadoEm: "2026-02-10T10:00:00-03:00",
  },
  {
    id: "doc-bruno-comprovante-envio",
    clienteId: "cliente-bruno",
    faseId: "fase-4",
    nome: "Comprovante de envio USCIS (rastreamento)",
    tipo: "comprovante",
    status: "aprovado",
    urlMock: "/mock-files/comprovante-bruno.pdf",
    enviadoEm: "2026-02-12T09:00:00-03:00",
  },
  // Fernanda — aprovado
  {
    id: "doc-fernanda-peticao",
    clienteId: "cliente-fernanda",
    faseId: "fase-4",
    nome: "Petição EB-2 NIW completa",
    tipo: "peticao",
    status: "aprovado",
    urlMock: "/mock-files/peticao-fernanda.pdf",
    enviadoEm: "2025-08-05T10:00:00-03:00",
  },
  {
    id: "doc-fernanda-notice",
    clienteId: "cliente-fernanda",
    faseId: "fase-5",
    nome: "Notice of Approval (I-140)",
    tipo: "aprovacao_uscis",
    status: "aprovado",
    urlMock: "/mock-files/aprovacao-fernanda.pdf",
    enviadoEm: "2026-03-18T10:00:00-03:00",
  },
];

export const solicitacoesAssinatura: SolicitacaoAssinatura[] = [
  {
    id: "assinatura-carlos-contrato",
    documentoId: "doc-carlos-contrato",
    status: "assinado",
    assinadoPor: "Carlos Mendes",
    assinadoEm: "2026-06-02T10:35:00-03:00",
  },
  {
    id: "assinatura-renata-cartas",
    documentoId: "doc-renata-cartas-recomendacao",
    status: "aguardando",
  },
];
