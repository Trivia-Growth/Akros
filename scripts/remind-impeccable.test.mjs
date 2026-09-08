// Teste do próprio script (invariante 1 de specs/E00-S06-invariantes-padrao-os/). Hook de
// pre-push que "avisa, nunca bloqueia" (mesma classe de scripts/check-story.mjs) — sempre sai 0;
// a cobertura prova o conteúdo do aviso por cenário via git real num repositório mkdtemp isolado.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/remind-impeccable.mjs");

function gitRepo() {
  const root = mkdtempSync(join(tmpdir(), "remind-impeccable-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "teste@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Teste"], { cwd: root });
  return root;
}

function stage(root, relPath, conteudo = "x") {
  const abs = join(root, relPath);
  mkdirSync(resolve(abs, ".."), { recursive: true });
  writeFileSync(abs, conteudo);
  execFileSync("git", ["add", relPath], { cwd: root });
}

function run(root) {
  const result = spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout };
}

test("fora de um repositório git: sai 0 sem quebrar (catch silencioso)", () => {
  const root = mkdtempSync(join(tmpdir(), "remind-impeccable-"));
  try {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("sem mudanças em UI staged: sai 0 sem aviso", () => {
  const root = gitRepo();
  try {
    stage(root, "README.md");
    const r = run(root);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("UI staged mas specs/ não existe: sai 0 sem aviso", () => {
  const root = gitRepo();
  try {
    stage(root, "apps/web/src/features/jornada/Foo.tsx");
    const r = run(root);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Guarda no espírito do AC-2 (E00-S06): specs/ existir sem nenhum tasks.md real não pode virar
// "achei task" só porque o diretório existe ou um comando de shell não deu erro.
test("UI staged com specs/ vazia (sem tasks.md): sai 0 sem aviso", () => {
  const root = gitRepo();
  try {
    stage(root, "apps/web/src/features/jornada/Foo.tsx");
    mkdirSync(join(root, "specs", "E01-S01-sem-tasks"), { recursive: true });
    const r = run(root);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("UI staged com tasks.md em spec válida: sai 0 e mostra o aviso de impeccable", () => {
  const root = gitRepo();
  try {
    stage(root, "apps/web/src/features/jornada/Foo.tsx");
    stage(root, "specs/E01-S01-jornada/tasks.md", "# tasks\n");
    const r = run(root);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Mudanças em UI detectadas/);
    assert.match(r.stdout, /impeccable/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
