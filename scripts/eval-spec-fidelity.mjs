#!/usr/bin/env node
// Eval de fidelidade spec→implementação (Padrão OS).
// Para cada specs/E0N-S0N-*/: lê o `tier` do frontmatter da spec, exige os artefatos daquele
// tier (ADR-0011), checa cobertura de AC por task e referência em código/teste, e conta
// SPEC_DEVIATION abertos.
// Falha (exit 1) em artefato faltando ou AC sem task — exceto o que estiver no baseline de dívida.
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

/** Lê o `tier` do frontmatter da spec. `audit-esteira` é quem exige que ele exista. */
function lerTier(texto) {
  if (!texto.startsWith("---")) return null;
  const fim = texto.indexOf("\n---", 3);
  if (fim === -1) return null;
  const m = texto.slice(3, fim).match(/^tier:\s*(\S+)/m);
  return m ? m[1].toLowerCase().replace(/\*/g, "") : null;
}

// ADR-0011 — política de artefato por tier. `spec.md` é pré-requisito para entrar na avaliação,
// então não aparece aqui.
const ARTEFATOS_POR_TIER = {
  trivial: [],
  pequeno: ["tasks.md"],
  arquitetural: ["tasks.md", "product.md", "design.md"],
};

const specsDir = join(ROOT, "specs");
if (!existsSync(specsDir)) { console.log("Sem specs/ — nada a avaliar."); process.exit(0); }

let codeBlob = "";
try { for (const f of walkCode(ROOT)) codeBlob += "\n" + readFileSync(f, "utf8"); } catch {}
const codeACs = acTokens(codeBlob);
const deviations = (codeBlob.match(/SPEC_DEVIATION/g) || []).length;

// ─────────────────────────────────────────────────────────────────────────────
// Baseline de dívida (RATCHET — ver ADR-0011).
//
// Duas dívidas herdadas, medidas quando o filtro de pasta foi corrigido (o gate passava avaliando
// ZERO specs): AC sem task, e artefato que o tier exige e não existe. Falhar em cima disso
// pararia o trabalho sem consertar nada, e gerar os arquivos em massa produziria documentação que
// ninguém escreveu (decisão do dono do produto, ADR-0011).
//
// Ratchet: item listado passa, item novo falha na hora, item já pago que continua listado TAMBÉM
// falha — obriga a apagar a linha. A dívida só encolhe. O arquivo some quando a lista zerar.
//
// Regravar (só com decisão explícita):
//   node scripts/eval-spec-fidelity.mjs --atualizar-baseline
const BASELINE_PATH = join(ROOT, "specs", "_debt-baseline.json");
const ATUALIZAR = process.argv.includes("--atualizar-baseline");
const baselineRaw = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")) : {};
const baseline = {
  acSemTask: baselineRaw.acSemTask ?? {},
  artefatoAusente: baselineRaw.artefatoAusente ?? {},
};

let hardFail = 0;
const rows = [];
for (const name of readdirSync(specsDir)) {
  if (!isSpecDir(name)) continue;
  const dir = join(specsDir, name);
  if (!existsSync(join(dir, "spec.md"))) continue;
  const specTexto = readFileSync(join(dir, "spec.md"), "utf8");
  const tier = lerTier(specTexto) ?? "pequeno"; // audit-esteira exige o campo; aqui só não explode
  const acs = [...acTokens(specTexto)].sort();
  if (!acs.length) continue;

  // ── artefatos exigidos pelo tier (ADR-0011) ──
  const exigidos = ARTEFATOS_POR_TIER[tier] ?? ARTEFATOS_POR_TIER.pequeno;
  const faltando = exigidos.filter((a) => !existsSync(join(dir, a)));
  const artefatoConhecido = new Set(baseline.artefatoAusente[name] ?? []);
  const artefatoNovo = faltando.filter((a) => !artefatoConhecido.has(a));
  const artefatoObsoleto = [...artefatoConhecido].filter((a) => !faltando.includes(a)).sort();

  // ── AC coberto por task ──
  const taskACs = existsSync(join(dir, "tasks.md")) ? acTokens(readFileSync(join(dir, "tasks.md"), "utf8")) : new Set();
  const uncovered = tier === "trivial" ? [] : acs.filter((ac) => !taskACs.has(ac));
  const noTest = acs.filter((ac) => !codeACs.has(ac));
  const conhecidos = new Set(baseline.acSemTask[name] ?? []);
  const novos = uncovered.filter((ac) => !conhecidos.has(ac));
  const obsoletos = [...conhecidos].filter((ac) => !uncovered.includes(ac)).sort();

  hardFail += novos.length + obsoletos.length + artefatoNovo.length + artefatoObsoleto.length;
  rows.push({
    name,
    tier,
    acs,
    byTask: acs.length - uncovered.length,
    byTest: acs.length - noTest.length,
    uncovered,
    novos,
    obsoletos,
    noTest,
    faltando,
    artefatoNovo,
    artefatoObsoleto,
    divida: uncovered.length - novos.length,
    dividaArtefato: faltando.length - artefatoNovo.length,
  });
}

