---
name: GLOSSARY
description: Linguagem ubíqua do projeto Akros. Termos de domínio + definições de negócio. Atualize ao descobrir novo termo.
alwaysApply: false
---

# Glossary — Akros

**Regra:** Use exatamente os termos aqui. Nenhum sinônimo sem adicionar ao glossário. Novo termo → atualize aqui no mesmo PR.

## Imigração / Vistos (domínio de negócio)

**EB-2 NIW (National Interest Waiver):** Green Card baseado em emprego para profissionais com
habilidades excepcionais/formação avançada, **sem necessidade de oferta de emprego** (dispensa do
patrocinador) quando se demonstra benefício ao interesse nacional dos EUA. **Carro-chefe da Akros.**

**EB-1:** Green Card para habilidade extraordinária (ciência, artes, educação, negócios, esportes).

**EB-2:** Green Card para formação avançada ou habilidade excepcional — exige oferta de emprego.

**EB-3:** Green Card para profissionais/trabalhadores qualificados e não qualificados com oferta de emprego.

**EB-4:** Imigrante especial (religiosos, funcionários de organizações internacionais, etc).

**F-1 / L-1 / E-2 / P-1 / R / H-1B / H-2B:** Vistos não-imigrantes (estudante, transferência
intracompany, investidor, atletas/artistas, religioso, ocupação especializada, temporário não agrícola).

**USCIS:** United States Citizenship and Immigration Services — órgão federal que recebe e julga a petição.

**RFE (Request for Evidence):** pedido de evidência adicional emitido pela USCIS durante a análise.

**Petition Letter / Carta de Suporte:** peça central narrativa da petição EB-2 NIW; consolida a
trajetória e fundamenta o interesse nacional.

**Business Plan:** plano de negócios detalhado do projeto do cliente nos EUA, apresentado à USCIS
(parceiro: Scopimos). Documento central e personalizado.

**Cartas de recomendação:** cartas personalizadas assinadas (manuscritas) por até 5 recomendantes.

**Cartas de experiência profissional:** comprovam tempo de atuação e responsabilidades em cada empresa.

**Avaliação educacional (Educational Evaluation):** comprova equivalência do diploma ao sistema dos EUA.

**Tradução certificada:** tradução por profissional qualificado com certificação (não juramentada);
modelo "Certification by Translator".

**Ajuste de status (I-485):** para quem já está nos EUA e solicita residência sem sair do país
(taxas adicionais). Alternativa: consular processing.

**Taxa federal USCIS:** US$ 1.015 (formulários I-140 + ETA) na fase de formulários.

**Checklist #N:** lista de pendências/ajustes que a Akros prepara após análise dos documentos de uma fase.

## Jornada do Cliente (portal gamificado)

**Jornada:** trilha completa do cliente rumo ao Green Card — **Introdução + 5 fases**.

**Fase:** um dos 6 blocos da jornada (Introdução, Fase 1–5). Ver `PROJECT.md` para conteúdo de cada.

**Etapa / Tarefa:** unidade acionável dentro de uma fase (ex: "Assinar contrato", "Enviar currículo").

**Unlock sequencial (gate):** regra da gamificação — a Fase N+1 só desbloqueia quando o **admin
libera** após concluir a Fase N. Cliente não pula fase.

**Liberar fase:** ação do admin que abre a próxima fase para o cliente (o gate da gamificação).

**Progresso do cliente:** estado da jornada de um cliente (qual fase, quais tarefas concluídas).

**Checkpoint (I / II):** reuniões de alinhamento intermediário entre fases.

**Kick-off:** reunião de início do processo (Fase 1).

**Case manager:** responsável Akros que acompanha o caso do cliente (casemanager@akrosimmigration.com).

## CRM / Admin

**Lead:** contato potencial gerado pelo formulário da homepage (ou entrada manual).

**Estágios do lead (kanban — 6 colunas, nesta ordem):**
1. **Lead** — recém-chegado, não qualificado
2. **Qualificado** — perfil analisado, tem fit
3. **Reunião Agendada** — consulta marcada
4. **Em Negociação** — proposta enviada / em discussão
5. **Fechado** — contrato assinado (vira Cliente)
6. **Descartado** — sem fit / desistiu

**Cliente:** lead convertido (contrato fechado) que passa a ter jornada no portal.

**Visão 360:** tela do admin com tudo sobre um cliente — dados, histórico de contato, documentos,
conversas (WhatsApp), reuniões, transcrições, pagamentos, status da jornada.

**Proposta comercial:** documento de proposta enviado ao lead/cliente (com valores e escopo).

**Histórico de contato:** timeline de todas as interações com o cliente (e-mail, WhatsApp, reunião).

## Comunicação / Integrações

**WhatsApp Business API (oficial):** canal oficial de mensagens (mockado nesta fase).

**Evolution API:** gateway alternativo de WhatsApp (mockado nesta fase).

**Agente IA:** assistente que faz o primeiro atendimento e tira dúvidas em horários específicos (mock).

**Regra de atendimento:** configuração de quando/como o agente IA atua (horários, tópicos).

**Fireflies:** ferramenta de transcrição de reuniões; a transcrição vira **evidência** anexada ao cliente.

**Transcrição:** registro textual de uma reunião (fonte: Fireflies), anexada à visão 360.

## Plataforma / Técnico

**Portal do Cliente:** área (mock-logada) do cliente — jornada, documentos, pagamentos, agenda.

