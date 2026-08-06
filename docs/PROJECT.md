---
name: PROJECT
description: Identidade e contexto de negócio do projeto Akros. Puxe ao iniciar.
alwaysApply: false
---

# PROJECT.md — Akros Immigration Solutions

## Visão do Projeto

**Nome:** Akros (plataforma digital da Akros Immigration Solutions)
**Cliente:** Akros Immigration Solutions
**CEO:** Natalia Luz — advogada (PUC/SP, 2010), 14+ anos em direito civil e propriedade intelectual, Green Card 2020 por habilidade excepcional.
**Site atual:** https://akrosimmigration.com

**O que é:** Empresa de consultoria de imigração para os EUA, especializada em vistos de imigração
para profissionais altamente qualificados (foco EB-2 NIW). Já atendeu +300 famílias. Este projeto
é a **nova plataforma digital**: site institucional + portal do cliente gamificado + painel
administrativo (backoffice) + integrações (WhatsApp, e-mail, transcrição, agentes IA).

## Objetivo desta fase (IMPORTANTE)

**Protótipo visual para apresentação ao cliente (Akros).**
- **Dados 100% mockados** — sem banco de dados real nesta fase.
- **Sem login/autenticação real** — abordagem visual.
- **Roda em localhost** para demo ao vivo com o time da Akros.
- **Modo de impersonação** — o time da Akros escolhe uma persona/cliente e navega a plataforma
  como se fosse aquele cliente (ver vários cenários de jornada).
- **Mocks realistas** — conversas de WhatsApp, transcrições, agenda, documentos: dados fake
  convincentes que parecem funcionais na demo (sem backend).

> A arquitetura deve isolar a camada de dados atrás de portas (interfaces) para que, no futuro,
> os mocks sejam trocados por adapters Supabase reais **sem reescrever a UI**. Ver `ARCHITECTURE.md`.

## Idioma

**Bilíngue PT-BR + Inglês (i18n)** desde o início. PT-BR é o idioma primário (público-alvo:
brasileiros imigrando para os EUA). Toggle de idioma disponível. Todo texto de UI passa por i18n.

## Stack Técnica

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS
- **i18n:** biblioteca de internacionalização (ver ADR — react-i18next recomendado)
- **Roteamento:** React Router
- **Estado/dados:** camada de mock atrás de portas (repositories mockados)
- **Backend/DB (fase futura):** Supabase (PostgreSQL + Edge Functions) — NÃO nesta fase
- **Hospedagem (futuro):** Netlify + Supabase
- **Integrações (futuro, mockadas agora):** WhatsApp Business API oficial + Evolution API,
  Gmail/Outlook (agenda), Fireflies (transcrição), agentes IA (primeiro atendimento)

## Identidade Visual

Ativos em `Akros identidade/` (PNG + JPG). Logo: montanha/vela estilizada com letras "AKROS".

**Paleta (extraída do manual do cliente e logo):**
- **Navy (primária):** `#0D2240`
- **Gold (destaque):** `#C6A254`
- **Cream (fundo claro):** `#F5F4F0`
- **Borda sutil:** `#E0DDD5`
- **Texto:** `#1A1A1A` (forte), `#555` (corpo)

Tom: sóbrio, premium, confiável, aspiracional ("Elevando Talentos ao Topo Global").

## Produto — Três Frentes

### 1. Site Institucional (marketing)
Recriação do site atual com **layout mais bonito**, mesmas informações. Páginas:
Início · Quem Somos · Outros Serviços · Metodologia · Vistos · Blog · Contatos.
Homepage tem **formulário de captação de lead** que alimenta o kanban do admin.

### 2. Portal do Cliente (gamificado)
Área logada (mockada) onde o cliente acompanha o processo de visto em modelo de **gamificação**:
**Introdução + 5 fases**. O cliente só avança e libera as próximas etapas **quando o admin libera**
após concluir a fase anterior (unlock sequencial). Funcionalidades:
- Acompanhar jornada (progresso visual gamificado)
- Enviar e consultar documentos + checklists
- Assinar documentos digitalmente
- Ver status de pagamento (entrada, taxa federal USCIS, etc)
- Agendar reuniões

### 3. Painel Admin (backoffice)
Gestão completa:
- **Kanban de leads** (6 colunas: Lead · Qualificado · Reunião Agendada · Em Negociação · Fechado · Descartado)
- **Base de clientes** com **visão 360** (histórico de contato, documentos, dados)
- **Enviar proposta comercial**
- **Gestão de jornada** — liberar fases dos clientes (o gate da gamificação)
- Integrações: inbox WhatsApp, agenda, transcrições Fireflies, config de agentes IA

