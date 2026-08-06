---
name: SPEC
description: Segundo programa — visto religioso (R / EB-4) com jornada e documentos institucionais da igreja.
story: E06-S02
tier: pequeno
alwaysApply: false
---

# SPEC — Programa Visto Religioso R / EB-4 (E06-S02)

## User Story
Como **Akros**, quero **operar o fluxo de visto religioso na mesma plataforma**, para que
**a escalabilidade para outros vistos deixe de ser promessa e vire demonstração**.

## Contexto
É o segundo programa e o **teste real da arquitetura do E06-S01**: se ele entrar só como dado,
sem tocar em componente de UI, o ADR-0004 está provado. Se exigir código novo de jornada, está
refutado — e isso precisa aparecer, não ser contornado.

Diferenças reais em relação ao EB-2 NIW:
- **Sujeito é a organização** (a igreja patrocinadora), não só o indivíduo. O checklist tem
  documentos que **o cliente não emite**: estatuto, comprovante de isenção fiscal (501(c)(3)),
  extratos bancários, demonstrativos financeiros, comprovação de vínculo religioso do beneficiário.
- **Documento sensível.** Igreja compartilhando extrato bancário é exatamente o caso em que um
  portal seguro vale mais que o WhatsApp — argumento comercial, não só técnico.
- Fases mais curtas e sem Business Plan.

## Fases propostas (validar com a Akros antes de congelar)
- **0 · Introdução** — canais, regras de envio, o que a igreja precisa separar.
- **1 · Documentação da instituição** — estatuto, 501(c)(3), extratos e demonstrativos, prova de atividade religiosa.
- **2 · Documentação do beneficiário** — vínculo religioso mínimo de 2 anos, formação/ordenação, experiência.
- **3 · Oferta e formulários** — carta de oferta da instituição, formulários USCIS, taxas.
- **4 · Envio e acompanhamento** — revisão final, envio rastreado, RFE.
- **5 · Pós-aprovação / Relocation.**

## Acceptance Criteria

### AC-1: Programa existe e é lido pela mesma porta
```gherkin
Given  o catálogo de programas
When   chamo ProgramaRepository.obterPorCodigo("religioso-r-eb4")
Then   recebo um Programa ativo com sujeito "organizacao"
And    com fases e requisitos de documento próprios, distintos do EB-2 NIW
```

### AC-2: Jornada religiosa é instanciada sem código novo
```gherkin
Given  o programa "religioso-r-eb4"
When   executo instanciarJornada com um clienteId
Then   a jornada é criada pelo mesmo use case usado no EB-2 NIW
And    nenhum arquivo em features/jornada/interfaces precisou mudar para renderizá-la
```

### AC-3: Checklist institucional aparece no portal
```gherkin
Given  um cliente do programa religioso na fase 1
When   acesso /portal/documentos
Then   vejo documentos institucionais (estatuto, 501(c)(3), extratos, demonstrativos)
And    cada um indica quem emite (instituição, não o cliente)
And    não vejo nenhum documento exclusivo do EB-2 NIW (Business Plan, cartas de recomendação)
```

### AC-4: Persona e cenário de demo
```gherkin
Given  a barra de demo (E05)
When   escolho o cenário "Igreja — visto religioso"
Then   assumo um cliente do programa religioso com jornada na fase 1
And    o admin vê esse caso na base de clientes com o programa correto
```

### AC-5: i18n completo
```gherkin
Given  o programa religioso
When   troco o idioma para inglês
Then   todas as fases, etapas e nomes de documento traduzem
And    nenhuma chave crua aparece na tela
```

## Out of Scope
- Modelagem jurídica definitiva do fluxo R/EB-4 — o conteúdo aqui é uma proposta razoável e
  **precisa de validação da Natalia e da Dra. Denise** antes de virar material de cliente.
- Regras de RLS por organização (segurança de dado de igreja) — entra quando houver backend.

## Notas de implementação
- Só dado: `mocks/programas/religioso-r-eb4.ts` + chaves no namespace `programas`.
- Nova persona + cenário em `mocks/personas.ts` e `mocks/scenarios.ts`.
- Marcar no `spec` de demo que os valores/prazos são estimativas, não dados oficiais.
