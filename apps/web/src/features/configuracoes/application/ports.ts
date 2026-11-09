import type {
  AgenteIAIntegracao,
  ContaCanalConectada,
  ContaConectada,
  CredenciaisContaAgenda,
  IntegracaoExterna,
  IntegracaoOneDrive,
  ProvedorAgenda,
  ProvedorCanal,
  UsuarioAkros,
} from "../domain/types";

/** Leitura agregada da central; separada da porta mutável enquanto não há cofre de segredos. */
export interface ConfiguracoesConsulta {
  carregar(): Promise<{
    equipe: UsuarioAkros[];
    integracoes: IntegracaoExterna[];
    contasAgenda: ContaConectada[];
    contasCanal: ContaCanalConectada[];
    agentesIA: AgenteIAIntegracao[];
  }>;
}

/** E03-S07 Fase 5 (T058, ADR-0019) — leitura só de `arquivos.integracoes_microsoft`, separada
 *  da porta acima: schema/tabela diferentes, sem relação com `configuracoes.contas_agenda`
 *  (mock de E04-S12, provedor "microsoft" genérico de agenda/e-mail, NÃO é esta conexão). `null`
 *  quando nenhuma conta Microsoft jamais foi conectada (cartão mostra "conectar"). */
export interface IntegracaoOneDriveConsulta {
  carregar(): Promise<IntegracaoOneDrive | null>;
}

/** E12-S01 — primeira porta do contexto `configuracoes` (antes só existia a UI). */
export interface ConfiguracoesRepository {
  atualizarIntegracao(
    integracaoId: string,
    patch: Pick<Partial<IntegracaoExterna>, "ativa"> & { apiKey?: string },
  ): Promise<void>;

  atualizarCredenciaisMeta(
    integracaoId: string,
    patch: {
      ativa: boolean;
      appId: string;
      appSecret?: string;
      accessToken?: string;
      webhookVerifyToken: string;
      contaInstagramId: string;
    },
  ): Promise<void>;

  conectarContaAgenda(input: {
    provedor: ProvedorAgenda;
    nomeExibicao: string;
    credenciais: CredenciaisContaAgenda;
    escopos: ContaConectada["escopos"];
    donoId: string;
    emailEndereco?: string;
    pastaRaiz?: string;
  }): Promise<ContaConectada>;

  desconectarContaAgenda(contaId: string): Promise<void>;

  atualizarContaConectada(contaId: string, patch: Partial<ContaConectada>): Promise<void>;

  conectarContaCanal(input: {
    provedor: ProvedorCanal;
    nomeExibicao: string;
    identificador: string;
  }): Promise<ContaCanalConectada>;

  desconectarContaCanal(contaId: string): Promise<void>;
}

/**
 * E13-S15 — canal Evolution. Leitura direta (RLS: só admin) e comandos pela Edge Function
 * `canal-evolution`. Nenhum método devolve ou aceita de volta segredo: a chave do servidor entra uma
 * vez em `salvarServidor` e nunca mais volta.
 */
export interface EvolutionCanalPort {
  carregar(): Promise<import("../domain/evolution").DadosEvolution>;
  salvarServidor(
    urlBase: string,
    apiKey: string,
  ): Promise<import("../domain/evolution").ResultadoServidor>;
  registrarCompatibilidade(entrada: {
    versao: string;
    capacidades: string[];
    afetadaLogout: boolean;
    evidencia: string;
  }): Promise<{ compativel: boolean }>;
  criarCanal(nomeExibicao: string, numero: string): Promise<{ contaId: string }>;
  criarInstancia(contaId: string): Promise<void>;
  instalarWebhook(contaId: string): Promise<void>;
  aceitarRisco(contaId: string): Promise<void>;
  gerarQr(contaId: string): Promise<{ qrBase64: string; expiraEm: string }>;
  consultarEstado(contaId: string): Promise<import("../domain/evolution").ResultadoEstado>;
  enviarTeste(contaId: string, numero: string): Promise<void>;
  definirAtiva(contaId: string, ativa: boolean): Promise<void>;
  vincularAgente(contaId: string, agenteId: string): Promise<void>;
}

/**
 * E13-S15 (ADR-0022) — transcrição de áudio. Leitura direta (RLS: só admin); toda escrita passa
 * pela função `canal-evolution`, que guarda a chave no cofre. A chave entra por `salvar` UMA vez e
 * nunca volta.
 */
export interface TranscricaoAudioPort {
  carregar(): Promise<import("../domain/transcricao").TranscricaoAudio | null>;
  salvar(entrada: import("../domain/transcricao").EntradaTranscricao): Promise<void>;
  /** Prova chave e modelo no provedor, sem gastar transcrição. */
  testar(): Promise<void>;
  definirAtiva(ativa: boolean): Promise<void>;
}
