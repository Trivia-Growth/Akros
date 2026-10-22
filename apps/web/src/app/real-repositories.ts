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
  CasoComandos,
  Cliente360AdminConsulta,
  ClienteRepository,
  DashboardAdminConsulta,
  ParticipantesConsulta,
  PerfilClienteConsulta,
} from "@/features/crm/application/ports";
import type { PropostasConsulta } from "@/features/crm/application/ports";
import { SupabaseCasoComandos } from "@/features/crm/infrastructure/SupabaseCasoComandos";
import { SupabaseCliente360AdminConsulta } from "@/features/crm/infrastructure/SupabaseCliente360AdminConsulta";
import { SupabaseClienteRepository } from "@/features/crm/infrastructure/SupabaseClienteRepository";
import { SupabaseDashboardAdminConsulta } from "@/features/crm/infrastructure/SupabaseDashboardAdminConsulta";
import { SupabaseParticipantesConsulta } from "@/features/crm/infrastructure/SupabaseParticipantesConsulta";
import { SupabasePerfilClienteConsulta } from "@/features/crm/infrastructure/SupabasePerfilClienteConsulta";
import { SupabasePropostasConsulta } from "@/features/crm/infrastructure/SupabasePropostasConsulta";
import type {
  DocumentosAdminConsulta,
  DocumentosConsulta,
  EnvioArquivoPort,
  EnvioDocumentoComandos,
  VersoesConsulta,
} from "@/features/documentos/application/ports";
import { SupabaseDocumentosAdminConsulta } from "@/features/documentos/infrastructure/SupabaseDocumentosAdminConsulta";
import { SupabaseDocumentosConsulta } from "@/features/documentos/infrastructure/SupabaseDocumentosConsulta";
import { SupabaseEnvioComandos } from "@/features/documentos/infrastructure/SupabaseEnvioComandos";
import { SupabaseVersoesConsulta } from "@/features/documentos/infrastructure/SupabaseVersoesConsulta";
import type { JornadaConsulta, OperacaoAdminConsulta } from "@/features/jornada/application/ports";
import { SupabaseJornadaConsulta } from "@/features/jornada/infrastructure/SupabaseJornadaConsulta";
import { SupabaseOperacaoAdminConsulta } from "@/features/jornada/infrastructure/SupabaseOperacaoAdminConsulta";
import type { PagamentosConsulta } from "@/features/pagamentos/application/ports";
import { SupabasePagamentosConsulta } from "@/features/pagamentos/infrastructure/SupabasePagamentosConsulta";
import type {
  ProgramaRepository,
  RequisitoDocumentoRepository,
} from "@/features/programas/application/ports";
import { SupabaseProgramaRepository } from "@/features/programas/infrastructure/SupabaseProgramaRepository";
import { isDemoMode } from "@/shared/lib/env";
import { enviarArquivoAoBucket } from "@/shared/supabase/envio-tus";

let clientesReais: ClienteRepository | undefined;
let clientesDemo: ClienteRepository | undefined;
let programasReais: ProgramaRepository | undefined;
let programasDemo: ProgramaRepository | undefined;
let requisitosReais: RequisitoDocumentoRepository | undefined;
let requisitosDemo: RequisitoDocumentoRepository | undefined;
let configuracoesReais: ConfiguracoesConsulta | undefined;
let agendaReal: AgendaConsulta | undefined;
let jornadaReal: JornadaConsulta | undefined;
let documentosReal: DocumentosConsulta | undefined;
let documentosAdminReal: DocumentosAdminConsulta | undefined;
let envioDocumentoReal: EnvioDocumentoComandos | undefined;
let versoesDocumentoReal: VersoesConsulta | undefined;
let envioArquivoReal: EnvioArquivoPort | undefined;
let pagamentosReal: PagamentosConsulta | undefined;
let comunicacaoReal: ComunicacaoConsulta | undefined;
let comunicacaoAdminReal: ComunicacaoAdminConsulta | undefined;
let propostasReal: PropostasConsulta | undefined;
let dashboardAdminReal: DashboardAdminConsulta | undefined;
let operacaoAdminReal: OperacaoAdminConsulta | undefined;
let cliente360AdminReal: Cliente360AdminConsulta | undefined;
let perfilClienteReal: PerfilClienteConsulta | undefined;
let casoComandosReal: CasoComandos | undefined;
let participantesReal: ParticipantesConsulta | undefined;

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

export function obterComandosEnvioDocumento(): EnvioDocumentoComandos {
  if (!envioDocumentoReal) envioDocumentoReal = new SupabaseEnvioComandos();
  return envioDocumentoReal;
}

export function obterConsultaVersoesDocumento(): VersoesConsulta {
  if (!versoesDocumentoReal) versoesDocumentoReal = new SupabaseVersoesConsulta();
  return versoesDocumentoReal;
}

export function obterEnvioArquivoReal(): EnvioArquivoPort {
  if (!envioArquivoReal) {
    envioArquivoReal = {
      async enviar(input) {
        await enviarArquivoAoBucket(input).promessa;
      },
    };
  }
  return envioArquivoReal;
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

/** E03-S07 (T039) — comandos de contrato/preparo de caso contra a Edge Function `caso-comandos`
 *  (T031-035, já aprovados). Sem variante Mock: como `sessao` em `di.ts`, este comando é real
 *  desde o dia 1 (não há o que "demonstrar" registrando contrato fictício fora do Postgres). */
export function obterCasoComandosReal(): CasoComandos {
  if (!casoComandosReal) casoComandosReal = new SupabaseCasoComandos();
  return casoComandosReal;
}

/** E03-S07 (T049) — leitura de participantes do caso (`ParticipantesPainel.tsx`), mesmo critério
 *  de lazy singleton das demais consultas reais acima: sem variante Mock (ler participante
 *  fictício fora do Postgres não teria RLS nenhuma pra provar). */
export function obterConsultaParticipantesReal(): ParticipantesConsulta {
  if (!participantesReal) participantesReal = new SupabaseParticipantesConsulta();
  return participantesReal;
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

/** E06-S05/ADR-0013 — escrita de RequisitoDocumento. Fora do demo grava no `programas` real
 * (UPDATE admin, 0015); no demo, no useMockDb. */
export async function obterRepositorioRequisitos(): Promise<RequisitoDocumentoRepository> {
  if (!isDemoMode) {
    if (!requisitosReais) {
      const { SupabaseRequisitoDocumentoRepository } = await import(
        "@/features/programas/infrastructure/SupabaseRequisitoDocumentoRepository"
      );
      requisitosReais = new SupabaseRequisitoDocumentoRepository();
    }
    return requisitosReais;
  }

  const { MockRequisitoDocumentoRepository } = await import(
    "@/features/programas/infrastructure/MockRequisitoDocumentoRepository"
  );
  if (!requisitosDemo) requisitosDemo = new MockRequisitoDocumentoRepository();
  return requisitosDemo;
}
