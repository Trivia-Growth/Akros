// Teste da fitness function de arquitetura (E00-S06 invariante 1 e 3, E15-S01 AC-6).
//
// `pnpm run arch:check` é o único gate que verifica a regra de dependência do CLAUDE.md. Como
// todo gate, ele só vale se alguém já o viu FALHAR — uma regra escrita errado (path que não casa,
// regex invertida) passa verde para sempre sem ninguém notar.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const RAIZ = resolve(".");
const CONFIG = resolve(".dependency-cruiser.cjs");
const DEPCRUISE = resolve("node_modules/.bin/depcruise");

/**
 * Monta uma árvore com os mesmos caminhos que a config espera
 * (`apps/web/src/features/<dominio>/<camada>/`) e roda o depcruise real contra ela.
 * @param arquivos mapa caminho-relativo → conteúdo
 */
function fixture(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), "arch-rules-"));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const destino = join(raiz, rel);
    mkdirSync(join(destino, ".."), { recursive: true });
    writeFileSync(destino, conteudo);
  }
  return raiz;
}

function run(raiz) {
  try {
    const stdout = execFileSync(DEPCRUISE, ["apps/web/src", "--config", CONFIG], {
      cwd: raiz,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: stdout };
  } catch (erro) {
    return {
      ok: false,
      output: `${erro.stdout?.toString() ?? ""}${erro.stderr?.toString() ?? ""}`,
    };
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

test("arvore limpa passa", () => {
  const r = run(
    fixture({
      "apps/web/src/features/site/interfaces/Home.ts": "export const Home = 1;\n",
      "apps/web/src/features/crm/domain/tipos.ts": "export type Lead = { id: string };\n",
    }),
  );
  assert.equal(r.ok, true, r.output);
});

test("falha quando domain/ importa outra camada", () => {
  const r = run(
    fixture({
      "apps/web/src/features/crm/domain/tipos.ts":
        'import { x } from "../infrastructure/repo";\nexport const y = x;\n',
      "apps/web/src/features/crm/infrastructure/repo.ts": "export const x = 1;\n",
    }),
  );
  assert.equal(r.ok, false);
  assert.match(r.output, /domain-nao-importa-camadas/);
});

test("falha quando application/ importa infrastructure/", () => {
  const r = run(
    fixture({
      "apps/web/src/features/crm/application/uso.ts":
        'import { x } from "../infrastructure/repo";\nexport const y = x;\n',
      "apps/web/src/features/crm/infrastructure/repo.ts": "export const x = 1;\n",
    }),
  );
  assert.equal(r.ok, false);
  assert.match(r.output, /application-nao-importa-borda-nem-infra/);
});

// E15-S01 AC-6: a fronteira entre o site institucional e o resto do produto.
// Importa um VALOR de propósito: com `tsPreCompilationDeps` desligado (default), o
// dependency-cruiser só enxerga dependência que sobrevive à compilação — `import type` some.
test("falha quando o site importa outro dominio", () => {
  const r = run(
    fixture({
      "apps/web/src/features/site/interfaces/Home.ts":
        'import { PADRAO } from "../../crm/domain/tipos";\nexport const h = PADRAO;\n',
      "apps/web/src/features/crm/domain/tipos.ts": 'export const PADRAO = "lead";\n',
    }),
  );
  assert.equal(r.ok, false);
  assert.match(r.output, /site-nao-se-mistura-com-o-resto/);
});

test("falha quando outro dominio importa o site", () => {
  const r = run(
    fixture({
      "apps/web/src/features/crm/interfaces/Painel.ts":
        'import { Home } from "../../site/interfaces/Home";\nexport const p = Home;\n',
      "apps/web/src/features/site/interfaces/Home.ts": "export const Home = 1;\n",
    }),
  );
  assert.equal(r.ok, false);
  assert.match(r.output, /resto-nao-importa-site/);
});

// Achado ao escrever este arquivo: com `tsPreCompilationDeps` no default (false) o gate NÃO
// enxerga `import type` — a violação mais fácil de cometer sem perceber passava verde. A opção
// foi ligada; este teste é o que impede alguém de desligá-la de novo sem notar.
test("falha quando domain/ importa TIPO de outra camada", () => {
  const r = run(
    fixture({
      "apps/web/src/features/crm/domain/tipos.ts":
        'import type { Repo } from "../infrastructure/repo";\nexport type Alias = Repo;\n',
      "apps/web/src/features/crm/infrastructure/repo.ts": "export type Repo = { id: string };\n",
    }),
  );
  assert.equal(r.ok, false);
  assert.match(r.output, /domain-nao-importa-camadas/);
});
