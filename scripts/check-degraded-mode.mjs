#!/usr/bin/env node
// Gate documental do invariante 4 de specs/E00-S06-invariantes-padrao-os/ (AC-5) — metade
// "declaração": toda integração externa declarada no frontmatter de um design.md precisa de uma
// seção "Modo degradado" no MESMO arquivo, dizendo o que a plataforma faz quando a integração está
// fora. A exigência de TESTE de degradação fica suspensa até haver adapter real (decisão do
// design.md de E00-S06, invariante 4) — este gate só verifica a declaração.
//
// Formato da declaração (decidido em 2026-09-05, não inventar outro):
//   frontmatter do design.md da story que introduziu a integração:
//     integracoes: [slug, ...]        # ou lista em bloco YAML (- slug)
//   e uma seção de heading contendo "Modo degradado" (case-insensitivo) cujo corpo mencione cada
//   slug declarado.
//
// Critério de "cobertura" do slug na seção: o corpo da seção precisa conter o slug ou um dos
// nomes legíveis associados (NOMES_LEGIVEIS abaixo). Os slugs seguem o que o repositório já usa
// (`ProvedorAgenda` em features/configuracoes, ids de mocks/integracoes.ts, funções supabase/):
//   whatsapp, instagram, google, microsoft, calendly, openrouter, whisper, fireflies, evolution.
// Onde a coluna "origem" diverge (ex.: mock usa `whatsapp-cloud`, provedores usam `google`), este
// script adota o slug curto — é o que o domínio (ProvedorAgenda/ProvedorCanal) usa.
//
// Falha (exit 1) quando: frontmatter tem `integracoes:` vazio/malformado; falta a seção; a seção
// não menciona um slug declarado. Guarda AC-2 (E00-S06): zero design.md varridos ou zero
// integrações declaradas no repo é falha do gate — filtro quebrado, nunca "sem integrações".
//
// Uso: node scripts/check-degraded-mode.mjs [dir]   (default: ".")

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { isSpecDir } from "./lib/spec-dirs.mjs";

const ROOT = resolve(process.argv[2] || ".");
const SPECS_DIR = join(ROOT, "specs");

// Nome legível aceito no lugar do slug dentro da seção (case-insensitivo).
const NOMES_LEGIVEIS = {
  whatsapp: ["whatsapp"],
  instagram: ["instagram", "meta"],
  google: ["google", "gmail"],
  microsoft: ["microsoft", "outlook", "teams"],
  calendly: ["calendly"],
  openrouter: ["openrouter"],
  whisper: ["whisper"],
  fireflies: ["fireflies"],
  evolution: ["evolution"],
};

const errors = [];

/** Extrai o bloco de frontmatter (--- … ---) do início do arquivo, ou null. */
function frontmatter(texto) {
  if (!texto.startsWith("---")) return null;
  const fim = texto.indexOf("\n---", 3);
  if (fim === -1) return null;
  return texto.slice(3, fim);
}

