#!/usr/bin/env node
// Eval de fidelidade spec→implementação (Padrão OS).
// Para cada specs/NNNN-*/: extrai os AC da spec, checa cobertura por task (tasks.md) e
// referência em código/teste (token AC-N), e conta SPEC_DEVIATION abertos.
// Falha (exit 1) se algum AC não é coberto por NENHUMA task (rastreabilidade quebrada).
// Referência em teste é AVISO até a feature ser implementada.
// Uso: node scripts/eval-spec-fidelity.mjs [dir]
// Adaptado do spec-driven (template/scripts/eval-spec-fidelity.mjs).

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { isSpecDir } from "./lib/spec-dirs.mjs";

const ROOT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) || ".");
const SKIP = new Set(["node_modules", ".git", ".claude", "specs", "docs", "scripts", ".triviaiox-core", ".triviaiox"]);
const CODE_EXT = new Set([".js",".mjs",".cjs",".ts",".tsx",".jsx",".py",".go",".java",".rb",".php",".cs",".rs",".kt",".swift",".sql",".feature"]);

function walkCode(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith(".tmp")) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) out.push(...walkCode(f));
    else if (CODE_EXT.has(extname(f))) out.push(f);
  }
  return out;
}

const acTokens = (s) => new Set(s.match(/AC-\d+/g) || []);

const specsDir = join(ROOT, "specs");
if (!existsSync(specsDir)) { console.log("Sem specs/ — nada a avaliar."); process.exit(0); }

let codeBlob = "";
try { for (const f of walkCode(ROOT)) codeBlob += "\n" + readFileSync(f, "utf8"); } catch {}
const codeACs = acTokens(codeBlob);
const deviations = (codeBlob.match(/SPEC_DEVIATION/g) || []).length;

// ─────────────────────────────────────────────────────────────────────────────
// Baseline de dívida (RATCHET — temporário, ver ADR pendente sobre política de artefato).
//
// Ao corrigir o filtro de pasta (auditoria de 2026-08-30) o gate revelou 314 AC sem task, todos
// de stories JÁ implementadas e fechadas. Falhar em cima disso pararia o trabalho em andamento
// sem consertar nada. O baseline nomeia essa dívida uma vez: AC listado aqui é dívida conhecida,
// AC fora daqui falha na hora. A dívida só pode diminuir — o gate também falha se o baseline
// citar AC que hoje JÁ tem task (obriga a apagar a linha em vez de deixar apodrecer).
//
// Este arquivo deve SUMIR quando a política de artefato for decidida. Regenerar (só com decisão
// explícita): `node scripts/eval-spec-fidelity.mjs --atualizar-baseline`
const BASELINE_PATH = join(ROOT, "specs", "_debt-baseline.json");
const ATUALIZAR = process.argv.includes("--atualizar-baseline");
const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  : {};

let hardFail = 0;
const rows = [];
for (const name of readdirSync(specsDir)) {
  if (!isSpecDir(name)) continue;
  const dir = join(specsDir, name);
  if (!existsSync(join(dir, "spec.md"))) continue;
  const acs = [...acTokens(readFileSync(join(dir, "spec.md"), "utf8"))].sort();
  if (!acs.length) continue;
  const taskACs = existsSync(join(dir, "tasks.md")) ? acTokens(readFileSync(join(dir, "tasks.md"), "utf8")) : new Set();
  const uncovered = acs.filter((ac) => !taskACs.has(ac));
  const noTest = acs.filter((ac) => !codeACs.has(ac));
  const conhecidos = new Set(baseline[name] ?? []);
  const novos = uncovered.filter((ac) => !conhecidos.has(ac));
  // Dívida que já foi paga mas continua no baseline: força a limpeza (o ratchet só aperta).
  const obsoletos = [...conhecidos].filter((ac) => !uncovered.includes(ac)).sort();
  hardFail += novos.length + obsoletos.length;
  rows.push({
    name,
    acs,
    byTask: acs.length - uncovered.length,
    byTest: acs.length - noTest.length,
    uncovered,
    novos,
    obsoletos,
    noTest,
    divida: uncovered.length - novos.length,
  });
}

console.log("\nEval de fidelidade spec→implementação\n");
for (const r of rows) {
  console.log(`  ${r.name}`);
  console.log(`    AC: ${r.acs.length} · por task: ${r.byTask}/${r.acs.length} · em código/teste: ${r.byTest}/${r.acs.length}`);
  if (r.novos.length) console.log(`    ✗ AC sem task (rastreabilidade): ${r.novos.join(", ")}`);
  if (r.obsoletos.length)
    console.log(`    ✗ baseline desatualizado — estes AC já têm task, apague do baseline: ${r.obsoletos.join(", ")}`);
  if (r.divida) console.log(`    · dívida conhecida (baseline): ${r.divida} AC`);
  if (r.noTest.length) console.log(`    ⚠ AC sem referência em teste: ${r.noTest.join(", ")}`);
}
const dividaTotal = rows.reduce((n, r) => n + r.divida, 0);

if (ATUALIZAR) {
  const novo = {};
  for (const r of rows) if (r.uncovered.length) novo[r.name] = r.uncovered;
  writeFileSync(BASELINE_PATH, `${JSON.stringify(novo, null, 2)}\n`);
  console.log(`\n  Baseline regravado: ${Object.keys(novo).length} specs, ${rows.reduce((n, r) => n + r.uncovered.length, 0)} AC.`);
  process.exit(0);
}

console.log(`\n  SPEC_DEVIATION abertos no código: ${deviations}`);
if (dividaTotal)
  console.log(`  Dívida de rastreabilidade no baseline: ${dividaTotal} AC em ${rows.filter((r) => r.divida).length} specs (ver specs/_debt-baseline.json).`);

// Gate que não avalia nada não pode passar verde — foi exatamente assim que o filtro de pasta
// errado ficou meses invisível (auditoria de 2026-08-30). Se `specs/` existe, tem que render
// pelo menos uma spec com AC; zero significa filtro quebrado, não repositório limpo.
if (!rows.length) {
  console.error(
    "\n✗ Nenhuma spec avaliada. `specs/` existe mas nenhuma pasta casou o padrão de nome " +
      "(`E01-S01-*` ou `0001-*`) com `spec.md` contendo ao menos um `AC-N`.\n" +
      "  Isso é falha do gate, não ausência de trabalho — verifique `scripts/lib/spec-dirs.mjs`.\n",
  );
  process.exit(1);
}

if (hardFail) {
  console.error(
    `\n✗ ${hardFail} problema(s) de rastreabilidade fora do baseline — AC sem task, ou baseline desatualizado.\n`,
  );
  process.exit(1);
}
console.log(`\n✓ Rastreabilidade spec→task OK (referência em teste é aviso até implementar).\n`);