console.log("\nEval de fidelidade spec→implementação\n");
for (const r of rows) {
  console.log(`  ${r.name}  [${r.tier}]`);
  console.log(`    AC: ${r.acs.length} · por task: ${r.byTask}/${r.acs.length} · em código/teste: ${r.byTest}/${r.acs.length}`);
  if (r.artefatoNovo.length)
    console.log(`    ✗ artefato exigido pelo tier '${r.tier}' e ausente: ${r.artefatoNovo.join(", ")}`);
  if (r.artefatoObsoleto.length)
    console.log(`    ✗ baseline desatualizado — estes artefatos já existem, apague do baseline: ${r.artefatoObsoleto.join(", ")}`);
  if (r.dividaArtefato) console.log(`    · artefato em dívida (baseline): ${r.faltando.join(", ")}`);
  if (r.novos.length) console.log(`    ✗ AC sem task (rastreabilidade): ${r.novos.join(", ")}`);
  if (r.obsoletos.length)
    console.log(`    ✗ baseline desatualizado — estes AC já têm task, apague do baseline: ${r.obsoletos.join(", ")}`);
  if (r.divida) console.log(`    · dívida conhecida (baseline): ${r.divida} AC`);
  if (r.noTest.length) console.log(`    ⚠ AC sem referência em teste: ${r.noTest.join(", ")}`);
}
const dividaTotal = rows.reduce((n, r) => n + r.divida, 0);

if (ATUALIZAR) {
  const novo = { acSemTask: {}, artefatoAusente: {} };
  for (const r of rows) {
    if (r.uncovered.length) novo.acSemTask[r.name] = r.uncovered;
    if (r.faltando.length) novo.artefatoAusente[r.name] = r.faltando;
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(novo, null, 2)}\n`);
  console.log(
    `\n  Baseline regravado: ${Object.keys(novo.acSemTask).length} specs com AC sem task, ` +
      `${Object.keys(novo.artefatoAusente).length} com artefato ausente.`,
  );
  process.exit(0);
}

console.log(`\n  SPEC_DEVIATION abertos no código: ${deviations}`);
const dividaArtefatoTotal = rows.reduce((n, r) => n + r.dividaArtefato, 0);
if (dividaTotal)
  console.log(`  Dívida de rastreabilidade no baseline: ${dividaTotal} AC em ${rows.filter((r) => r.divida).length} specs.`);
if (dividaArtefatoTotal)
  console.log(`  Dívida de artefato no baseline: ${dividaArtefatoTotal} arquivo(s) em ${rows.filter((r) => r.dividaArtefato).length} specs.`);
if (dividaTotal || dividaArtefatoTotal)
  console.log("  (ver specs/_debt-baseline.json e ADR-0011 — a lista só encolhe.)");

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
    `\n✗ ${hardFail} problema(s) fora do baseline — artefato exigido pelo tier ausente, AC sem task, ou baseline desatualizado (ADR-0011).\n`,
  );
  process.exit(1);
}
console.log("\n✓ Artefato por tier e rastreabilidade spec→task OK (referência em teste é aviso).\n");