/** Lê `integracoes:` do frontmatter. Retorna { slugs } ou { erro }. */
function lerIntegracoes(fm) {
  const linhas = fm.split("\n");
  const idx = linhas.findIndex((l) => /^\s*integracoes\s*:/.test(l));
  if (idx === -1) return null; // sem declaração — design.md fora do escopo deste gate
  const linha = linhas[idx];
  const inline = linha.match(/^\s*integracoes\s*:\s*\[([^\]]*)\]\s*$/);
  if (inline) {
    const slugs = inline[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    return slugs.length ? { slugs } : { erro: "`integracoes:` vazio — declare ao menos um slug ou remova a chave" };
  }
  if (/^\s*integracoes\s*:\s*$/.test(linha)) {
    const slugs = [];
    for (let i = idx + 1; i < linhas.length && /^\s*-\s+/.test(linhas[i]); i++) {
      slugs.push(linhas[i].replace(/^\s*-\s+/, "").trim().replace(/^["']|["']$/g, ""));
    }
    return slugs.length ? { slugs } : { erro: "`integracoes:` em bloco sem nenhum item" };
  }
  return { erro: "`integracoes:` malformado — use `[slug, ...]` ou lista em bloco (`- slug`)" };
}

/** Corpo da seção cujo heading contém "modo degradado" (até o próximo heading), ou null. */
function secaoModoDegradado(texto) {
  const linhas = texto.split("\n");
  let inicio = -1;
  for (let i = 0; i < linhas.length; i++) {
    if (/^#{1,6}\s/.test(linhas[i]) && /modo degradado/i.test(linhas[i])) { inicio = i + 1; break; }
  }
  if (inicio === -1) return null;
  let fim = linhas.length;
  for (let i = inicio; i < linhas.length; i++) {
    if (/^#{1,6}\s/.test(linhas[i])) { fim = i; break; }
  }
  return linhas.slice(inicio, fim).join("\n");
}

function menciona(secao, slug) {
  const baixo = secao.toLowerCase();
  return (NOMES_LEGIVEIS[slug] ?? [slug]).some((nome) => baixo.includes(nome));
}

if (!existsSync(SPECS_DIR)) {
  console.error("\n✗ check-degraded-mode: pasta specs/ não encontrada — verifique o diretório varrido.\n");
  process.exit(1);
}

const designs = readdirSync(SPECS_DIR)
  .filter(isSpecDir)
  .map((pasta) => join(SPECS_DIR, pasta, "design.md"))
  .filter((caminho) => existsSync(caminho));

// Guarda AC-2 (E00-S06): zero design.md varridos é caminho/glob quebrado, não "sem integrações".
if (designs.length === 0) {
  console.error(
    "\n✗ check-degraded-mode: nenhum design.md encontrado em specs/*/ — verifique o caminho.\n",
  );
  process.exit(1);
}

let declaradas = 0;
for (const caminho of designs) {
  const rel = relative(ROOT, caminho);
  const texto = readFileSync(caminho, "utf8");
  const fm = frontmatter(texto);
  if (fm === null) continue; // design.md sem frontmatter não declara integrações
  const decl = lerIntegracoes(fm);
  if (decl === null) continue;
  if (decl.erro) {
    errors.push(`${rel}: ${decl.erro}`);
    continue;
  }
  declaradas += decl.slugs.length;

  const secao = secaoModoDegradado(texto);
  if (secao === null) {
    errors.push(
      `${rel}: declara integracoes [${decl.slugs.join(", ")}] mas não tem seção "Modo degradado"`,
    );
    continue;
  }
  for (const slug of decl.slugs) {
    if (!menciona(secao, slug)) {
      errors.push(
        `${rel}: seção "Modo degradado" não menciona '${slug}' (nem nome legível: ` +
          `${(NOMES_LEGIVEIS[slug] ?? [slug]).join(" | ")})`,
      );
    }
  }
}

// Guarda AC-2 (E00-S06): nenhuma integração declarada em lugar nenhum é filtro quebrado — este
// gate só faz sentido num repo que declara integrações. `errors.length` na frente: um
// `integracoes:` malformado (ex. `[]`) já é falha de conteúdo reportada abaixo, não "filtro
// quebrado" — sem essa ordem a mensagem genérica engolia o erro específico.
if (declaradas === 0 && errors.length === 0) {
  console.error(
    "\n✗ check-degraded-mode: nenhuma integração declarada em specs/*/design.md.\n" +
      "  Isso é falha do gate, não ausência de integrações — verifique o parser de frontmatter.\n",
  );
  process.exit(1);
}

if (errors.length > 0) {
  console.error(`\n✗ check-degraded-mode: ${errors.length} problema(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ check-degraded-mode: ${declaradas} integração(ões) declarada(s) em ${designs.length} design(s), todas com seção "Modo degradado".`,
);
