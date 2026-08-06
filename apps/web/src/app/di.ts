/**
 * Container de injeção de dependência (ADR-0002).
 * Nesta fase, todas as portas resolvem para adapters Mock. Migração futura para Supabase =
 * trocar a implementação aqui, sem tocar em UI/use cases.
 *
 * Regra: a UI NUNCA importa Mock-Repository diretamente — sempre via `container` ou hooks
 * que o consomem (ver application/hooks de cada feature, quando existirem).
 */
import {
  MockAgendaRepository,
  MockTranscricaoRepository,
} from "@/features/agenda/infrastructure/MockAgendaRepository";
import {
  MockAgenteService,
  MockConversaRepository,
} from "@/features/comunicacao/infrastructure/MockConversaRepository";
import { MockClienteRepository } from "@/features/crm/infrastructure/MockClienteRepository";
import { MockPropostaRepository } from "@/features/crm/infrastructure/MockPropostaRepository";
import {
  MockAssinaturaService,
  MockDocumentoRepository,
} from "@/features/documentos/infrastructure/MockDocumentoRepository";
import {
  MockJornadaRepository,
  MockProgressoRepository,
} from "@/features/jornada/infrastructure/MockJornadaRepository";
import { MockPagamentoRepository } from "@/features/pagamentos/infrastructure/MockPagamentoRepository";
import { MockConteudoRepository } from "@/features/site/infrastructure/MockConteudoRepository";
import { MockLeadRepository } from "@/shared/contracts/MockLeadRepository";

export const container = {
  leads: new MockLeadRepository(),
  clientes: new MockClienteRepository(),
  propostas: new MockPropostaRepository(),
  jornada: new MockJornadaRepository(),
  progresso: new MockProgressoRepository(),
  documentos: new MockDocumentoRepository(),
  assinatura: new MockAssinaturaService(),
  pagamentos: new MockPagamentoRepository(),
  agenda: new MockAgendaRepository(),
  transcricoes: new MockTranscricaoRepository(),
  conversas: new MockConversaRepository(),
  agenteIA: new MockAgenteService(),
  conteudo: new MockConteudoRepository(),
} as const;

export type Container = typeof container;
