import { getSupabase } from "@/shared/supabase/client";
import { type EnvioDocumentoComandos, EnvioDocumentoError } from "../application/ports";

const CABECALHO_CSRF = { "x-akros-csrf": "1" };

async function invocar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke("envio-comandos", {
    headers: CABECALHO_CSRF,
    body,
  });
  if (!error) return data as T;

  const contexto = (error as { context?: Response }).context;
  const status = contexto?.status ?? 500;
  let chaveMensagem = "upload.invalidFile";
  if (status === 404) chaveMensagem = "upload.blockedPhase";
  else if (status === 403) chaveMensagem = "upload.notYourRole";
  else if (status === 413) chaveMensagem = "upload.fileTooLarge";
  else if (status === 422) chaveMensagem = "upload.invalidFile";
  throw new EnvioDocumentoError(status, chaveMensagem);
}

export class SupabaseEnvioComandos implements EnvioDocumentoComandos {
  reservar(input: {
    solicitacaoId: string;
    nomeArquivo: string;
    tamanhoBytes: number;
    mime: string;
  }) {
    return invocar<{ versaoId: string; objetoPermitido: string; expiraEm: string }>({
      acao: "reservar_envio",
      ...input,
    });
  }

  finalizar(input: { versaoId: string; idempotencyKey: string; revisaoEsperada: number }) {
    return invocar<{ versaoId: string; recebidoEm: string; estadoArmazenamento: string }>({
      acao: "finalizar_envio",
      ...input,
    });
  }
}
