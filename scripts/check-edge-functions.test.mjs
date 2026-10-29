import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/check-edge-functions.mjs");

function fixture({
  folder = true,
  declared = true,
  invoke = "literal",
  comRateLimit = true,
  somenteImport = false,
  handlerCompartilhado = null, // null | "sem-teste" | "teste-sem-429" | "com-teste-429"
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "edge-gate-"));
  mkdirSync(join(root, "supabase", "functions"), { recursive: true });
  mkdirSync(join(root, "apps", "web", "src"), { recursive: true });
  if (folder) {
    mkdirSync(join(root, "supabase", "functions", "demo"));
    writeFileSync(
      join(root, "supabase", "functions", "demo", "index.ts"),
      somenteImport
        ? // AV-06: a palavra está no arquivo (import e comentário), mas ninguém chama.
          'import { checarLimite } from "../_shared/rate-limit.ts";\n// await checarLimite({}) — removido\nconst limite = { permitido: true };\n'
        : comRateLimit
          ? 'import { checarLimite } from "../_shared/rate-limit.ts";\nawait checarLimite({});\n'
          : "serve(() => new Response(null));\n",
    );
  }
  if (handlerCompartilhado) {
    mkdirSync(join(root, "supabase", "functions", "_shared"), { recursive: true });
    writeFileSync(
      join(root, "supabase", "functions", "_shared", "painel.ts"),
      "export const h = (io) => async (req) => { const limite = await io.limite(req); return limite; };\n",
    );
    if (handlerCompartilhado !== "sem-teste") {
      writeFileSync(
        join(root, "supabase", "functions", "_shared", "painel.test.ts"),
        handlerCompartilhado === "com-teste-429"
          ? 'import { h } from "./painel.ts";\nassertEquals((await h(io)(req)).status, 429);\n'
          : 'import { h } from "./painel.ts";\nassertEquals((await h(io)(req)).status, 200);\n',
      );
    }
  }
  writeFileSync(
    join(root, "supabase", "config.toml"),
    declared ? "[functions.demo]\nverify_jwt = true\n" : "",
  );
  const call =
    invoke === "literal"
      ? 'supabase.functions.invoke("demo")'
      : invoke === "missing"
        ? 'supabase.functions.invoke("ausente")'
        : "supabase.functions.invoke(nome)";
  writeFileSync(join(root, "apps", "web", "src", "adapter.ts"), call);
  return root;
}

function run(root) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, root], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: stdout };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}`,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("aceita função existente, declarada e invocada", () => {
  assert.equal(run(fixture()).ok, true);
});

test("falha para pasta sem declaração", () => {
  const result = run(fixture({ declared: false }));
  assert.equal(result.ok, false);
  assert.match(result.output, /Função órfã/);
});

test("falha para invoke literal sem pasta", () => {
  const result = run(fixture({ invoke: "missing" }));
  assert.equal(result.ok, false);
  assert.match(result.output, /não corresponde/);
});

test("invoke dinâmico é aviso, não falso positivo", () => {
  const result = run(fixture({ invoke: "dynamic" }));
  assert.equal(result.ok, true);
});

// E14-S01 AC-6: `seguranca/os-grade.md` pede rate limit em função pública, e a regra sobreviveu
// meses sem gate — `grep -rn "rate|limit" supabase/functions/` não devolvia nada.
test("falha para função pública sem chamada a checarLimite", () => {
  const result = run(fixture({ comRateLimit: false }));
  assert.equal(result.ok, false);
  assert.match(result.output, /Função sem rate limit/);
});

test("função com rate limit passa", () => {
  assert.equal(run(fixture({ comRateLimit: true })).ok, true);
});

// AC-2 (E00-S06): zero funções varridas é caminho quebrado, não "sem funções" — o gate falha.
test("falha quando não há nenhuma função (coleção vazia)", () => {
  const result = run(fixture({ folder: false }));
  assert.equal(result.ok, false);
  assert.match(result.output, /nenhuma pasta de função/);
});

// AV-06: o gate já passou verde com a chamada trocada por `{ permitido: true }` e o import deixado.
test("falha quando checarLimite só aparece em import e comentário (não é chamado)", () => {
  const result = run(fixture({ somenteImport: true }));
  assert.equal(result.ok, false);
  assert.match(result.output, /Função sem rate limit/);
  assert.match(result.output, /CHAMA/);
});

test("handler compartilhado que consulta o limitador sem teste de 429 falha", () => {
  for (const handlerCompartilhado of ["sem-teste", "teste-sem-429"]) {
    const result = run(fixture({ handlerCompartilhado }));
    assert.equal(result.ok, false, handlerCompartilhado);
    assert.match(result.output, /Handler sem prova de 429/, handlerCompartilhado);
  }
});

test("handler compartilhado com teste que afirma 429 passa", () => {
  assert.equal(run(fixture({ handlerCompartilhado: "com-teste-429" })).ok, true);
});
