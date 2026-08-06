---
name: DESIGN
description: Modelo de Programa de Visto — entidades, portas e instanciação da jornada a partir do template.
story: E06-S01
alwaysApply: false
---

# DESIGN — Programa de Visto (E06-S01)

Tier **arquitetural** (ADR-0004). Novo bounded context `programas`. Tudo que hoje é
`criarFasesTemplate()` passa a ser dado.

## Fluxo

```
Admin abre caso (E06-S03)
   → ProgramaRepository.obter(codigo)          // Programa + versão
   → instanciarJornada(programa, clienteId)    // use case puro, sem I/O
   → JornadaRepository.criar(jornada)
   → Jornada { programaId, programaVersao, fases: [...] }   // congelada nesta versão
```

## Entidades — `features/programas/domain/types.ts`

```ts
export type SujeitoPrograma = "individuo" | "organizacao";
export type CategoriaPrograma = "imigrante" | "nao_imigrante";

export interface RequisitoDocumento {
  id: string;
  faseTemplateId: string;
  tipo: TipoDocumento;          // tipado — ver E07-S01
  titulo: string;               // chave i18n
  objetivo: string;             // chave i18n — "para que serve", usado pela IA e pelo cliente
  obrigatorio: boolean;
  emitidoPor: "cliente" | "empregador" | "instituicao" | "terceiro_certificado";
  aceitaSubstituto?: string[];  // ids de requisitos que este pode substituir
}

export interface EtapaTemplate {
  id: string;
  titulo: string;               // chave i18n
  descricao: string;            // chave i18n
  prazoMedioDiasUteis?: number;
  responsavel: ResponsavelEtapa; // ver E09-S01
  requisitosDocumento?: string[];
}

export interface FaseTemplate {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string;
  etapas: EtapaTemplate[];
}

export interface Programa {
  id: string;
  codigo: string;               // "eb2-niw" | "religioso-r-eb4"
  nome: string;
  categoria: CategoriaPrograma;
  sujeito: SujeitoPrograma;
  versao: string;               // semver simples: "1.0"
  ativo: boolean;
  fasesTemplate: FaseTemplate[];
  documentosExigidos: RequisitoDocumento[];
}
```

## Porta — `features/programas/application/ports.ts`

```ts
export interface ProgramaRepository {
  listar(apenasAtivos?: boolean): Promise<Programa[]>;
  obterPorCodigo(codigo: string): Promise<Programa | null>;
}
```

Adapter desta fase: `MockProgramaRepository` sobre `mocks/programas/`.

## Use case — `features/programas/application/instanciar-jornada.ts`

```ts
export function instanciarJornada(programa: Programa, clienteId: string): Jornada
```
Puro, sem I/O, testável direto. Regras:
- Fase de `ordem === 0` nasce `liberada`; todas as demais nascem `bloqueada` (gate do E03-S03 é
  preservado — este épico não afrouxa o unlock).
- `Jornada.programaVersao = programa.versao` — **congelada**. Alterar o programa não altera
  jornadas existentes.
- Cada `EtapaTemplate.requisitosDocumento` gera os `Documento` em status `pendente` do cliente.

## Impacto no que já existe

| Hoje | Depois |
|---|---|
| `mocks/jornada-template.ts` → `criarFasesTemplate()` | vira o dado do programa `eb2-niw@1.0` |
| `Cliente.tipoVisto: string` | `Cliente.programaId` + `programaVersao` (mantém `tipoVisto` como rótulo de exibição) |
| `Documento.tipo: string` livre | `Documento.tipo: TipoDocumento` + `requisitoId` |
| `Jornada` construída no seed | `Jornada` instanciada por `instanciarJornada()` |

## Regra de dependência
`programas` não importa `jornada` nem `documentos`. O tipo `Jornada` é produzido pelo use case
que **recebe** o programa; se a direção incomodar, o use case mora em `jornada/application/` e
consome `Programa`. Escolha: **`jornada/application/instanciar-jornada.ts`** — `jornada` conhece
`programas`, nunca o contrário.

## i18n
Textos das fases/etapas nos programas são **chaves**, não literais (`programas:eb2niw.fase1.titulo`).
Novo namespace `programas` em `shared/i18n/locales/{pt-BR,en}/programas.json`.
