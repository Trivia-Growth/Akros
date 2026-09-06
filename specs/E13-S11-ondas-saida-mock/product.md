---
name: PRODUCT
description: Saída completa do mock fora do modo demo, ordenada por dependência — E13-S11.
story: E13-S11
alwaysApply: false
---

# product.md — E13-S11 Ondas de saída do mock

## Problema

E13-S10 entregou no projeto real as cinco coleções que impediam a saída do mock. Ainda assim,
fora de `clientes` e da captação pública de lead, telas leem `useMockDb`: dado fictício de todas as
personas segue carregado no browser e qualquer adapter ligado sozinho divide leitura mock de escrita
real.

Em 05/09, inventário remoto mostrou dados reais em clientes, jornadas, documentos, pagamentos,
reuniões, programas e eventos/conversas; `propostas`, contas configuráveis, equipe e transcrições
estão vazias. Mock não pode ser copiado como seed de produção: configurar esses catálogos é trabalho
operacional explícito, não efeito colateral de migration.

## Resultado esperado

Com `VITE_DEMO_MODE=false`, toda leitura e mutação da aplicação passa por portas Supabase e respeita
RLS. `useMockDb`, personas fictícias e `MAPA_ID_REAL_PARA_MOCK` não entram no bundle/caminho real.
Modo demo conserva a experiência fictícia isolada.

## Fora de escopo

- Dados iniciais reais de equipe, integrações e contas conectadas.
- OAuth, Vault, rotação ou leitura de segredo (E14-S02).
- Realtime e LLM de documentos.
- Alterar policy RLS sem nova spec/migration.
