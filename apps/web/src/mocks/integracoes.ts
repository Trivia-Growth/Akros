import type { IntegracaoExterna } from "@/features/configuracoes/domain/types";

export const integracoes: IntegracaoExterna[] = [
  {
    id: "whatsapp-cloud",
    nome: "WhatsApp Business",
    fornecedor: "Meta Cloud API",
    categoria: "mensageria",
    descricao: "Receba conversas e permita que agentes respondam pelo WhatsApp.",
    ativa: true,
    segredoConfigurado: true,
    segredoFinal: "9K2F",
    atualizadoEm: "2026-08-05T14:30:00-03:00",
  },
  {
    id: "instagram",
    nome: "Instagram Direct",
    fornecedor: "Meta Graph API",
    categoria: "mensageria",
    descricao: "Centralize mensagens do Instagram na mesma fila da operação.",
    ativa: false,
    segredoConfigurado: false,
  },
  {
    id: "stripe",
    nome: "Cobranças online",
    fornecedor: "Stripe",
    categoria: "pagamentos",
    descricao: "Sincronize cobranças e confirmações de pagamento automaticamente.",
    ativa: false,
    segredoConfigurado: false,
  },
  {
    id: "hubspot",
    nome: "CRM externo",
    fornecedor: "HubSpot",
    categoria: "crm",
    descricao: "Envie leads e atualizações de estágio para um CRM conectado.",
    ativa: false,
    segredoConfigurado: false,
  },
];
