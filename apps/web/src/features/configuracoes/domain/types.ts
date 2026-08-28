export type CategoriaIntegracao = "mensageria" | "automacao" | "pagamentos" | "crm" | "transcricao";

/** Credenciais da Meta Graph API (Instagram Direct). Segredos nunca são devolvidos em claro. */
export interface CredenciaisMeta {
  appId: string;
  appSecretConfigurado: boolean;
  appSecretFinal?: string;
  accessTokenConfigurado: boolean;
  accessTokenFinal?: string;
  webhookVerifyToken: string;
  contaInstagramId: string;
}

/** Configuração pública da integração. Segredos nunca são devolvidos ao front-end. */
export interface IntegracaoExterna {
  id: string;
  nome: string;
  fornecedor: string;
  categoria: CategoriaIntegracao;
  descricao: string;
  ativa: boolean;
  segredoConfigurado: boolean;
  segredoFinal?: string;
  atualizadoEm?: string;
  credenciaisMeta?: CredenciaisMeta;
}

/** Time interno da Akros — dono e destinatários de compartilhamento de conta conectada (E04-S12). */
export interface UsuarioAkros {
  id: string;
  nome: string;
  cargo: string;
  avatarUrl?: string;
}

export type ProvedorAgenda = "google" | "microsoft" | "calendly";

export interface CredenciaisGoogleCalendar {
  clientId: string;
  clientSecretConfigurado: boolean;
  clientSecretFinal?: string;
  refreshTokenConfigurado: boolean;
  refreshTokenFinal?: string;
  calendarId: string;
}

export interface CredenciaisMicrosoftCalendar {
  clientId: string;
  clientSecretConfigurado: boolean;
  clientSecretFinal?: string;
  tenantId: string;
  refreshTokenConfigurado: boolean;
  refreshTokenFinal?: string;
}

/** Campos conforme developer.calendly.com/getting-started (Personal Access Token). */
export interface CredenciaisCalendly {
  personalAccessTokenConfigurado: boolean;
  personalAccessTokenFinal?: string;
  organizationUri: string;
  eventTypeUri: string;
}

export type CredenciaisContaAgenda =
  | { provedor: "google"; dados: CredenciaisGoogleCalendar }
  | { provedor: "microsoft"; dados: CredenciaisMicrosoftCalendar }
  | { provedor: "calendly"; dados: CredenciaisCalendly };

/**
 * Escopo que a conta Google/Microsoft conectada autoriza. Um único login cobre mais de um —
 * o OAuth real do Google/Microsoft concede Agenda + E-mail + Arquivos na mesma concessão
 * (E04-S12). Calendly só participa de "agenda" (não tem e-mail nem Drive/OneDrive).
 */
export type EscopoConta = "agenda" | "email" | "arquivos";

/** Conta Google/Microsoft/Calendly conectada — várias contas por provedor são permitidas (ADR-0007). */
export interface ContaConectada {
  id: string;
  provedor: ProvedorAgenda;
  nomeExibicao: string;
  ativa: boolean;
  conectadoEm: string;
  credenciais: CredenciaisContaAgenda;
  /** O que esta conta autoriza. Controla em quais telas ela aparece (agenda/e-mail/arquivos). */
  escopos: EscopoConta[];
  /** Dono da conta — só ele vê por padrão; ver `compartilhadoComIds`. */
  donoId: string;
  /** Endereço de e-mail — presente quando `escopos` inclui "email". */
  emailEndereco?: string;
  /** Ids de UsuarioAkros com quem o dono compartilhou a caixa (ex.: faleconosco@ visível pra 3 pessoas). */
  compartilhadoComIds?: string[];
  /** Pasta raiz no OneDrive/Drive — presente quando `escopos` inclui "arquivos". */
  pastaRaiz?: string;
}

/** Tipo local, não importa de `comunicacao` — mesmo desacoplamento de `CredenciaisMeta`. */
export type ProvedorCanal = "whatsapp_oficial" | "evolution" | "instagram";

/** Conta de canal conectada (WhatsApp/Instagram) — várias contas por provedor, como e-mail (E04-S11). */
export interface ContaCanalConectada {
  id: string;
  provedor: ProvedorCanal;
  nomeExibicao: string;
  /** Número de telefone ou @handle. */
  identificador: string;
  ativa: boolean;
  conectadoEm: string;
}