**Painel Admin:** backoffice — kanban, clientes 360, jornada-gestão, proposta, integrações.

**Site institucional:** páginas públicas de marketing (Início, Quem Somos, etc).

**Impersonação (demo mode):** recurso que permite ao time da Akros navegar a plataforma como um
cliente específico ou alternar cenários — para a apresentação em localhost.

**Persona:** cliente fictício usado nos mocks (com jornada em um estado específico).

**Cenário:** preset de demo que popula o app num estado (ex: "cliente na Fase 2", "lead novo no kanban").

**Porta (port):** interface TypeScript que a camada de aplicação usa; implementada por um adapter
(Mock agora, Supabase depois).

**Adapter:** implementação concreta de uma porta (`MockLeadRepository`, futuramente `SupabaseLeadRepository`).

---

## Sessão / Autenticação (E12-S02, ADR-0008/0009)

**Papel (role):** `cliente` ou `admin` — vem de `app_metadata.role` no JWT do Supabase Auth. Decide
qual guarda de rota (`RequireRole`) deixa passar.

**Sessão:** access token (memória, TTL 15min) + dados do usuário (`papel`, `clienteId`). Nunca
persistido em `localStorage`/`sessionStorage` — ver ADR-0008.

**Cookie de sessão:** o refresh token, em cookie `HttpOnly; Secure; SameSite=Strict`, gravado e lido
só pelas Edge Functions `sessao-*`. Nunca chega ao JavaScript do browser.

**Modo demo (`isDemoMode`):** flag (`VITE_DEMO_MODE`) que decide se a plataforma roda sem
autenticação (impersonação livre, para demo ao vivo) ou com login real e guarda de rota. Padrão:
ligado (demo). Criada em E05-S01, ativada por E12-S02.

---

## Rodada 2 — termos novos (E06–E11, ADR-0004/0005/0006)

**Programa (de visto):** dado versionado que define um fluxo completo de imigração — fases,
etapas, prazos e documentos exigidos. `eb2-niw` e `religioso-r-eb4` são programas. Substitui o
template hardcoded. Não confundir com **tipo de visto**, que é a categoria legal (EB-2 NIW, R,
EB-4); um programa **opera** um ou mais tipos de visto.

**Versão do programa:** identificador congelado na jornada do cliente na abertura do caso. Mudar
o programa não altera casos já abertos.

**Requisito de documento:** item do catálogo de um programa — tipo, objetivo, obrigatoriedade e
quem emite. É contra o requisito que a IA avalia o documento enviado.

**Sujeito do programa:** `individuo` ou `organizacao`. No visto religioso o sujeito é a igreja
patrocinadora, o que muda checklist e formulários.

**Análise de documento:** parecer automático produzido pela IA sobre um documento enviado.
**Nunca** muda o status do documento — ver ADR-0005.

**Aderência:** resultado da análise — `atende`, `atende_com_ressalva`, `nao_atende` ou
`tipo_incorreto`.

**Lacuna:** item faltante apontado pela análise, classificado em `impeditiva` ou `recomendada`.

**Enviado apesar do alerta:** documento que o cliente escolheu mandar para a fila humana mesmo
com parecer negativo da IA. A IA não bloqueia ninguém.

**Evento de comunicação:** registro append-only de qualquer contato, em qualquer canal
(`whatsapp`, `email`, `chat_portal`, `reuniao`, `sistema`). Substitui `Interacao` — ADR-0006.

**Timeline (do cliente ou do lead):** sequência cronológica única de eventos de comunicação.

**Canal registrável:** canal cujo conteúdo não pode ser apagado (chat do portal, e-mail). Por ele
passam documento, decisão e aprovação formal. O WhatsApp é canal de relacionamento, não de registro.

**Pendência de canal:** anexo recebido pelo WhatsApp e ainda não formalizado pelo portal.

**Responsável (de etapa):** de quem depende a etapa agora — `cliente`, `akros`, `terceiro` ou
`uscis`. `terceiro` cobre recomendante, avaliador educacional, tradutor e empresa emissora.

**Fator de ritmo:** razão entre o tempo real que o cliente leva e o tempo esperado das etapas já
concluídas. Alimenta a previsão de conclusão.

**Previsão de conclusão:** faixa estimada (otimista–provável), nunca data única. Separa o tempo
que depende do processo do tempo que depende da USCIS.

**Gargalo:** etapa onde os casos acumulam tempo parado, medido por responsável.

**Perfil de lead:** camada estruturada sobre o lead — formação, experiência, faixa de budget,
momento de vida, família, objeção principal. Preservada mesmo quando o lead é descartado.

**Objeção principal:** motivo pelo qual o lead não fechou. É o campo que torna a reativação possível.

**Cadência de follow-up:** sequência de toques automáticos para lead sem resposta. Cada toque
oferece uma saída diferente e a cadência encerra na primeira resposta.

**Gate de agendamento:** aprovação humana obrigatória antes de um lead poder marcar reunião.
Espelho, no pré-venda, do gate de liberação de fase (E03-S03).

**Base de reativação:** visão sobre leads com estágio terminal, segmentável por objeção e momento
de vida, para oferta futura.

---

## Como manter este doc atualizado
1. Ao escrever spec/design/code, termo novo de negócio → adicione aqui com definição.
2. Ao revisar PR, sinônimos → redirecione pro glossário e padronize.
3. Glossário é só de **conceitos de negócio/arquitetura** — não detalhe de implementação.
