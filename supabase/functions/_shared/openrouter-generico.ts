// _shared/openrouter-generico.ts — E07-S05. Chamada a OpenRouter com prompt estruturado livre
// (cruzamento de requisito, rascunho de resposta) — diferente de `openrouter.ts`, que é
// específico do chat do agente de atendimento (RegraAgente/histórico de conversa).
import { type Buscador, objeto, texto } from "./canais/tipos.ts";
import { ErroIA } from "./openrouter.ts";

export async function chamarOpenRouter(
  buscador: Buscador,
  apiKey: string,
  modelo: string,
  prompt: string,
): Promise<string> {
  const resposta = await buscador("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Akros OS — IA de apoio ao processo",
    },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!resposta.ok) throw new ErroIA(`OpenRouter respondeu ${resposta.status}`, resposta.status);
  const corpo = objeto(await resposta.json().catch(() => null));
  const escolhas = Array.isArray(corpo.choices) ? corpo.choices : [];
  const conteudo = texto(objeto(objeto(escolhas[0]).message).content);
  if (!conteudo) throw new ErroIA("IA não retornou texto");
  return conteudo;
}
