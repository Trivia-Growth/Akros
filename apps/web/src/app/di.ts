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
  MockBaseConhecimentoRepository,
  MockConversaRepository,
  MockEmailRepository,
  MockTimelineRepository,
} from "@/features/comunicacao/infrastructure/MockConversaRepository";
import { MockConfiguracoesRepository } from "@/features/configuracoes/infrastructure/MockConfiguracoesRepository";
import { MockClienteRepository } from "@/features/crm/infrastructure/MockClienteRepository";
import { MockPropostaRepository } from "@/features/crm/infrastructure/MockPropostaRepository";
import { SupabaseClienteRepository } from "@/features/crm/infrastructure/SupabaseClienteRepository";
import { MockAnalisadorDocumento } from "@/features/documentos/infrastructure/MockAnalisadorDocumento";
import {
  MockAssinaturaService,
  MockDocumentoRepository,
} from "@/features/documentos/infrastructure/MockDocumentoRepository";
import {
  MockJornadaRepository,
  MockProgressoRepository,
} from "@/features/jornada/infrastructure/MockJornadaRepository";
import { MockPagamentoRepository } from "@/features/pagamentos/infrastructure/MockPagamentoRepository";
import { MockProgramaRepository } from "@/features/programas/infrastructure/MockProgramaRepository";
import { sessaoService } from "@/features/sessao/infrastructure/EdgeFunctionSessaoService";
import { MockConteudoRepository } from "@/features/site/infrastructure/MockConteudoRepository";
import { MockLeadRepository } from "@/shared/contracts/MockLeadRepository";
import { isDemoMode } from "@/shared/lib/env";

export const container = {
  configuracoes: new MockConfiguracoesRepository(),
  leads: new MockLeadRepository(),
  /** E13-S08: primeira porta com adapter Supabase real, condicionado ao modo demo. Ver
   * design.md do E13-S08 pro porquê do escopo estreito (só `clientes` — as demais features
   * seguem mock até E13-S09). */
  clientes: isDemoMode ? new MockClienteRepository() : new SupabaseClienteRepository(),
  propostas: new MockPropostaRepository(),
  jornada: new MockJornadaRepository(),
  progresso: new MockProgressoRepository(),
  documentos: new MockDocumentoRepository(),
  assinatura: new MockAssinaturaService(),
  pagamentos: new MockPagamentoRepository(),
  agenda: new MockAgendaRepository(),
  transcricoes: new MockTranscricaoRepository(),
  conversas: new MockConversaRepository(),
  email: new MockEmailRepository(),
  baseConhecimento: new MockBaseConhecimentoRepository(),
  agenteIA: new MockAgenteService(),
  conteudo: new MockConteudoRepository(),
  programas: new MockProgramaRepository(),
  timeline: new MockTimelineRepository(),
  analiseDocumento: new MockAnalisadorDocumento(),
  /** E12-S02: sem variante Mock (autenticação é real desde o dia 1) — mas ainda passa pelo
   * container, porque a regra de dependência (interfaces → application → domain ← infrastructure)
   * vale igual: `application/` nunca importa `infrastructure/` direto. */
  sessao: sessaoService,
} as const;

export type Container = typeof container;
