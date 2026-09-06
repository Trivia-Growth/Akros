---
name: PRODUCT
description: Por que as cinco tabelas que faltam bloqueiam a saída do mock — E13-S10.
story: E13-S10
alwaysApply: false
---

# product.md — E13-S10 Onda 0: tabelas ausentes

## Problema

E13-S01..S09 criaram os dados centrais de cliente, jornada, documentos, pagamentos, agenda e
comunicação, mas cinco coleções carregadas pela UI ainda não têm destino real:
`propostas`, `integracoes`, `contasAgenda`, `contasCanal` e `equipeAkros`.

Sem elas, desligar `useMockDb` fora do modo demo é impossível: `ConfiguracoesPage` sozinha precisa
de quatro coleções; propostas conectam o CRM a lead ou cliente. Migrar adapters antes do schema
forçaria leitura de uma fonte e escrita em outra, o estado partido medido em E13-S09.

## Quem sente

- **Equipe Akros:** configurações e propostas continuam fictícias, mesmo com clientes reais.
- **Cliente:** ainda depende de uma store que mantém personas fictícias na memória do browser.
- **Operação:** não consegue mover as telas por onda, pois não há FK/código canônico para conectar.

## Resultado esperado

Cinco coleções persistentes, com RLS admin-only, auditoria e relações explícitas. A migration só
cria estrutura: não transporta mocks, não habilita adapters e não armazena tokens. E13-S11 fará a
migração de dados, adapters, hooks e telas por onda.

## Fora de escopo

- Mover telas ou adapters para Supabase.
- Copiar dados fictícios de `apps/web/src/mocks/` para produção.
- Salvar credenciais OAuth/API; segredo continua bloqueado por E14-S02/Vault.
- Tornar propostas visíveis no portal do cliente; política própria exige decisão de produto.
