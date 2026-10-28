// Nome de pasta de feature em `specs/` — fonte única para os gates da esteira.
//
// Por que existe: `audit-esteira.mjs` e `eval-spec-fidelity.mjs` carregavam cada um a sua cópia
// de `/^\d{4}-/` (formato do template genérico). O Akros nomeia por épico/story (`E01-S01-nome`,
// ver "Convenções de nomeação" no CLAUDE.md), então nenhuma pasta casava e os dois gates
// passavam verdes avaliando ZERO specs. Duas cópias da mesma regra = duas chances de divergir.
//
// `E01-S01-nome` é o formato canônico; `0001-nome` (legado do template `spec-driven`) continua
// aceito para não quebrar repositórios que herdaram a esteira antes desta convenção.
export const SPEC_DIR_RE = /^(?:E\d{2}-S\d{2}|\d{4})-/;

export const isSpecDir = (name) => SPEC_DIR_RE.test(name);
