/**
 * Composição preguiçosa das portas já migradas. Uma rota real não pode importar `di.ts`: ele
 * mantém mocks das ondas ainda não entregues. O caminho demo só carrega sua implementação quando
 * for efetivamente executado.
 */
import type { AgendaConsulta } from "@/features/agenda/application/ports";
import { SupabaseAgendaConsulta } from "@/features/agenda/infrastructure/SupabaseAgendaConsulta";
import type {
  ComunicacaoAdminConsulta,
  ComunicacaoConsulta,
} from "@/features/comunicacao/application/ports";
import { SupabaseComunicacaoAdminConsulta } from "@/features/comunicacao/infrastructure/SupabaseComunicacaoAdminConsulta";
import { SupabaseComunicacaoConsulta } from "@/features/comunicacao/infrastructure/SupabaseComunicacaoConsulta";
import type { ConfiguracoesConsulta } from "@/features/configuracoes/application/ports";
import { SupabaseConfiguracoesConsulta } from "@/features/configuracoes/infrastructure/SupabaseConfiguracoesConsulta";
import type {
  Cliente360AdminConsulta,
  ClienteRepository,
  DashboardAdminConsulta,
  PerfilClienteConsulta,
} from "@/features/crm/application/ports";
import type { PropostasConsulta } from "@/features/crm/application/ports";
import { SupabaseCliente360AdminConsulta } from "@/features/crm/infrastructure/SupabaseCliente360AdminConsulta";
import { SupabaseClienteRepository } from "@/features/crm/infrastructure/SupabaseClienteRepository";
import { SupabaseDashboardAdminConsulta } from "@/features/crm/infrastructure/SupabaseDashboardAdminConsulta";
import { SupabasePerfilClienteConsulta } from "@/features/crm/infrastructure/SupabasePerfilClienteConsulta";
import { SupabasePropostasConsulta } from "@/features/crm/infrastructure/SupabasePropostasConsulta";
import type {
  DocumentosAdminConsulta,
  DocumentosConsulta,
} from "@/features/documentos/application/ports";
import { SupabaseDocumentosAdminConsulta } from "@/features/documentos/infrastructure/SupabaseDocumentosAdminConsulta";
import { SupabaseDocumentosConsulta } from "@/features/documentos/infrastructure/SupabaseDocumentosConsulta";
import type { JornadaConsulta, OperacaoAdminConsulta } from "@/features/jornada/application/ports";
import { SupabaseJornadaConsulta } from "@/features/jornada/infrastructure/SupabaseJornadaConsulta";
import { SupabaseOperacaoAdminConsulta } from "@/features/jornada/infrastructure/SupabaseOperacaoAdminConsulta";
import type { PagamentosConsulta } from "@/features/pagamentos/application/ports";
import { SupabasePagamentosConsulta } from "@/features/pagamentos/infrastructure/SupabasePagamentosConsulta";
import type { ProgramaRepository } from "@/features/programas/application/ports";
import { SupabaseProgramaRepository } from "@/features/programas/infrastructure/SupabaseProgramaRepository";
import { isDemoMode } from "@/shared/lib/env";

let clientesReais: ClienteRepository | undefined;
let clientesDemo: ClienteRepository | undefined;
let programasReais: ProgramaRepository | undefined;
let programasDemo: ProgramaRepository | undefined;
let configuracoesReais: ConfiguracoesConsulta | undefined;
let agendaReal: AgendaConsulta | undefined;
let jornadaReal: JornadaConsulta | undefined;
let documentosReal: DocumentosConsulta | undefined;
let documentosAdminReal: DocumentosAdminConsulta | undefined;
let pagamentosReal: PagamentosConsulta | undefined;
let comunicacaoReal: ComunicacaoConsulta | undefined;
let comunicacaoAdminReal: ComunicacaoAdminConsulta | undefined;
let propostasReal: PropostasConsulta | undefined;
let dashboardAdminReal: DashboardAdminConsulta | undefined;
let operacaoAdminReal: OperacaoAdminConsulta | undefined;
let cliente360AdminReal: Cliente360AdminConsulta | undefined;
let perfilClienteReal: PerfilClienteConsulta | undefined;

