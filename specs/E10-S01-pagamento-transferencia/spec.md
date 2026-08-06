---
name: SPEC
description: Pagamento por transferência bancária/internacional — sem gateway; dados de recebimento fictícios, cliente anexa comprovante, Akros confirma.
story: E10-S01
tier: pequeno
alwaysApply: false
---

# SPEC — Pagamento por transferência (E10-S01)

## User Story
Como **cliente**, quero **ver exatamente para onde transferir e anexar meu comprovante**, para
que **meu pagamento seja reconhecido sem eu depender de mandar e-mail avulso**.

## Contexto
Decisão explícita da Akros para esta rodada: **sem gateway de pagamento**. O cliente recebe os
dados de uma conta (nacional ou internacional, conforme moeda) e transfere por fora; a plataforma
existe para tornar esse fluxo rastreável — dados de recebimento claros, upload de comprovante,
conciliação manual pela equipe. Não há cartão, não há cobrança recorrente automática nesta rodada
(ver `docs/epics/ROADMAP.md`, itens fora de escopo).

**Todos os dados bancários usados nesta spec e nas fixtures são fictícios**, para fins de
demonstração. Nunca usar dado bancário real da Akros no protótipo.

## Dados de recebimento (fixture fictícia)
```ts
interface DadosRecebimento {
  moeda: "BRL" | "USD";
  titular: string;          // "Akros Immigration Solutions LLC" (fictício)
  banco: string;
  agencia?: string;         // BRL
  conta?: string;           // BRL
  chavePix?: string;        // BRL
  routingNumber?: string;   // USD
  accountNumber?: string;   // USD
  swift?: string;           // USD, transferência internacional
  instrucoes?: string;      // ex.: "usar o ID do pagamento como referência"
}
```

## Acceptance Criteria

### AC-1: Dados de recebimento por moeda
```gherkin
Given  um pagamento pendente em BRL
When   abro o pagamento no portal
Then   vejo os dados de recebimento em BRL (banco, agência, conta, chave Pix)
And    vejo o valor, o ID do pagamento e a instrução de usar esse ID como referência
```
```gherkin
Given  um pagamento pendente em USD
When   abro o pagamento
Then   vejo os dados de recebimento internacionais (routing number, account number, SWIFT)
And    vejo o mesmo aviso de referência
```

### AC-2: Cliente anexa comprovante
```gherkin
Given  um pagamento pendente
When   faço upload do comprovante de transferência
Then   o pagamento muda para "em_conferencia"
And    o comprovante fica anexado ao pagamento, visível para a equipe
And    o evento entra na timeline do cliente (E08-S01)
```

### AC-3: Equipe confirma manualmente
```gherkin
Given  um pagamento "em_conferencia"
When   o admin confere o comprovante e confirma
Then   o pagamento muda para "pago", com autor e data da confirmação
And    o cliente vê a confirmação no portal
```

### AC-4: Divergência de valor é sinalizada, não escondida
```gherkin
Given  um comprovante anexado
When   o admin registra que o valor recebido diverge do valor devido
Then   o pagamento vai para um estado "divergente" com o valor recebido e a diferença visíveis
And    o cliente é avisado com o que falta ou o que foi pago a mais
```

### AC-5: Sem gateway, sem cartão
```gherkin
Given  a tela de pagamento
When   procuro por formulário de cartão ou checkout automático
Then   não existe nenhum
And    a única ação do cliente é ver os dados e anexar comprovante
```

### AC-6: i18n + impeccable
```gherkin
Given  a tela de pagamento
When   troco idioma / avalio design
Then   traduz; dados bancários têm hierarquia clara e são copiáveis; impeccable passa
```

## Out of Scope
- Gateway, cartão salvo, cobrança recorrente automática (E10-S02/S03 do backlog original — não
  entram nesta rodada por decisão do cliente).
- Emissão de fatura/recibo fiscal.
- Conciliação automática (OCR do comprovante, reconciliação bancária via API).

## Notas de implementação
- `PagamentoStatus` ganha `em_conferencia` e `divergente` além dos existentes.
- `DadosRecebimento` é fixture fictícia em `mocks/pagamentos.ts` — nunca dado real.
- Botão "copiar" em cada campo bancário — detalhe pequeno, mas é o que faz a tela ser usável de
  verdade num app de transferência manual.
