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

## Como manter este doc atualizado
1. Ao escrever spec/design/code, termo novo de negócio → adicione aqui com definição.
2. Ao revisar PR, sinônimos → redirecione pro glossário e padronize.
3. Glossário é só de **conceitos de negócio/arquitetura** — não detalhe de implementação.
