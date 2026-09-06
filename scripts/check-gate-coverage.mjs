#!/usr/bin/env node
// Gate do invariante 1 de specs/E00-S06-invariantes-padrao-os/ (AC-1): todo `scripts/<nome>.mjs`
// tem `scripts/<nome>.test.mjs` ao lado. Não varre `scripts/lib/` (utilitário compartilhado, sem
// execução própria como CLI — readdirSync não-recursivo já exclui subpastas).
//
// A parte "cada teste tem ao menos um caso de saída não-zero" (segunda cláusula do AC-1) não é
// verificada automaticamente aqui — é convenção de revisão humana, com `check-edge-functions.test.mjs`
// como forma de referência (ver design.md). Verificar isso estaticamente exigiria interpretar
// intenção do teste, não só sua existência.
//
// Uso: node scripts/check-gate-coverage.mjs [dir]   (default: ".")
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.argv[2] || ".");
const SCRIPTS_DIR = join(ROOT, "scripts");

if (!existsSync(SCRIPTS_DIR)) {
  console.error("\n✗ check-gate-coverage: pasta scripts/ não encontrada — verifique o caminho.\n");
  process.exit(1);
}

const arquivos = readdirSync(SCRIPTS_DIR, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith(".mjs") && !e.name.endsWith(".test.mjs"))
  .map((e) => e.name)
  .sort();

// Guarda AC-2 (E00-S06): scripts/ varrida sem nenhum .mjs é caminho quebrado, não "sem scripts".
if (arquivos.length === 0) {
  console.error(
    "\n✗ check-gate-coverage: nenhum script .mjs encontrado em scripts/ — verifique o caminho.\n",
  );
  process.exit(1);
}

const semTeste = arquivos.filter(
  (nome) => !existsSync(join(SCRIPTS_DIR, nome.replace(/\.mjs$/, ".test.mjs"))),
);

if (semTeste.length > 0) {
  console.error(
    `\n✗ check-gate-coverage: ${semTeste.length} script(s) sem scripts/<nome>.test.mjs par:\n`,
  );
  for (const nome of semTeste) console.error(`  - ${nome}`);
  console.error("\n  Invariante 1 (E00-S06): todo gate prova, em teste, que sabe falhar.\n");
  process.exit(1);
}

console.log(
  `✓ check-gate-coverage: ${arquivos.length} script(s) em scripts/, todos com scripts/<nome>.test.mjs par.`,
);
