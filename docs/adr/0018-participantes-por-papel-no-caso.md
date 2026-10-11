---
name: adr-0018-participantes-por-papel-no-caso
description: Acesso ao caso passa a ser por participação com papel definido pelo programa de visto, e a visibilidade de documento segue esse papel. Mantém single-tenant (ADR-0009) e troca o predicado "cliente_id do claim" por "participação ativa no caso".
alwaysApply: false
---

# ADR-0018 — Participantes por papel no caso e visibilidade por papel

> **ADRs são imutáveis.** Não edite este arquivo; se a decisão mudar, crie um ADR que o substitua.

**Status:** Aceito
**Data:** 2026-10-06
**Decisores:** Lucas Azevedo (Akros/Trívia Studio), a partir da resposta de Bruno Luz de 2026-10-02
**Relacionados:** ADR-0004 (programa de visto como dado versionado), ADR-0009 (single-tenant),
ADR-0014 (admin edita o programa inteiro; congelamento por `programaVersao`),
`specs/005-cliente-360-operacional/` (E03-S07), `specs/002-login-convite-supabase/` (E12-S04)

## Contexto

Até 2026-10-02 a decisão de escopo da E03-S07 era **um processo por cliente/família com acesso
apenas do titular**. O ADR-0009 fixou o isolamento em duas dimensões — papel (`cliente`/time) e
`cliente_id` resolvido do claim do JWT.

A resposta do Bruno de 2026-10-02 mostrou que esse modelo não representa parte da carteira, e que
isso é **característica do programa de visto**, não da dinâmica de trabalho:

- **EB-2 NIW**: aplicante e beneficiário são a mesma pessoa; cônjuge pode participar para ajudar na
  organização.
- **Visto R**: a **igreja é a aplicante** e o indivíduo é o **beneficiário**. Documentos são pedidos
  a um e a outro; a comunicação às vezes é conjunta, às vezes separada.
- **EB-3 e demais vistos com empregador**: a empresa fornece documentos (fiscais, faturamento) que
  **não podem ser vistos pelo empregado**.

O piloto da E03-S07 passou a incluir o visto R por decisão de 2026-10-06. Com isso o modelo
multi-participante deixa de ser evolução futura e entra no MVP: sem ele o piloto do R não existe,
e com ele um predicado de RLS errado vaza documento fiscal de empresa para o beneficiário.

A decisão precisa sair **antes da primeira migration desta feature**. Trocar o predicado de acesso
depois de existir documento real de imigração custa backfill sobre PII e janela com risco de
leitura cruzada — exatamente o custo que o ADR-0009 evitou ao fechar `org_id` no banco vazio.

## Decisão

**O acesso de quem não é do time da Akros passa a ser por participação ativa em um caso, com papel
definido pela versão do programa do caso. A visibilidade de solicitação, documento e arquivo segue
esse papel.**

O que passa a valer:

1. **`Participante` é entidade do caso.** Um caso tem N participantes; cada participante tem um
   **papel** (`aplicante`, `beneficiario`, `organizacao_aplicante`, `familiar_apoio`), um sujeito
   (pessoa ou organização) e, opcionalmente, um vínculo de acesso ao portal. Participante **sem
   acesso** é legítimo: existe para receber solicitação e aparecer no 360, sem login.
2. **Os papéis e as regras de visibilidade são do programa, versionados.** O catálogo de programas
   (ADR-0004) declara quais papéis existem, quais são obrigatórios, a quem cada requisito é dirigido
   e qual requisito é **restrito** a um papel. O caso congela a `programaVersao` escolhida
   (ADR-0014): mudar o programa depois **não** altera caso em andamento.
3. **O predicado de autorização passa a ser a participação, não o claim de cliente.** Toda leitura e
   escrita do portal resolve `(usuário autenticado → participação ativa → caso)` no servidor.
   Nenhum identificador de caso, participante ou papel vem do browser como fonte de autoridade.
