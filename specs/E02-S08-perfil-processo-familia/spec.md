---
name: SPEC
description: Perfil do cliente ganha dados do processo (nome legal, passaporte, estado civil) e família (dependentes, incluir no processo).
story: E02-S08
tier: pequeno
alwaysApply: false
---

# SPEC — Perfil evolui: dados do processo + família (E02-S08)

## User Story
Como **cliente**, quero **preencher no meu perfil os dados que a petição exige — inclusive de
quem vai comigo no processo**, para que **a Akros tenha tudo sem eu precisar mandar por e-mail**.

## Contexto
Estende `E02-S07` (Perfil do cliente, hoje só nome/e-mail/telefone/idioma). `Cliente` ganha
`perfilImigratorio` (opcional, aninhado) com dados pessoais + `familiares: Familiar[]`.

## Acceptance Criteria

### AC-1: Dados do processo
```gherkin
Given /portal/perfil, aba "Dados do processo"
When preencho nome legal, nascimento, país de nascimento, nacionalidade, passaporte e validade,
     estado civil e endereço atual
Then salvar persiste tudo no cliente (mesma ação de atualizar já usada pros dados básicos)
```

### AC-2: Família — só quando o programa é sobre indivíduo
```gherkin
Given um cliente cujo programa tem sujeito "individuo" (ex.: EB-2 NIW)
When abro o perfil
Then vejo a aba "Família"
And um cliente de programa com sujeito "organizacao" (ex.: religioso) não vê essa aba
```

### AC-3: Cadastrar dependente
```gherkin
Given a aba "Família"
When adiciono um familiar (nome, parentesco, nascimento, nacionalidade) e marco
     "incluir no processo"
Then ele aparece na lista e persiste ao salvar
```

### AC-4: Admin vê o resumo
```gherkin
Given o Cliente 360 (admin), aba "Dados"
When o cliente já preencheu o perfil imigratório
Then vejo um resumo somente-leitura dos dados do processo e da família, incluindo quem está
     marcado "incluído no processo"
And sem preenchimento ainda, vejo um aviso claro em vez de campos vazios
```

## Out of Scope
- Upload de documento do familiar (ex.: certidão de nascimento) — isso é o fluxo de documentos
  (E02-S03/E06), não este perfil.
- Validação de formato de passaporte/data — mock aceita qualquer texto.

## Notas de implementação
- `PerfilImigratorio`/`Familiar` em `features/crm/domain/types.ts`, aninhados em `Cliente` —
  reaproveita `container.clientes.atualizar` (já genérico, `Partial<Cliente>`), sem action nova.
- `mostraFamilia` consulta `programas` pelo `cliente.programaId` e olha `sujeito` — sem hardcode
  de qual programa é qual.
