import { describe, expect, it } from "vitest";
import enAdmin from "./locales/en/admin.json";
import ptAdmin from "./locales/pt-BR/admin.json";

function chaves(valor: unknown, prefixo = ""): string[] {
  if (valor === null || typeof valor !== "object") return [prefixo];
  return Object.entries(valor as Record<string, unknown>).flatMap(([k, v]) =>
    chaves(v, prefixo ? `${prefixo}.${k}` : k),
  );
}

describe("E13-S15 — i18n do canal Evolution e da Comunicação (PT-BR = EN)", () => {
  for (const bloco of ["canalEvolution", "comunicacao"] as const) {
    it(`"${bloco}" tem exatamente as mesmas chaves nos dois idiomas, sem texto vazio`, () => {
      const pt = chaves((ptAdmin as Record<string, unknown>)[bloco]).sort();
      const en = chaves((enAdmin as Record<string, unknown>)[bloco]).sort();
      expect(pt).toEqual(en);
      const vazio = (alvo: unknown): boolean =>
        typeof alvo === "string" ? alvo.trim() === "" : Object.values(alvo as object).some(vazio);
      expect(vazio((ptAdmin as Record<string, unknown>)[bloco])).toBe(false);
      expect(vazio((enAdmin as Record<string, unknown>)[bloco])).toBe(false);
    });
  }

  it("todo código de erro do servidor tem texto traduzido", () => {
    const codigos = [
      "url_recusada",
      "chave_recusada",
      "servidor_indisponivel",
      "servidor_nao_configurado",
      "webhook_nao_confirmado",
      "webhook_falhou",
      "criar_instancia_falhou",
      "instancia_nao_criada",
      "instancia_nao_aguarda_pareamento",
      "risco_nao_aceito",
      "qr_indisponivel",
      "canal_nao_conectado",
      "envio_nao_provado",
      "envio_falhou",
      "numero_ja_cadastrado",
      "numero_invalido",
      "numero_divergente",
      "sessao_encerrada",
      "agente_inexistente",
      "sem_permissao",
      "limite",
    ];
    for (const c of codigos) {
      expect((ptAdmin.canalEvolution.erros as Record<string, string>)[c], c).toBeTruthy();
      expect((enAdmin.canalEvolution.erros as Record<string, string>)[c], c).toBeTruthy();
    }
  });
});
