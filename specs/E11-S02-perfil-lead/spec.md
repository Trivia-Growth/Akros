---
name: SPEC
description: Perfil rico do lead — budget, momento de vida, objetivo e urgência preservados mesmo quando o lead não fecha.
story: E11-S02
tier: pequeno
alwaysApply: false
---

# SPEC — Perfil rico do lead (E11-S02)

## User Story
Como **Akros**, quero **guardar tudo que aprendi sobre um lead mesmo quando ele não fecha**, para
que **daqui a seis meses eu saiba exatamente com quem estou falando**.

## Contexto
Frase do Bruno: "hoje o cara pode não ter budget, mas daqui seis meses pode ter" — e a Akros pode
lançar um produto mais acessível para exatamente esse perfil. Isso só funciona se o dado
estiver estruturado. Nota em campo de texto livre não segmenta.

Hoje `Lead` tem nome, e-mail, telefone, origem, tipo de visto de interesse, profissão, mensagem e
notas. Falta a camada que permite reencontrar esse lead depois.

## Campos novos
```ts
interface PerfilLead {
  formacao?: "medio" | "superior" | "pos" | "mestrado" | "doutorado";
  anosExperiencia?: number;
  areaAtuacao?: string;
  faixaBudget?: "ate_15k" | "15k_30k" | "30k_50k" | "acima_50k" | "nao_informado";
  momentoVida?: "explorando" | "decidido_sem_prazo" | "decidido_com_prazo" | "urgente";
  prazoDesejado?: string;
  familia?: { conjuge: boolean; filhos: number };
  jaTeveVistoNegado?: boolean;
  estaNosEUA?: boolean;
  motivacao?: string;
  objecaoPrincipal?: string;   // por que não fechou — o campo mais valioso da lista
}
```

## Acceptance Criteria

### AC-1: Perfil visível e editável no lead
```gherkin
Given  um lead no kanban
When   abro seu detalhe
Then   vejo o perfil completo, com campos vazios claramente identificados
And    consigo editar qualquer campo manualmente
And    vejo a origem de cada dado: informado pelo lead, inferido pelo bot, ou preenchido pela equipe
```

### AC-2: Qualificação alimenta o perfil
```gherkin
Given  uma qualificação conversacional concluída (E11-S01)
When   olho o perfil
Then   os campos correspondentes estão preenchidos
And    os inferidos pelo bot estão marcados como tal e são confirmáveis por um humano
```

### AC-3: Lead descartado preserva tudo
```gherkin
Given  um lead movido para "descartado"
When   consulto esse lead depois
Then   o perfil completo continua acessível
And    o motivo do descarte e a objeção principal estão registrados
And    a timeline dele continua íntegra
```

### AC-4: Segmentação funciona
```gherkin
Given  a base de leads
When   filtro por faixa de budget, momento de vida, formação e área
Then   recebo a lista correspondente
And    consigo salvar esse recorte como segmento nomeado
```

### AC-5: Perfil segue o lead na conversão
```gherkin
Given  um lead que vira cliente
When   abro o cliente
Then   o perfil está lá, ligado ao caso
And    nenhum dado precisou ser redigitado
```

### AC-6: i18n + impeccable
```gherkin
Given  o perfil
When   troco idioma / avalio design
Then   traduz; o formulário longo tem agrupamento e densidade legíveis; impeccable passa
```

## Out of Scope
- Campanha de reativação (E11-S05).
- Enriquecimento por fonte externa (LinkedIn, etc) — decisão de privacidade própria.

## Notas de implementação
- Estende `shared/contracts/lead.ts`. Todos os campos são opcionais: perfil incompleto é o estado
  normal, não um erro.
- AC-1 (origem do dado) importa: "informado pelo lead" e "chute do bot" não podem ter o mesmo peso
  na hora de decidir.
- LGPD/privacidade: guardar dado de lead perdido por tempo indeterminado tem implicação legal.
  Registrar em `docs/SECURITY_DEBT.md` a pergunta sobre retenção e base legal.
