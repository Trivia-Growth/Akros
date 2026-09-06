#!/usr/bin/env node
/**
 * Lembra de impeccable quando feature toca frontend
 * Roda antes do push (via lefthook pre-push)
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { isSpecDir } from "./lib/spec-dirs.mjs";

// Root override (argv[2]) existe só pra teste isolado (scripts/remind-impeccable.test.mjs,
// mkdtemp + git init) — uso normal (`lefthook` pre-push) não passa argumento e cai no cwd real.
const ROOT = resolve(process.argv[2] || ".");
const SPECS_DIR = join(ROOT, "specs");

try {
  // Detecta se há mudanças em apps/web/src/interfaces ou apps/web/src/features
  const diff = execSync(
    "git diff HEAD origin/main --name-only 2>/dev/null || git diff --cached --name-only",
    { cwd: ROOT, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] },
  );

  const hasUI = diff
    .split("\n")
    .some(
      (file) =>
        file.includes("apps/web/src/interfaces/") ||
        file.includes("apps/web/src/features/") ||
        (file.includes(".tsx") && file.includes("apps/web")),
    );

  if (!hasUI) process.exit(0);

  // Heurística: existe ao menos um tasks.md em specs/ — proxy fraco pra "há processo SDD rodando",
  // não checa se é o tasks.md da feature tocada. `find`/`glob` foram trocados por leitura direta
  // do diretório: `find ... ; foundTask = true` no try antigo dava sucesso pelo exit code do
  // comando, não pela contagem de arquivos — igual à classe de bug do AC-2 (E00-S06), sucesso
  // que não prova o que diz provar.
  const foundTask = existsSync(SPECS_DIR)
    ? readdirSync(SPECS_DIR)
        .filter(isSpecDir)
        .some((pasta) => existsSync(join(SPECS_DIR, pasta, "tasks.md")))
    : false;

  if (!foundTask) process.exit(0);

  // Avisa sobre impeccable
  console.log("\n");
  console.log("⚠️  Mudanças em UI detectadas!");
  console.log("");
  console.log("Antes de fazer push, execute:");
  console.log("  /impeccable");
  console.log("");
  console.log("Ou preencha checklist manualmente:");
  console.log("  .claude/skills/impeccable/checklist-antes-depois.md");
  console.log("");
  console.log("Impeccable é OBRIGATÓRIO no Definition-of-Done.");
  console.log("Ver: Definition-of-Done.md seção 7");
  console.log("\n");
} catch {
  // Silencioso se erro (não bloqueia push, só avisa)
  process.exit(0);
}
