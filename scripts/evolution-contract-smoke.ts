// Smoke de contrato contra o servidor Evolution do Akros (E13-S15, FR-024).
//
//   EVOLUTION_URL=https://… EVOLUTION_APIKEY=… deno run --allow-net --allow-env scripts/evolution-contract-smoke.ts
//
// Opcional (prova o envio com uma instância JÁ pareada, que NÃO é apagada):
//   EVOLUTION_INSTANCIA_PAREADA=nome  EVOLUTION_NUMERO_TESTE=5511999999999
//
// Cria a instância efêmera `smoke-…`, prova as capacidades e a APAGA. Imprime só versão, nomes de
// capacidade e latência — nunca chave, QR ou corpo. O resultado é a evidência para registrar a
// versão na matriz (Configurações → Canais → Evolution → "Registrar versão provada").
import { criarClienteEvolution } from "../supabase/functions/_shared/canais/evolution-cliente.ts";
import { EVENTOS_DO_WEBHOOK } from "../supabase/functions/_shared/canais/evolution-estado.ts";
import { rodarSmoke } from "../supabase/functions/_shared/canais/evolution-smoke.ts";

const url = Deno.env.get("EVOLUTION_URL")?.trim();
const apiKey = Deno.env.get("EVOLUTION_APIKEY")?.trim();
if (!url || !apiKey) {
  console.error("EVOLUTION_URL e EVOLUTION_APIKEY são obrigatórias.");
  Deno.exit(2);
}
const instanciaPareada = Deno.env.get("EVOLUTION_INSTANCIA_PAREADA")?.trim();
const numero = Deno.env.get("EVOLUTION_NUMERO_TESTE")?.trim();

const nome = `smoke-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
const cliente = criarClienteEvolution({ buscador: fetch, baseUrl: url, apiKey });
const resultado = await rodarSmoke(cliente, {
  nome,
  webhook: {
    url: "https://example.com/akros-smoke",
    cabecalhos: { "x-akros-webhook": "smoke-nao-e-segredo-real" },
    eventos: EVENTOS_DO_WEBHOOK,
    base64: false,
  },
  ...(instanciaPareada && numero
    ? { envio: { instancia: instanciaPareada, numero, texto: "Smoke de contrato do Akros. Pode ignorar." } }
    : {}),
  log: (e) => console.error(JSON.stringify(e)),
});

console.log(JSON.stringify(resultado, null, 2));
if (resultado.compativel) {
  const provadas = Object.entries(resultado.capacidades).filter(([, v]) => v.provada).map(([k]) => k);
  console.error(`\nProvadas: ${provadas.join(", ")}.\nRegistre a versão ${resultado.versao} com essas capacidades na tela de Canais.`);
}
Deno.exit(resultado.compativel && resultado.apagada !== false ? 0 : 1);
