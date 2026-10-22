// _shared/graph-microsoft.ts — porta mínima `IOGraphMicrosoft` (E03-S07, Fase 5/US2, ADR-0019)
// para a transferência ao OneDrive (`arquivo-processar`) e o download controlado
// (`arquivo-baixar`). Mesmo padrão porta/adapter de `webhook.ts`/`io-supabase.ts`: aqui a
// interface + o adapter real (`criarIOGraphMicrosoft`, usa `fetch`); os testes Deno montam um
// fake, nunca tocam a Microsoft de verdade (ver `arquivo-processar.test.ts`).
//
// RECONCILIAÇÃO DE PORTA (documentado no relatório desta task): `onedrive-oauth` (Frente A,
// outro worktree) provavelmente precisa de uma conexão Microsoft equivalente (trocar
// code→token, validar/gravar refresh token) e pode nascer com seu próprio `_shared/graph-
// microsoft.ts`/`IOGraphMicrosoft`. Este arquivo cobre só os métodos que `arquivo-processar`/
// `arquivo-baixar` precisam — ao integrar os dois worktrees, uma reconciliação de porta (unificar
// os dois arquivos em um só, ou mover o que for específico de cada chamador para um arquivo
// próprio) é esperada; não é erro desta task, é efeito de trabalho paralelo.
//
// Métodos cobertos: troca de refresh token por access token, validação de ancestralidade,
// criar sessão de upload, enviar fragmento, buscar item por nome na pasta, baixar conteúdo
// (usado por `arquivo-baixar` — fora da lista original de `arquivo-processar`, mas mesma porta:
// evita um terceiro cliente HTTP ad hoc para o mesmo serviço externo).

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/** Forma do segredo gravado no Vault, escopo `microsoft-graph:<integracaoId>` (ADR-0019). */
export interface SegredoMicrosoftGraph {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

/** Classificação do erro — é o que o processador usa para decidir bloquear vs. tentar de novo
 *  (T071). `tipo` nunca carrega detalhe técnico do erro original: a mensagem sanitizada fixa é
 *  decidida por quem consome (`arquivo-processar.ts`), não aqui. */
export type TipoErroGraph = "auth" | "quota" | "pasta_ausente" | "rede";

export class GraphError extends Error {
  constructor(
    public tipo: TipoErroGraph,
    message: string,
    public retryAfterSegundos: number | null = null,
  ) {
    super(message);
  }
}

export interface IOGraphMicrosoft {
  /** Troca o refresh token por um access token (OAuth2 `grant_type=refresh_token`). O Graph pode
   *  rotacionar o refresh token (`offline_access`) — `refreshTokenNovo` vem preenchido quando
   *  isso acontece; o chamador decide se regrava o segredo. */
  trocarRefreshPorAccessToken(
    segredo: SegredoMicrosoftGraph,
  ): Promise<{ accessToken: string; refreshTokenNovo: string | null }>;

  /** `true` se `itemId` é `ancestralEsperadoId` ou descendente dele no `driveId` informado —
   *  sobe a cadeia de `parentReference` até achar o ancestral ou chegar na raiz (T069 passo 3,
   *  "sempre, a cada execução, não só na vinculação"). */
  validarAncestralidade(args: {
    accessToken: string;
    driveId: string;
    itemId: string;
    ancestralEsperadoId: string;
  }): Promise<boolean>;

  /** Item pelo nome determinístico dentro da pasta — usado tanto na reconciliação (T070) quanto
   *  por `arquivo-baixar` indiretamente (via `item_id` já conhecido, não por nome). `null` se não
   *  existe (404 do Graph não é erro aqui, é resposta válida). */
  buscarItemPorNome(args: {
    accessToken: string;
    driveId: string;
    folderItemId: string;
    nomeArquivo: string;
  }): Promise<{ itemId: string; tamanhoBytes: number } | null>;

  /** Cria a sessão de upload resumível do Graph. `conflictBehavior: "fail"` de propósito: a
   *  reconciliação (T070) já checou que o item determinístico não existe antes de chamar isto —
   *  se o Graph ainda assim recusar por conflito (corrida rara), o erro genérico cai no caminho
   *  de falha transitória (backoff), e a PRÓXIMA execução reconcilia de novo. */
  criarSessaoUpload(args: {
    accessToken: string;
    driveId: string;
    folderItemId: string;
    nomeArquivo: string;
  }): Promise<{ uploadUrl: string }>;

