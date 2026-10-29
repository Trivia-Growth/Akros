// AV-08 (revisão adversarial, 2026-10-28): `isDemoMode` abre por padrão (`!== "false"`). Um build com
// backend real configurado e a variável de demo esquecida serviria /admin e /portal sem guarda. O
// padrão aberto é decisão registrada (AJUSTES.md A-01: protótipo mockado), então o que se fecha é a
// combinação perigosa: URL do Supabase presente + demo não desligado = o build FALHA.
import { describe, expect, it } from "vitest";
import { verificarAmbienteDeBuild } from "./vite.guardas";

describe("verificarAmbienteDeBuild", () => {
  it("protótipo atual (sem backend, demo implícito) passa", () => {
    expect(verificarAmbienteDeBuild({})).toBeNull();
  });

  it("demo explícito sem backend passa (é o build do CI)", () => {
    expect(verificarAmbienteDeBuild({ VITE_DEMO_MODE: "true" })).toBeNull();
  });

  it("modo real configurado (demo desligado + backend) passa", () => {
    expect(
      verificarAmbienteDeBuild({
        VITE_DEMO_MODE: "false",
        VITE_SUPABASE_URL: "https://p.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon",
      }),
    ).toBeNull();
  });

  it("backend real com a variável de demo ESQUECIDA falha e diz o que fazer", () => {
    const erro = verificarAmbienteDeBuild({ VITE_SUPABASE_URL: "https://p.supabase.co" });
    expect(erro).toMatch(/VITE_DEMO_MODE/);
    expect(erro).toMatch(/false/);
  });

  it("backend real com demo LIGADO de propósito também falha (é a mesma exposição)", () => {
    expect(
      verificarAmbienteDeBuild({
        VITE_DEMO_MODE: "true",
        VITE_SUPABASE_URL: "https://p.supabase.co",
      }),
    ).not.toBeNull();
  });

  it("qualquer valor diferente de 'false' conta como demo ligado (espelha isDemoMode)", () => {
    for (const valor of ["", "0", "FALSE", "no", " false"]) {
      expect(
        verificarAmbienteDeBuild({
          VITE_DEMO_MODE: valor,
          VITE_SUPABASE_URL: "https://p.supabase.co",
        }),
        JSON.stringify(valor),
      ).not.toBeNull();
    }
  });

  it("URL vazia ou só espaços não conta como backend configurado", () => {
    expect(verificarAmbienteDeBuild({ VITE_SUPABASE_URL: "   " })).toBeNull();
    expect(verificarAmbienteDeBuild({ VITE_SUPABASE_URL: "" })).toBeNull();
  });

  it("a mensagem nunca repete o valor da URL", () => {
    const erro = verificarAmbienteDeBuild({
      VITE_SUPABASE_URL: "https://segredo-do-projeto.supabase.co",
    });
    expect(erro).not.toContain("segredo-do-projeto");
  });
});
