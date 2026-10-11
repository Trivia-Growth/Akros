# Specification Quality Checklist: Cliente 360 operacional

**Created**: 2026-10-02 · **Revisado**: 2026-10-06
**Feature**: [spec.md](../spec.md)
**Estado**: refinado com a resposta do Bruno (2026-10-02); plano revisado, sem implementação.

- [x] Problema, atores e resultado esperado explicitados.
- [x] User stories priorizadas com cenários Given/When/Then e teste independente.
- [x] Requisitos funcionais vinculados aos cenários.
- [x] Métricas mensuráveis propostas para o piloto.
- [x] Casos de erro parcial, concorrência e acesso cruzado identificados.
- [x] Escopo, dependências e hipóteses explícitos.
- [x] Spec descreve comportamento; propostas técnicas ficam em refinamento.md.
- [x] Specs históricas preservadas e referências existentes reutilizadas.
- [x] Público do piloto confirmado: clientes atuais, com piloto pequeno (2026-10-02).
- [x] Tipo de conta Microsoft confirmado: OneDrive empresarial da Akros (2026-10-02).
- [ ] Conta proprietária e pasta autorizada identificadas para preparo técnico da integração.
- [x] Modelo revisado: participantes por papel do programa, com visibilidade por papel (2026-10-06,
  ADR-0018). O mono-titular segue suportado.
- [x] Resposta do Bruno de 2026-10-02 comparada item a item; conflitos resolvidos e registrados em
  `refinamento.md`.
- [x] Fronteira definida: IA de apoio em E07-S05; pagamentos externos em E10-S03/E10-S05; comunicação
  centralizada em E08-S04/S05; advogado parceiro em story própria.
- [x] ADR-0018 escrito e aceito (acesso por participação e visibilidade por papel).
- [ ] Manual do visto R escrito e cadastrado como programa — **bloqueia o piloto do R**.
- [ ] Perguntas devolvidas ao Bruno respondidas (liberação automática de fase, formato de entrada do
  contrato, autoria do manual do R, APIs de pagamento/WhatsApp, pasta do advogado).
- [x] ADR-0019 escrito e aceito (OneDrive: OAuth delegado, recebimento durável, transferência com lease).
- [x] `design-tecnico.md` fixa nomes de schema, tabela, coluna, policy, função SQL, Edge Function,
  bucket, estados e arquivos de tela (2026-10-11).
- [x] `tasks.md` gerado: 140 tarefas por user story, com gates e fase de rollout (2026-10-11).
- [x] Ausência de marcadores NEEDS CLARIFICATION na spec.
- [ ] Revisão do conjunto de escopo e metas propostas com usuário antes de implementar.

Nota: pronta para elaborar plano proposto. Exercício da integração real exige conta/pasta autorizadas;
implementação exige revisão dos artefatos e fechamento dos gates técnicos previstos no plano.