export function obterConsultaAgendaReal(): AgendaConsulta {
  if (!agendaReal) agendaReal = new SupabaseAgendaConsulta();
  return agendaReal;
}

export function obterConsultaConfiguracoesReais(): ConfiguracoesConsulta {
  if (!configuracoesReais) configuracoesReais = new SupabaseConfiguracoesConsulta();
  return configuracoesReais;
}

export function obterConsultaJornadaReal(): JornadaConsulta {
  if (!jornadaReal) jornadaReal = new SupabaseJornadaConsulta();
  return jornadaReal;
}

export function obterConsultaDocumentosReal(): DocumentosConsulta {
  if (!documentosReal) documentosReal = new SupabaseDocumentosConsulta();
  return documentosReal;
}

export function obterConsultaDocumentosAdminReal(): DocumentosAdminConsulta {
  if (!documentosAdminReal) documentosAdminReal = new SupabaseDocumentosAdminConsulta();
  return documentosAdminReal;
}

export function obterConsultaPagamentosReal(): PagamentosConsulta {
  if (!pagamentosReal) pagamentosReal = new SupabasePagamentosConsulta();
  return pagamentosReal;
}

export function obterConsultaComunicacaoReal(): ComunicacaoConsulta {
  if (!comunicacaoReal) comunicacaoReal = new SupabaseComunicacaoConsulta();
  return comunicacaoReal;
}

export function obterConsultaComunicacaoAdminReal(): ComunicacaoAdminConsulta {
  if (!comunicacaoAdminReal) comunicacaoAdminReal = new SupabaseComunicacaoAdminConsulta();
  return comunicacaoAdminReal;
}

export function obterConsultaPropostasReal(): PropostasConsulta {
  if (!propostasReal) propostasReal = new SupabasePropostasConsulta();
  return propostasReal;
}

export function obterConsultaDashboardAdminReal(): DashboardAdminConsulta {
  if (!dashboardAdminReal) dashboardAdminReal = new SupabaseDashboardAdminConsulta();
  return dashboardAdminReal;
}

export function obterConsultaOperacaoAdminReal(): OperacaoAdminConsulta {
  if (!operacaoAdminReal) operacaoAdminReal = new SupabaseOperacaoAdminConsulta();
  return operacaoAdminReal;
}

export function obterConsultaCliente360AdminReal(): Cliente360AdminConsulta {
  if (!cliente360AdminReal) cliente360AdminReal = new SupabaseCliente360AdminConsulta();
  return cliente360AdminReal;
}

export function obterConsultaPerfilClienteReal(): PerfilClienteConsulta {
  if (!perfilClienteReal) perfilClienteReal = new SupabasePerfilClienteConsulta();
  return perfilClienteReal;
}

export async function obterRepositorioClientes(): Promise<ClienteRepository> {
  if (!isDemoMode) {
    if (!clientesReais) clientesReais = new SupabaseClienteRepository();
    return clientesReais;
  }

  const { MockClienteRepository } = await import(
    "@/features/crm/infrastructure/MockClienteRepository"
  );
  if (!clientesDemo) clientesDemo = new MockClienteRepository();
  return clientesDemo;
}

export async function obterRepositorioProgramas(): Promise<ProgramaRepository> {
  if (!isDemoMode) {
    if (!programasReais) programasReais = new SupabaseProgramaRepository();
    return programasReais;
  }

  const { MockProgramaRepository } = await import(
    "@/features/programas/infrastructure/MockProgramaRepository"
  );
  if (!programasDemo) programasDemo = new MockProgramaRepository();
  return programasDemo;
}
