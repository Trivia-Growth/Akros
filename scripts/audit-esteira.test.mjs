// Teste do próprio gate — mesma razão de `eval-spec-fidelity.test.mjs`: o filtro de pasta de spec
// estava errado e a checagem de "feature sem spec.md" varria lista vazia sem ninguém notar.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/audit-esteira.mjs");

const doc = (corpo = "") => `---
name: FIXTURE
description: fixture de teste
alwaysApply: false
---

${corpo}
`;

/**
 * @param specDir  nome da pasta em `specs/`; `null` = não cria nenhuma
 * @param comSpec  se a pasta tem `spec.md`
 * @param corpo    corpo do doc de raiz (para testar citação de caminho)
 * @param docsMd   arquivos a criar em `docs/`
 */
function fixture({
  specDir = "E01-S01-exemplo",
  comSpec = true,
  corpo = "",
  docsMd = [],
  scripts = { "ci:local": "lefthook run pre-push" },
  tier = "pequeno",
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "audit-esteira-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fx", scripts }, null, 2));
  writeFileSync(join(root, "GUIA.md"), doc(corpo));
  for (const nome of docsMd) writeFileSync(join(root, "docs", nome), doc());
  if (specDir) {
    const dir = join(root, "specs", specDir);
    mkdirSync(dir, { recursive: true });
    if (comSpec) {
      const fm = tier === null ? "" : `tier: ${tier}\n`;
      writeFileSync(
        join(dir, "spec.md"),
        `---\nname: SPEC\ndescription: fixture\n${fm}alwaysApply: false\n---\n\n### AC-1 — algo\n`,
      );
    }
  } else {
    mkdirSync(join(root, "specs"), { recursive: true });
  }
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

test("repositório íntegro passa", () => {
  assert.equal(run(fixture()).ok, true);
});

test("falha para doc sem frontmatter", () => {
  const root = fixture();
  writeFileSync(join(root, "SEM-FM.md"), "# sem frontmatter\n");
  const r = run(root);
  assert.equal(r.ok, false);
  assert.match(r.output, /sem frontmatter/);
});

test("falha para feature sem spec.md — no formato canônico E0N-S0N", () => {
  const r = run(fixture({ comSpec: false }));
  assert.equal(r.ok, false);
  assert.match(r.output, /feature sem `spec\.md`/);
});

test("falha quando nenhuma pasta de feature é reconhecida", () => {
  const r = run(fixture({ specDir: "formato-que-nao-casa" }));
  assert.equal(r.ok, false);
  assert.match(r.output, /nenhuma pasta de feature reconhecida/);
});

// A checagem que faltava: `docs/SECURITY_DEBT.md` era citado por 13 documentos e não existia.
// As menções eram prosa e crase, não `[link](caminho)`, então a checagem de link não via nada.
test("falha quando um doc cita caminho docs/*.md inexistente fora de link markdown", () => {
  const r = run(fixture({ corpo: "Registre a dívida em `docs/SECURITY_DEBT.md` antes do deploy." }));
  assert.equal(r.ok, false);
  assert.match(r.output, /cita caminho inexistente → docs\/SECURITY_DEBT\.md/);
});

test("caminho docs/*.md que existe não acusa", () => {
  const r = run(fixture({ corpo: "Ver `docs/SECURITY_DEBT.md`.", docsMd: ["SECURITY_DEBT.md"] }));
  assert.equal(r.ok, true);
});

test("placeholder de caminho não vira falso positivo", () => {
  const r = run(fixture({ corpo: "Crie `docs/adr/NNNN-titulo.md` ao decidir." }));
  assert.equal(r.ok, true);
});

// Achado do próprio gate ao ser aplicado: a skill /handoff cita `docs/state-historico/AAAA-MM.md`
// como molde de nome de arquivo. Data também é placeholder.
test("molde de data no caminho não vira falso positivo", () => {
  const r = run(fixture({ corpo: "Arquive em `docs/state-historico/AAAA-MM.md`." }));
  assert.equal(r.ok, true);
});

// O README era o único documento fora de qualquer gate (NO_FRONTMATTER_OK) e por isso mandava
// rodar `pnpm run prepare-hooks` e `pnpm run eval:spec-fidelity`, que nunca existiram.
test("falha quando um doc cita `pnpm run <script>` que não existe", () => {
  const r = run(fixture({ corpo: "Instale com `pnpm run prepare-hooks`." }));
  assert.equal(r.ok, false);
  assert.match(r.output, /cita script inexistente → pnpm run prepare-hooks/);
});

test("script declarado no package.json não acusa", () => {
  const r = run(fixture({ corpo: "Rode `pnpm run ci:local` antes do push." }));
  assert.equal(r.ok, true);
});

// `pnpm <nome>` sem `run` casaria prosa em português: "monorepo pnpm já existe" → `pnpm já`.
test("prosa com a palavra pnpm não vira falso positivo", () => {
  const r = run(fixture({ corpo: "O monorepo pnpm já existe; veja `pnpm-workspace.yaml`." }));
  assert.equal(r.ok, true);
});

// ADR-0011: sem tier declarado nenhum gate consegue exigir o artefato certo.
test("falha para spec sem `tier` no frontmatter", () => {
  const r = run(fixture({ tier: null }));
  assert.equal(r.ok, false);
  assert.match(r.output, /spec sem `tier` no frontmatter/);
});

test("falha para tier com valor inválido", () => {
  const r = run(fixture({ tier: "medio" }));
  assert.equal(r.ok, false);
  assert.match(r.output, /tier inválido: medio/);
});
