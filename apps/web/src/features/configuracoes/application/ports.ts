import type {
  AgenteIAIntegracao,
  ContaCanalConectada,
  ContaConectada,
  CredenciaisContaAgenda,
  IntegracaoExterna,
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