4. **Visibilidade restrita é negada no banco, não na UI.** Requisito/documento restrito a um papel
   não aparece em listagem, não é consultável por ID, não é baixável e não revela nome, tamanho nem
   metadados a participante de outro papel. RLS FORCE com predicado por participação + papel, mais
   verificação no comando de download.
5. **Papel não concede autoridade de equipe.** Nenhum participante aprova documento, conclui etapa,
   libera fase, altera cobrança ou confirma pagamento, qualquer que seja o papel.
6. **Toda a equipe da Akros alcança o caso inteiro.** Responsável interno é atribuição de trabalho,
   não restrição de leitura: a relação do cliente é com a Akros, não com uma pessoa.
7. **Convite e revogação são por participante** (E12-S04), com papel explícito. Revogar um
   participante não afeta os demais, e o histórico registra quem convidou, quando e com que papel.
8. **Continua single-tenant.** Nenhuma tabela recebe `org_id`. A `organizacao_aplicante` (igreja,
   empresa) é **sujeito do caso**, não inquilino da plataforma: não traz catálogo próprio, não
   agrupa casos para fins de isolamento e não existe fora do caso que a referencia. O ADR-0009
   segue valendo no que fechou — o que este ADR troca é só a expressão da dimensão "por cliente".

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| **A — Participação com papel do programa (escolhida)** | Representa R, EB-3 e EB-2 com um modelo só; visibilidade vira dado do programa, não `if` espalhado; piloto do R viável | Predicado de RLS mais longo e matriz de autorização com um eixo a mais; exige teste de papel por requisito | Sem ela o piloto decidido em 2026-10-06 não existe, e o modelo entraria depois com backfill sobre PII |
| **B — Manter titular único e tratar igreja/empresa como "familiar"** | Zero mudança de schema agora | Beneficiário passa a ver documento fiscal da empresa, que é justamente o que não pode; "família" mentindo sobre o domínio polui a linguagem ubíqua | Rejeitada: cria vazamento por desenho |
| **C — Um caso por participante, ligados por referência** | Isolamento trivial por caso | Duplica jornada, fase e prazo do mesmo processo; carteira passa a contar o mesmo caso duas vezes; conciliar avanço entre os dois casos é trabalho manual novo | Rejeitada: resolve autorização quebrando a unidade do processo |
| **D — Papel por caso, escolhido na mão pela equipe** | Flexível | A mesma regra passa a ser redigitada caso a caso, e errar um clique vaza documento restrito; Bruno descreveu a regra como característica do visto | Rejeitada: regra de visto é dado do programa (ADR-0004) |

## Consequências

**Positivas**
- O piloto do visto R (igreja + beneficiário) e os vistos com empregador cabem no produto sem
  segundo cadastro nem jornada duplicada.
- Visibilidade restrita passa a ser verificável: dá para provar por teste SQL "beneficiário não lê
  requisito restrito à organização" para cada programa, em vez de confiar na tela.
- Convite por papel reusa E12-S04 sem criar portal de parceiros com permissões próprias.

**Negativas / trade-offs aceitos**
- A matriz de autorização cresce: `papel do programa × tipo de requisito × operação`. Cada programa
  novo precisa dos seus testes de visibilidade antes de entrar em piloto.
- O predicado de RLS fica mais longo que o do ADR-0009 (participação + papel + restrição), e
  predicado longo é mais fácil de errar: exige pgTAP por papel, não só por cliente.
- `crm.meu_cliente_id()` deixa de ser suficiente como base de autorização do portal; conviverá com
  o resolvedor de participação durante a migração, o que é dívida a fechar na mesma feature.
- Jornadas históricas (mono-titular) continuam válidas: o modelo admite caso com um único
  participante `aplicante`. Nenhuma jornada antiga é reescrita para ter papéis.
- Advogado parceiro **não** entra como papel de participante aqui: acesso restrito a material do
  processo segue como story própria (pasta filtrada no OneDrive), para não misturar terceiro
  contratado com sujeito do caso.
