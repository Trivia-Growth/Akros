# Contrato: `definir_ia_apoio` (nova ação em `caso-comandos`)

FR-010 — liga/desliga a IA de apoio por caso. Mesmo padrão das demais ações de `caso-comandos`
(admin-only via `requireAdmin`, Zod `.strict()`, idempotência).

```ts
{
  acao: "definir_ia_apoio",
  clienteId: string, // uuid
  ativa: boolean,
  idempotencyKey: string,
}
```

**RPC**: `crm.definir_ia_apoio(p_cliente_id uuid, p_ativa boolean, p_autor_id uuid)` — mesmo
template `SECURITY DEFINER` das demais RPCs da feature (guarda `service_role` primeiro, depois
`set_config` com o autor real para o audit automático capturar quem desligou).

**Resposta**: `201`/`200` com a linha de `crm.clientes` atualizada (ou só `{ clienteId, ativa }` —
decidir no `/speckit-tasks` conforme o que a UI realmente precisa, para não devolver mais dado do
cliente do que o necessário).

**Efeito imediato**: `documento-ocr-cruzamento` e `documento-rascunho-resposta` (jobs manuais)
recusam com 422 quando `ia_apoio_ativa = false` no momento da chamada — não existe fila
pendente que "ainda vai processar" depois de desligado, porque essas duas etapas são disparadas
manualmente, nunca automáticas (ver `jobs-assincronos.md`). `documento-pre-analisar` (US1) não
verifica esse flag — a pré-análise local nunca chama IA nem rede externa, então desligar a IA de
apoio não precisa impedi-la.
