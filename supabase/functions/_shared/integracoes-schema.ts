// _shared/integracoes-schema.ts — contrato de entrada de `integracoes-ia-salvar` (E13-S13).
// Separado da function para ser testável sem rede. `.strict()` em tudo: o corpo vem do navegador de
// um admin, mas continua sendo entrada externa; campo desconhecido é recusado, não ignorado.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const uuid = z.string().uuid();
const texto = (min: number, max: number) => z.string().trim().min(min).max(max);
const segredo = z.string().trim().min(8).max(2048);
/** Id numérico da Meta (WABA, número de telefone, conta do Instagram). */
const idMeta = z.string().trim().regex(/^[0-9]{5,30}$/, "Informe só os dígitos do identificador");
/** Aparece na query string do desafio; só caracteres seguros em URL. */
const tokenVerificacao = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._~-]+$/);

const baseConta = {
  contaId: uuid.optional(),
  nomeExibicao: texto(2, 120),
  ativa: z.boolean(),
};

const evolution = z
  .object({
    provedor: z.literal("evolution"),
    ...baseConta,
    identificador: texto(8, 30),
    baseUrl: z.string().trim().url().max(300)
      .refine((v) => new URL(v).protocol === "https:", "Evolution precisa de HTTPS"),
    instancia: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
    apiKey: segredo.optional(),
  })
  .strict();

const whatsappOficial = z
  .object({
    provedor: z.literal("whatsapp_oficial"),
    ...baseConta,
    identificador: texto(8, 30),
    phoneNumberId: idMeta,
    wabaId: idMeta,
    accessToken: segredo.optional(),
    appSecret: segredo.optional(),
    verifyToken: tokenVerificacao.optional(),
  })
  .strict();

const instagram = z
  .object({
    provedor: z.literal("instagram"),
    ...baseConta,
    identificador: texto(1, 60),
    igAccountId: idMeta,
    accessToken: segredo.optional(),
    appSecret: segredo.optional(),
    verifyToken: tokenVerificacao.optional(),
  })
  .strict();

export const CanalSchema = z.discriminatedUnion("provedor", [evolution, whatsappOficial, instagram]);

export const AgenteSchema = z
  .object({
    agenteId: uuid.optional(),
    nome: texto(2, 120),
    funcao: texto(2, 160),
    // Hoje é a única "base" do agente (o prompt de sistema); 16 mil caracteres cabem folgados.
    alma: texto(20, 16000),
    saudacao: texto(2, 1000),
    mensagemHandoff: texto(2, 1000),
    modelo: texto(2, 160),
    apiKeyOpenRouter: segredo.optional(),
    ativo: z.boolean(),
  })
  .strict();

/**
 * `canal` é opcional: dá para salvar só o agente (chave OpenRouter, modelo, orientação) e testá-lo no
 * Playground antes de conectar qualquer WhatsApp ou Instagram. Canal sem agente não existe: o canal
 * só vale ligado a um agente que responda por ele.
 */
export const EntradaSchema = z.object({ canal: CanalSchema.optional(), agente: AgenteSchema }).strict();

export type Canal = z.infer<typeof CanalSchema>;
export type Agente = z.infer<typeof AgenteSchema>;
export type EntradaIntegracao = z.infer<typeof EntradaSchema>;

/** Nome da Edge Function que recebe os eventos de cada provedor. */
export const FUNCAO_WEBHOOK = {
  evolution: "evolution-webhook",
  whatsapp_oficial: "meta-whatsapp-webhook",
  instagram: "meta-instagram-webhook",
} as const;

export function urlWebhook(urlProjeto: string, provedor: Canal["provedor"], contaId: string): string {
  return `${urlProjeto.replace(/\/+$/, "")}/functions/v1/${FUNCAO_WEBHOOK[provedor]}?conta=${contaId}`;
}
