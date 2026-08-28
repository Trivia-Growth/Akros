export type SaudeCaso = "em_dia" | "atencao" | "atrasado";

export type EstadoCivil = "solteiro" | "casado" | "divorciado" | "viuvo" | "uniao_estavel";
export type ParentescoFamiliar = "conjuge" | "filho" | "filha" | "outro";

/** E02-S08 — dependente que pode entrar no processo como beneficiário derivado. */
export interface Familiar {
  id: string;
  nome: string;
  parentesco: ParentescoFamiliar;
  dataNascimento?: string;
  nacionalidade?: string;
  incluirNoProcesso: boolean;
}

/**
 * E02-S08 — dados que a petição em si exige (além de nome/e-mail/telefone de contato).
 * Só faz sentido para programas com `sujeito: "individuo"` — a UI decide se mostra a
 * seção de família consultando o programa do cliente, este tipo não sabe disso.
 */
export interface PerfilImigratorio {
  nomeCompletoLegal?: string;
  dataNascimento?: string;
  paisNascimento?: string;
  nacionalidade?: string;
  numeroPassaporte?: string;
  validadePassaporte?: string;
  estadoCivil?: EstadoCivil;
  enderecoAtual?: string;
  telefoneAlternativo?: string;
  familiares: Familiar[];
}

export interface Cliente {
  id: string;
  leadOrigemId?: string;
  nome: string;
  email: string;
  telefone: string;
  tipoVisto: string;
  caseManager: string;
  criadoEm: string;
  saude: SaudeCaso;
  /** E06-S03: programa que originou a jornada deste cliente. Versão congelada — ADR-0004. */
  programaId?: string;
  programaVersao?: string;
  /** E04-S13: nome da subpasta deste cliente dentro da pasta raiz do OneDrive/Drive corporativo. */
  pastaDriveNome?: string;
  /** E02-S08: dados pessoais e familiares que a petição exige — preenchidos pelo próprio cliente. */
  perfilImigratorio?: PerfilImigratorio;
}

// SPEC_DEVIATION (E08-S01): `Interacao`/`TipoInteracao` foram removidos — absorvidos por
// `EventoComunicacao` (features/comunicacao/domain/types.ts), ver ADR-0006.

export type PropostaStatus = "rascunho" | "enviada" | "aceita" | "recusada";

export interface Proposta {
  id: string;
  leadOuClienteId: string;
  escopo: string;
  itensEscopo: string[];
  tipoVisto: string;
  valor: number;
  moeda: "BRL" | "USD";
  condicoes: string;
  validoAte: string;
  status: PropostaStatus;
  criadoEm: string;
}
