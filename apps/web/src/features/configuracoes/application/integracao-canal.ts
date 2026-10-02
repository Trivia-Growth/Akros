// Formulário de canal + agente (E13-S13). Funções puras: o componente só liga estado e rede.
import type { ProvedorCanal } from "../domain/types";

/** Edge Function que recebe os eventos de cada tipo de canal (espelha `integracoes-schema.ts`). */
export const FUNCAO_WEBHOOK: Record<ProvedorCanal, string> = {
  evolution: "evolution-webhook",
  whatsapp_oficial: "meta-whatsapp-webhook",
  instagram: "meta-instagram-webhook",
};

/** Endereço público do webhook da conta: é o que se cola no painel da Meta. Sem segredo. */
export function urlWebhookConta(
  urlProjeto: string | undefined,
  provedor: ProvedorCanal,
  contaId: string,
): string | null {
  if (!urlProjeto || !contaId) return null;
  return `${urlProjeto.replace(/\/+$/, "")}/functions/v1/${FUNCAO_WEBHOOK[provedor]}?conta=${contaId}`;
}

/** Token de verificação aleatório (32 hex = 128 bits), gerado no navegador de quem configura. */
export function gerarTokenVerificacao(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface FormularioCanal {
  provedor: ProvedorCanal;
  contaId: string;
  nomeConta: string;
  identificador: string;
  ativa: boolean;
  // Evolution
  baseUrl: string;
  instancia: string;
  chaveEvolution: string;
  // Meta (WhatsApp oficial e Instagram)
  phoneNumberId: string;
  wabaId: string;
  igAccountId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
}

export interface FormularioAgente {
  agenteId: string;
  nomeAgente: string;
  funcao: string;
  alma: string;
  saudacao: string;
  handoff: string;
  modelo: string;
  chaveOpenRouter: string;
  agenteAtivo: boolean;
}

export const CANAL_INICIAL: FormularioCanal = {
  provedor: "evolution",
  contaId: "",
  nomeConta: "WhatsApp Akros",
  identificador: "",
  ativa: true,
  baseUrl: "",
  instancia: "",
  chaveEvolution: "",
  phoneNumberId: "",
  wabaId: "",
  igAccountId: "",
  accessToken: "",
  appSecret: "",
  verifyToken: "",
};

export const AGENTE_INICIAL: FormularioAgente = {
  agenteId: "",
  nomeAgente: "Assistente Akros",
  funcao: "primeiro atendimento e triagem",
  alma: "Acolha, esclareça próximos passos gerais e encaminhe casos que exijam análise humana. Não dê aconselhamento jurídico.",
  saudacao: "Olá! Sou assistente virtual da Akros. Como posso ajudar?",
  handoff:
    "Vou encaminhar sua mensagem para nossa equipe humana e retornaremos assim que possível.",
  modelo: "openai/gpt-4.1-mini",
  chaveOpenRouter: "",
  agenteAtivo: false,
};

/** Só entra no corpo o segredo que a pessoa digitou: em branco o servidor mantém o do Vault. */
function seDigitado<K extends string>(chave: K, valor: string): { [P in K]?: string } {
  const limpo = valor.trim();
  return limpo ? ({ [chave]: limpo } as { [P in K]: string }) : {};
}

/**
 * `incluirCanal = false` salva só o agente (chave OpenRouter, modelo, orientação): dá para testá-lo
 * no Playground antes de conectar qualquer WhatsApp ou Instagram.
 */
export function corpoDeSalvar(
  canal: FormularioCanal,
  agente: FormularioAgente,
  incluirCanal = true,
) {
  const comum = {
    ...(canal.contaId ? { contaId: canal.contaId } : {}),
    nomeExibicao: canal.nomeConta.trim(),
    identificador: canal.identificador.trim(),
    ativa: canal.ativa,
  };
  const dadosCanal =
    canal.provedor === "evolution"
      ? {
          provedor: "evolution" as const,
          ...comum,
          baseUrl: canal.baseUrl.trim(),
          instancia: canal.instancia.trim(),
          ...seDigitado("apiKey", canal.chaveEvolution),
        }
      : canal.provedor === "whatsapp_oficial"
        ? {
            provedor: "whatsapp_oficial" as const,
            ...comum,
            phoneNumberId: canal.phoneNumberId.trim(),
            wabaId: canal.wabaId.trim(),
            ...seDigitado("accessToken", canal.accessToken),
            ...seDigitado("appSecret", canal.appSecret),
            ...seDigitado("verifyToken", canal.verifyToken),
          }
        : {
            provedor: "instagram" as const,
            ...comum,
            igAccountId: canal.igAccountId.trim(),
            ...seDigitado("accessToken", canal.accessToken),
            ...seDigitado("appSecret", canal.appSecret),
            ...seDigitado("verifyToken", canal.verifyToken),
          };
  return {
    ...(incluirCanal ? { canal: dadosCanal } : {}),
    agente: {
      ...(agente.agenteId ? { agenteId: agente.agenteId } : {}),
      nome: agente.nomeAgente.trim(),
      funcao: agente.funcao.trim(),
      alma: agente.alma.trim(),
      saudacao: agente.saudacao.trim(),
      mensagemHandoff: agente.handoff.trim(),
      modelo: agente.modelo.trim(),
      ...seDigitado("apiKeyOpenRouter", agente.chaveOpenRouter),
      ativo: agente.agenteAtivo,
    },
  };
}

/**
 * Credenciais digitadas voltam a vazio depois de salvar: nunca ficam em estado entre renders.
 * O token de verificação é a exceção deliberada: só serve ao aperto de mão GET da Meta (não envia
 * nem lê mensagem) e o administrador precisa copiá-lo para o painel DEPOIS de salvar aqui.
 */
export function limparSegredos(canal: FormularioCanal): FormularioCanal {
  return { ...canal, chaveEvolution: "", accessToken: "", appSecret: "" };
}