  /** Envia um fragmento (`Content-Range: bytes {inicio}-{fim}/{total}`). `concluido: true` +
   *  `itemId` só quando o Graph confirma o item final (último fragmento aceito) — nunca antes. */
  enviarFragmento(args: {
    uploadUrl: string;
    bytes: Uint8Array;
    inicio: number;
    fim: number;
    total: number;
  }): Promise<{ concluido: boolean; itemId: string | null }>;

  /** Baixa o conteúdo binário do item (usado por `arquivo-baixar`). O Graph normalmente responde
   *  com um redirecionamento a uma URL pré-autenticada de curta duração — o adapter real SEGUE o
   *  redirecionamento internamente (`fetch` com `redirect: "follow"`) e só devolve os bytes: essa
   *  URL intermediária nunca é persistida, logada nem devolvida ao chamador (ADR-0019 ponto 6). */
  baixarConteudo(args: {
    accessToken: string;
    driveId: string;
    itemId: string;
  }): Promise<Uint8Array>;
}

function retryAfterDe(resposta: Response): number | null {
  const valor = resposta.headers.get("Retry-After");
  if (!valor) return null;
  const segundos = Number(valor);
  return Number.isFinite(segundos) && segundos >= 0 ? segundos : null;
}

function classificarErroHttp(resposta: Response, mensagem: string): GraphError {
  const retryAfterSegundos = retryAfterDe(resposta);
  if (resposta.status === 401 || resposta.status === 403) {
    return new GraphError("auth", mensagem, retryAfterSegundos);
  }
  if (resposta.status === 507 || resposta.status === 509) {
    return new GraphError("quota", mensagem, retryAfterSegundos);
  }
  return new GraphError("rede", mensagem, retryAfterSegundos);
}

async function lerErro(resposta: Response): Promise<string> {
  try {
    const corpo = await resposta.text();
    // Mensagem sanitizada: nunca propaga o corpo bruto do Graph (pode conter token/URL) para
    // além desta função — quem chama decide a mensagem final exposta (T071).
    return `Graph respondeu ${resposta.status}${corpo ? "" : ""}`;
  } catch {
    return `Graph respondeu ${resposta.status}`;
  }
}

/** Adapter real, contra a Microsoft Graph API v1.0. Nenhum teste Deno desta feature chama isto —
 *  só o fake injetado (ver `arquivo-processar.test.ts`/`arquivo-baixar.test.ts`). */
export function criarIOGraphMicrosoft(fetcher: typeof fetch = fetch): IOGraphMicrosoft {
  return {
    async trocarRefreshPorAccessToken(segredo) {
      const corpo = new URLSearchParams({
        client_id: segredo.clientId,
        client_secret: segredo.clientSecret,
        grant_type: "refresh_token",
        refresh_token: segredo.refreshToken,
        scope: "https://graph.microsoft.com/.default offline_access",
      });
      let resposta: Response;
      try {
        resposta = await fetcher(
          `https://login.microsoftonline.com/${encodeURIComponent(segredo.tenantId)}/oauth2/v2.0/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: corpo,
          },
        );
      } catch {
        throw new GraphError("rede", "Falha de rede ao renovar token Microsoft");
      }
      if (!resposta.ok) {
        if (resposta.status === 400 || resposta.status === 401) {
          throw new GraphError("auth", await lerErro(resposta), retryAfterDe(resposta));
        }
        throw classificarErroHttp(resposta, await lerErro(resposta));
      }
      const json = (await resposta.json()) as { access_token?: string; refresh_token?: string };
      if (!json.access_token) throw new GraphError("auth", "Resposta de token sem access_token");
      return { accessToken: json.access_token, refreshTokenNovo: json.refresh_token ?? null };
    },

    async validarAncestralidade({ accessToken, driveId, itemId, ancestralEsperadoId }) {
      const MAX_PROFUNDIDADE = 50; // cinto-e-suspensório contra ciclo/corrupção de dado do Graph
      let atual = itemId;
      for (let i = 0; i < MAX_PROFUNDIDADE; i++) {
        if (atual === ancestralEsperadoId) return true;
        let resposta: Response;
        try {
          resposta = await fetcher(
            `${GRAPH_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(atual)}?$select=id,parentReference`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
        } catch {
          throw new GraphError("rede", "Falha de rede ao validar ancestralidade");
        }
        if (resposta.status === 404) throw new GraphError("pasta_ausente", "Item não encontrado no drive");
        if (!resposta.ok) throw classificarErroHttp(resposta, await lerErro(resposta));
        const json = (await resposta.json()) as { parentReference?: { id?: string } };
        const proximoId = json.parentReference?.id;
        if (!proximoId || proximoId === atual) return false; // chegou na raiz sem achar o ancestral
        atual = proximoId;
      }
      return false;
    },

    async buscarItemPorNome({ accessToken, driveId, folderItemId, nomeArquivo }) {
      let resposta: Response;
      try {
        resposta = await fetcher(
          `${GRAPH_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(folderItemId)}:/${encodeURIComponent(nomeArquivo)}?$select=id,size`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
      } catch {
        throw new GraphError("rede", "Falha de rede ao buscar item determinístico");
      }
      if (resposta.status === 404) return null;
      if (resposta.status === 400) {
        // Pasta (folderItemId) em si pode não existir mais — Graph devolve 400/404 inconsistente
        // conforme a parte do caminho que falha; trata os dois como "pasta ausente".
        throw new GraphError("pasta_ausente", "Pasta do caso não encontrada no drive");
      }
      if (!resposta.ok) throw classificarErroHttp(resposta, await lerErro(resposta));
      const json = (await resposta.json()) as { id: string; size: number };
      return { itemId: json.id, tamanhoBytes: json.size };
    },

    async criarSessaoUpload({ accessToken, driveId, folderItemId, nomeArquivo }) {
      let resposta: Response;
      try {
        resposta = await fetcher(
          `${GRAPH_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(folderItemId)}:/${encodeURIComponent(nomeArquivo)}:/createUploadSession`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "fail" } }),
          },
        );
      } catch {
        throw new GraphError("rede", "Falha de rede ao criar sessão de upload");
      }
      if (resposta.status === 404) throw new GraphError("pasta_ausente", "Pasta do caso não encontrada no drive");
      if (!resposta.ok) throw classificarErroHttp(resposta, await lerErro(resposta));
      const json = (await resposta.json()) as { uploadUrl: string };
      return { uploadUrl: json.uploadUrl };
    },

    async enviarFragmento({ uploadUrl, bytes, inicio, fim, total }) {
      let resposta: Response;
      try {
        resposta = await fetcher(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Length": String(bytes.byteLength),
            "Content-Range": `bytes ${inicio}-${fim}/${total}`,
          },
          body: bytes as BodyInit,
        });
      } catch {
        throw new GraphError("rede", "Falha de rede ao enviar fragmento");
      }
      if (resposta.status === 507 || resposta.status === 509) {
        throw new GraphError("quota", "Quota do OneDrive excedida", retryAfterDe(resposta));
      }
      if (resposta.status === 401 || resposta.status === 403) {
        throw new GraphError("auth", await lerErro(resposta), retryAfterDe(resposta));
      }
      // 202 Accepted = fragmento recebido, upload continua; 200/201 = último fragmento, item criado.
      if (resposta.status === 202) return { concluido: false, itemId: null };
      if (resposta.status === 200 || resposta.status === 201) {
        const json = (await resposta.json()) as { id: string };
        return { concluido: true, itemId: json.id };
      }
      throw classificarErroHttp(resposta, await lerErro(resposta));
    },

    async baixarConteudo({ accessToken, driveId, itemId }) {
      let resposta: Response;
      try {
        resposta = await fetcher(
          `${GRAPH_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
          { headers: { Authorization: `Bearer ${accessToken}` }, redirect: "follow" },
        );
      } catch {
        throw new GraphError("rede", "Falha de rede ao baixar conteúdo");
      }
      if (resposta.status === 404) throw new GraphError("pasta_ausente", "Arquivo não encontrado no drive");
      if (!resposta.ok) throw classificarErroHttp(resposta, await lerErro(resposta));
      return new Uint8Array(await resposta.arrayBuffer());
    },
  };
}
