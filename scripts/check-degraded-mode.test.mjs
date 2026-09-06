// Teste do próprio gate (invariante 1 de specs/E00-S06-invariantes-padrao-os/, forma de
// scripts/check-edge-functions.test.mjs): fixture em mkdtemp, execFileSync capturando exit code,
// um test() por modo de falha.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/check-degraded-mode.mjs");

/**
 * Monta specs/<pasta>/design.md. @param designs mapa pasta → conteúdo do design.md
 * (frontmatter incluso; `integracoes: null` monta frontmatter SEM a chave).
 */
function fixture(designs) {
  const root = mkdtempSync(join(tmpdir(), "degraded-gate-"));
  for (const [pasta, corpo] of Object.entries(designs)) {
    mkdirSync(join(root, "specs", pasta), { recursive: true });
    writeFileSync(join(root, "specs", pasta, "design.md"), corpo);
  }
  return root;
}

const FM = (integracoes) =>
  "---\nname: DESIGN\ndescription: fixture\nstory: E04-S01\nalwaysApply: false\n" +
  (integracoes === null ? "" : `integracoes: ${integracoes}\n`) +
  "---\n\n# DESIGN — fixture\n\n";

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

test("design com integração e seção que a menciona passa", () => {
  const r = run(
    fixture({
      "E04-S01-whatsapp": FM("[whatsapp]") + "## Modo degradado\n\nSem WhatsApp, o inbox segue com os demais canais.\n",
    }),
  );
  assert.equal(r.ok, true, r.output);
});

test("design sem `integracoes:` no frontmatter é ignorado", () => {
  const r = run(
    fixture({
      "E06-S01-modelo-programa": FM(null) + "## Decisões\n\nNada de integração aqui.\n",
      "E04-S01-whatsapp": FM("[whatsapp]") + "## Modo degradado\n\nWhatsApp fora: fila pausada.\n",
    }),
  );
  assert.equal(r.ok, true, r.output);
});

test("falha para integração sem seção de modo degradado", () => {
  const r = run(fixture({ "E04-S01-whatsapp": FM("[whatsapp]") + "## Outra coisa\n\nSem seção.\n" }));
  assert.equal(r.ok, false);
  assert.match(r.output, /não tem seção "Modo degradado"/);
});

test("falha quando a seção não menciona o slug declarado", () => {
  const r = run(
    fixture({
      "E04-S07-agenda-tool-agente":
        FM("[google, calendly]") + "## Modo degradado\n\nSó falo do Calendly aqui.\n",
    }),
  );
  assert.equal(r.ok, false);
  assert.match(r.output, /não menciona 'google'/);
});

test("aceita nome legível no lugar do slug", () => {
  const r = run(
    fixture({
      "E04-S07-agenda-tool-agente":
        FM("[google, microsoft]") + "## Modo degradado\n\nGmail fora: eventos ficam só no banco.\nOutlook fora: idem.\n",
    }),
  );
  assert.equal(r.ok, true, r.output);
});

test("falha para `integracoes:` vazio", () => {
  const r = run(fixture({ "E04-S01-whatsapp": FM("[]") + "## Modo degradado\n\nWhatsApp fora.\n" }));
  assert.equal(r.ok, false);
  assert.match(r.output, /`integracoes:` vazio/);
});

// Guarda AC-2 (E00-S06): repo varrendo zero integrações é filtro quebrado, nunca sucesso.
test("falha quando nenhuma integração é declarada em lugar nenhum", () => {
  const r = run(fixture({ "E06-S01-modelo-programa": FM(null) + "## Decisões\n\nNada.\n" }));
  assert.equal(r.ok, false);
  assert.match(r.output, /nenhuma integração declarada/);
});

test("falha quando não há nenhum design.md (coleção vazia)", () => {
  const root = mkdtempSync(join(tmpdir(), "degraded-gate-"));
  mkdirSync(join(root, "specs", "E04-S01-whatsapp"), { recursive: true });
  const r = run(root);
  assert.equal(r.ok, false);
  assert.match(r.output, /nenhum design\.md encontrado/);
});
