/**
 * Container de injeção de dependência (ADR-0002).
 * Nesta fase, todas as portas resolvem para adapters Mock. Migração futura para Supabase =
 * trocar a implementação aqui, sem tocar em UI/use cases.
 *
 * Regra: a UI NUNCA importa Mock-Repository diretamente — sempre via `container` ou hooks
 * que o consomem (ver application/hooks de cada feature, quando existirem).
 *
 * SPEC_DEVIATION (E15-S01, AC-4): este arquivo importa TODOS os adapters de forma estática, o que
 * arrasta `src/mocks/` inteiro (~3.900 linhas de fixture) e o `@supabase/supabase-js` para o chunk
 * de entrada — carregados mesmo numa sessão que só visita o site institucional. O AC-4 pede que
 * nada de uma frente entre numa sessão que não a visita; o código das PÁGINAS já cumpre isso
 * (cada rota é seu próprio chunk), mas a camada de dado não.
 *
 * Não foi resolvido aqui de propósito: separar exigiria tornar o container assíncrono, que é
 * mudança de arquitetura (toda porta passaria a resolver por Promise) e não é o problema desta
 * story — E15-S01 é sobre CONTENÇÃO DE FALHA, não sobre dieta de bundle. Fecha naturalmente em
 * E13-S09+, quando os adapters mock forem substituídos pelos reais e `src/mocks/` encolher.
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
import { SupabaseProgramaRepository } from "@/features/programas/infrastructure/SupabaseProgramaRepository";
import { sessaoService } from "@/features/sessao/infrastructure/EdgeFunctionSessaoService";
import { MockConteudoRepository } from "@/features/site/infrastructure/MockConteudoRepository";
import { MockLeadRepository } from "@/shared/contracts/MockLeadRepository";
import { SupabaseLeadRepository } from "@/shared/contracts/SupabaseLeadRepository";
import { isDemoMode } from "@/shared/lib/env";

const mockLeads = new MockLeadRepository();

export const container = {
  configuracoes: new MockConfiguracoesRepository(),
  // E13-S09: `SupabaseLeadRepository` existe e está provado contra o banco real, mas continua
  // DESLIGADO de propósito. `KanbanPage` LÊ de `useMockDb((s) => s.leads)` e ESCREVE por
  // `container.leads` — ligar aqui sem migrar a tela produz estado partido: escrita vai para o
  // Supabase, leitura volta do mock, e os ids nem batem (`lead-001` × uuid). Verificado em
  // browser real em 2026-08-31: o kanban seguiu mostrando os 12 leads mockados.
  //
  // Liga junto com a migração da tela (E13-S09, ondas 1–3). Ver a nota em tasks.md.
  leads: mockLeads,
  /**
   * Escrita pública é separada da gestão do kanban. Em modo real, `/contatos` chama a Edge
   * Function protegida por validação + rate limit; em demo, preserva o fluxo inteiro no Zustand.
   * Esta separação evita ligar leituras/escritas admin pela metade.
   */
  capturaLeads: isDemoMode ? mockLeads : new SupabaseLeadRepository(),
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
  // E13-S11 onda-folha: ProgramasPage usa hook real junto desta troca; nenhum leitor da página
  // permanece no Zustand fora do demo. A métrica de casos já consulta clientes reais (E13-S08).
  programas: isDemoMode ? new MockProgramaRepository() : new SupabaseProgramaRepository(),
  timeline: new MockTimelineRepository(),
  analiseDocumento: new MockAnalisadorDocumento(),
  /** E12-S02: sem variante Mock (autenticação é real desde o dia 1) — mas ainda passa pelo
   * container, porque a regra de dependência (interfaces → application → domain ← infrastructure)
   * vale igual: `application/` nunca importa `infrastructure/` direto. */
  sessao: sessaoService,
} as const;

export type Container = typeof container;
