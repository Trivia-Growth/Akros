// _shared/comunicacao-chat-portal.ts — E08-S05. Cliente (participante do caso) ou admin envia
// mensagem no chat do portal. Mesma autorização de participação do resto da feature E03-S07.
import { HttpError } from "./auth.ts";
import { resolverParticipacao, type IOAutorizacaoCaso } from "./autorizacao-caso.ts";

export interface IOChatPortal {
  autorizacaoCaso: IOAutorizacaoCaso;
  nomeDoCliente(clienteId: string): Promise<string | null>;
  enviar(args: {
    clienteId: string;
    autorTipo: "cliente" | "akros";
    autorNome: string;
    conteudo: string;
    autorId: string;
  }): Promise<unknown>;
}

export async function enviarMensagemPortal(
  io: IOChatPortal,
  authUserId: string,
  ehAdmin: boolean,
  clienteId: string,
  conteudo: string,
): Promise<unknown> {
  if (!conteudo.trim()) throw new HttpError(422, "Mensagem vazia");

  if (ehAdmin) {
    return io.enviar({ clienteId, autorTipo: "akros", autorNome: "Equipe Akros", conteudo, autorId: authUserId });
  }

  // Participante: confirma que participa deste caso antes de gravar em nome dele — qualquer
  // papel serve (chat não é restrito a um papel específico), nunca confia no `clienteId` do
  // body sem checar (mesmo critério de `reservar_envio`/`arquivo-baixar`).
  const participa = await resolverParticipacao(io.autorizacaoCaso, authUserId, { clienteId });
  if (participa.length === 0) throw new HttpError(404, "Caso não encontrado");
  const nome = (await io.nomeDoCliente(clienteId)) ?? "Cliente";
  return io.enviar({ clienteId, autorTipo: "cliente", autorNome: nome, conteudo, autorId: authUserId });
}