## As 5 Fases da Jornada (EB-2 NIW) + Introdução

Baseado no manual entregue pela Akros (`manual-cliente-eb2-niw-utf8-links-corrigidos-v2.html`):

0. **Introdução** — boas-vindas, canais de comunicação, envio de documentos, traduções certificadas
1. **Fase 1 — Documentação e Currículo** — contrato + pagamento inicial, reunião kick-off, currículo especializado (USCIS), documentos comprobatórios (formação, certificados, licenças, associações, reconhecimentos)
2. **Fase 2 — Business Plan e Cartas** — checkpoint I, Business Plan, cartas de recomendação (~15 dias úteis), cartas de experiência profissional (~10 dias úteis), avaliação educacional (~15 dias úteis)
3. **Fase 3 — Viabilidade Econômica e Formulários** — checkpoint II, comprovação de viabilidade econômica e comprometimento, questionários + taxa federal USCIS (US$ 1.015; I-140 + ETA)
4. **Fase 4 — Finalização e Envio à USCIS** — carta de suporte (Petition Letter), revisão final pelo cliente + envio por correio rastreado
5. **Fase 5 — Pós-aprovação / Relocation** — acompanhamento da decisão USCIS (RFE, aprovação), consular processing / ajuste de status, preparação para mudança aos EUA (alinhado ao passo 7 da metodologia)

## Metodologia (7 passos — do site institucional)

1. Análise de perfil e objetivos
2. Consulta com especialista em imigração (+ orçamento)
3. Consulta com advogada parceira (Dra. Denise Sarchiapone) — confirma estratégia
4. Contrato + pagamento inicial (opções de financiamento)
5. Organização de documentos e formulários (case managers)
6. Aprovação do cliente + envio à USCIS
7. Preparação para relocation

## Vistos Oferecidos

**Imigrantes:** EB-1 (habilidade extraordinária), EB-2 (formação avançada), **EB-2 NIW** (sem oferta
de emprego — carro-chefe), EB-3 (qualificados/não qualificados), EB-4 (imigrante especial).
**Não-imigrantes:** F-1 (estudante), L-1 (transferência intracompany), E-2 (investidor), P-1
(atletas/artistas), R (religioso), H-1B (ocupação especializada), H-2B (temporário não agrícola).

## Categorias de Serviço (homepage)

- **Profissionais Qualificados** — bacharéis com experiência → Green Card
- **Atletas & Artistas** — vistos de trabalho ou Green Card
- **Trabalhadores Religiosos** — convite para igrejas nos EUA
- **Legalização** — quem já está nos EUA buscando mudança de status/Green Card

## Contato (dados reais do site/manual)

- **E-mail geral:** hello@akrosimmigration.com
- **E-mail case manager:** casemanager@akrosimmigration.com
- **Telefone:** +1 (469) 758-9773
- **WhatsApp suporte:** +1 (689) 322-4429
- **Calendly:** agendamento de reunião de atendimento
- **Redes:** Instagram, Facebook, YouTube, LinkedIn

## Stakeholders

- **Sponsor/Cliente:** Natalia Luz (CEO, Akros)
- **Advogada parceira:** Dra. Denise Sarchiapone
- **Parceiros mencionados:** Scopimos (Business Plan — Bruno), empresa de tradução certificada, empresa de avaliação educacional
- **Desenvolvimento:** Trívia Studio (via Claude + Codex, Padrão SO v3)

## Métricas de Sucesso (da demo)

- Time da Akros consegue navegar todas as três frentes (site, portal, admin) em localhost
- Consegue impersonar diferentes clientes/cenários de jornada
- Layout percebido como "mais bonito" e premium vs site atual
- Fluxo de lead (form homepage → kanban admin) demonstrável
- Gamificação da jornada clara e convincente

## Constraints & Risks

- **Sem backend nesta fase** — tudo mockado; arquitetura deve permitir troca futura por Supabase
- **Sem dados reais de cliente** — usar personas fictícias (não usar dados reais de clientes Akros)
- **Integrações são simulações visuais** — deixar claro na demo o que é mock vs real
- **Conteúdo do site** deve refletir o real (akrosimmigration.com) — não inventar serviços/vistos

## Referências

- **CLAUDE.md** — convenções de desenvolvimento
- **ARCHITECTURE.md** — estrutura, bounded contexts, estratégia de mock, i18n
- **docs/glossary.md** — linguagem ubíqua (EB-2 NIW, USCIS, fases, kanban, etc)
- **docs/epics/ROADMAP.md** — épicos e stories
- **manual-cliente-eb2-niw-utf8-links-corrigidos-v2.html** — jornada real entregue pela Akros
- **Akros identidade/** — logos e identidade visual
