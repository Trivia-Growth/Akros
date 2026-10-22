// _shared/graph-microsoft.ts — porta/adapter da integração com Microsoft Graph (E03-S07, Fase 5,
// ADR-0019). Mesmo padrão porta/adapter do resto do repositório (`_shared/webhook.ts` + real
// `_shared/io-supabase.ts`): `IOGraphMicrosoft` é a interface que a lógica pura consome; o real
// (`criarIOGraphMicrosoftReal`, abaixo) é quem fala HTTP de verdade com a Microsoft. Usada por
// `onedrive-oauth` (T054, troca código→token) e por `vincular_pasta` em `caso-comandos` (T056,
// ancestralidade) — e, em outra frente paralela, por `arquivo-processar`.
//
// Honestidade obrigatória (ver brief desta task): este sandbox não tem app registration real no
// Azure AD nem tenant Microsoft. `criarIOGraphMicrosoftReal` nunca é exercitado pelos testes Deno
// (que usam só um fake de `IOGraphMicrosoft`) nem pela verificação empírica contra Postgres real
// desta task — só a composição em `onedrive-oauth/index.ts`/`caso-comandos/index.ts` o invoca, e
// isso só acontece com credenciais reais de produção.
//
// Decisão de implementação (registrada também em tasks.md, "Decisões de implementação"): o brief
// desta task fixa `trocarCodigoPorToken`/`listarAncestrais` como o contrato mínimo (compartilhado
// com `vincular_pasta`/T056 e, em outra frente, `arquivo-processar`). Nenhum dos dois devolve um
// access token utilizável a partir do refresh token guardado no Vault — e tanto `vincular_pasta`
// (valida ancestralidade no momento do vínculo) quanto `arquivo-processar`
// (design-tecnico.md §2.2, passo 2: "Obtém token: refresh do Vault... troca por access token")
// precisam exatamente disso. Acrescenta-se aqui `trocarRefreshPorToken` — mesmo endpoint de
// `trocarCodigoPorToken` (`/oauth2/v2.0/token`), outro `grant_type` — para que a porta sirva aos
// três usos sem uma segunda forma de falar com a Microsoft por fora dela.
export interface IOGraphMicrosoft {
  trocarCodigoPorToken(params: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<{ accessToken: string; refreshToken: string; expiraEm: number }>;
  /** Mesmo endpoint de `trocarCodigoPorToken`, `grant_type=refresh_token` — ver decisão acima.
   *  Microsoft pode rotacionar o refresh token a cada troca; quem chama decide se regrava o
   *  Vault com o novo valor (ver `caso-comandos/index.ts`). */
  trocarRefreshPorToken(params: {
    refreshToken: string;
  }): Promise<{ accessToken: string; refreshToken: string; expiraEm: number }>;
  // Caminho de parentReference.id subindo da pasta até a raiz do drive (ou até não achar
  // mais pai) — quem valida ancestralidade é a lógica pura, não esta porta.
  listarAncestrais(params: {
    accessToken: string;
    driveId: string;
    itemId: string;
  }): Promise<string[]>;
}

const MICROSOFT_LOGIN_BASE = "https://login.microsoftonline.com";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface RespostaTokenMicrosoft {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export function criarIOGraphMicrosoftReal(opts: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}): IOGraphMicrosoft {
  async function trocarPorToken(corpo: URLSearchParams) {
    const resposta = await fetch(`${MICROSOFT_LOGIN_BASE}/${opts.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo,
    });
    if (!resposta.ok) {
      throw new Error(`troca de token com a Microsoft falhou: ${resposta.status}`);
    }
    const dados = (await resposta.json()) as RespostaTokenMicrosoft;
    return {
      accessToken: dados.access_token,
      refreshToken: dados.refresh_token,
      expiraEm: dados.expires_in,
    };
  }

  return {
    trocarCodigoPorToken({ code, redirectUri, codeVerifier }) {
      return trocarPorToken(
        new URLSearchParams({
          client_id: opts.clientId,
          client_secret: opts.clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      );
    },

    trocarRefreshPorToken({ refreshToken }) {
      return trocarPorToken(
        new URLSearchParams({
          client_id: opts.clientId,
          client_secret: opts.clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      );
    },

    async listarAncestrais({ accessToken, driveId, itemId }) {
      const ancestrais: string[] = [];
      let itemAtualId: string | null = itemId;
      // Sobe parentReference.id até não achar mais pai (chegou na raiz do drive) — o próprio
      // itemId inicial nunca entra na lista (lista só ANCESTRAIS, não o item); quem decide se a
      // cadeia alcança a pasta autorizada é a lógica pura de `vincular_pasta`, não esta porta.
      for (;;) {
        const resposta = await fetch(
          `${GRAPH_BASE}/drives/${driveId}/items/${itemAtualId}?$select=parentReference`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (resposta.status === 404) {
          throw new Error("item inexistente no Graph");
        }
        if (!resposta.ok) {
          throw new Error(`consulta de ancestralidade falhou: ${resposta.status}`);
        }
        const dados = (await resposta.json()) as { parentReference?: { id?: string } };
        const paiId = dados.parentReference?.id ?? null;
        if (!paiId) break;
        ancestrais.push(paiId);
        itemAtualId = paiId;
      }
      return ancestrais;
    },
  };
}
