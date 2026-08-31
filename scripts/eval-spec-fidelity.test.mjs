// Teste do próprio gate. Existe porque `eval-spec-fidelity.mjs` passou meses verde avaliando
// ZERO specs (filtro de pasta `/^\d{4}-/` contra o formato real `E01-S01-*`). Um gate só vale se
// alguém provou que ele SABE FALHAR — ver `scripts/check-edge-functions.test.mjs`, mesma ideia.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/eval-spec-fidelity.mjs");

const SPEC = `---
name: SPEC
description: fixture
alwaysApply: false
---

### AC-1 — primeiro
### AC-2 — segundo
`;

const TASKS = (acs) => `---
name: TASKS
description: fixture
alwaysApply: false
---

${acs.map((ac) => `## Task ${ac} — cobre ${ac}\n**Gate:** \`echo ok\``).join("\n\n")}
`;

/**
 * @param dirName nome da pasta em `specs/` (é o que o filtro do gate testa)
 * @param tasks   ACs cobertos por `tasks.md`; `null` = sem `tasks.md`
 * @param testeAC ACs citados em código/teste fora de `specs/`
 */
function fixture({ dirName = "E01-S01-exemplo", tasks = ["AC-1", "AC-2"], testeAC = [], baseline = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), "eval-spec-"));
  const dir = join(root, "specs", dirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "spec.md"), SPEC);
  if (tasks) writeFileSync(join(dir, "tasks.md"), TASKS(tasks));
  if (baseline)
    writeFileSync(join(root, "specs", "_debt-baseline.json"), JSON.stringify(baseline, null, 2));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "src", "app.test.ts"),
    testeAC.map((ac) => `test("${ac} — cobre", () => {});`).join("\n") || "// sem referência",
  );
  return root;
}

function run(root) {
  try {
    return { ok: true, output: execFileSync(process.execPath, [SCRIPT, root], { encoding: "utf8" }) };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}`,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("reconhece o formato canônico E0N-S0N e avalia a spec", () => {
  const r = run(fixture({ dirName: "E01-S01-exemplo" }));
  assert.equal(r.ok, true);
  assert.match(r.output, /E01-S01-exemplo/);
  assert.match(r.output, /AC: 2 · por task: 2\/2/);
});

test("reconhece o formato numérico legado 0001-", () => {
  const r = run(fixture({ dirName: "0001-exemplo" }));
  assert.equal(r.ok, true);
  assert.match(r.output, /0001-exemplo/);
});

// O teste que dá nome ao arquivo: gate que não avalia nada nunca mais pode passar verde.
test("falha quando avalia zero specs", () => {
  const r = run(fixture({ dirName: "formato-que-nao-casa" }));
  assert.equal(r.ok, false);
  assert.match(r.output, /Nenhuma spec avaliada/);
});

test("falha quando um AC não tem task (rastreabilidade quebrada)", () => {
  const r = run(fixture({ tasks: ["AC-1"] }));
  assert.equal(r.ok, false);
  assert.match(r.output, /AC sem task/);
  assert.match(r.output, /AC-2/);
});

test("AC sem referência em teste é aviso, não falha", () => {
  const r = run(fixture({ testeAC: [] }));
  assert.equal(r.ok, true);
  assert.match(r.output, /AC sem referência em teste/);
});

// ── Ratchet de dívida ────────────────────────────────────────────────────────
// O baseline existe para não parar o trabalho em cima de dívida herdada. Ele só pode APERTAR:
// dívida nomeada passa, dívida nova falha, e dívida já paga tem que sair do arquivo.

test("AC no baseline é dívida conhecida — não falha", () => {
  const r = run(fixture({ tasks: ["AC-1"], baseline: { "E01-S01-exemplo": ["AC-2"] } }));
  assert.equal(r.ok, true);
  assert.match(r.output, /dívida conhecida \(baseline\): 1 AC/);
});

test("AC novo fora do baseline falha mesmo com baseline presente", () => {
  const r = run(fixture({ tasks: [], baseline: { "E01-S01-exemplo": ["AC-2"] } }));
  assert.equal(r.ok, false);
  assert.match(r.output, /AC sem task \(rastreabilidade\): AC-1/);
});

test("baseline que cita AC já coberto falha — obriga a limpar", () => {
  const r = run(fixture({ tasks: ["AC-1", "AC-2"], baseline: { "E01-S01-exemplo": ["AC-2"] } }));
  assert.equal(r.ok, false);
  assert.match(r.output, /baseline desatualizado/);
});
