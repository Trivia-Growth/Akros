---
name: SPEC
description: Página de contatos + formulário de captação de lead (alimenta o kanban).
story: E01-S07
tier: pequeno
alwaysApply: false
---

# SPEC — Contatos + Formulário de Lead (E01-S07)

## User Story
Como **visitante interessado**, quero **enviar meus dados por um formulário**, para que **a Akros me
contate**. Como **admin**, quero **que esse lead apareça no kanban**, para que **eu trabalhe o funil**.

## Contexto
Formulário na homepage e/ou página /contatos. Cria um `Lead` via `LeadRepository.criar` (mock). O
lead nasce no estágio **Lead** do kanban (E03-S01). i18n + impeccable.

## Campos do formulário
Nome*, e-mail*, telefone/WhatsApp*, tipo de visto de interesse (select: EB-2 NIW, EB-1, outros…),
área/profissão, mensagem (opcional), consentimento (checkbox LGPD). *obrigatórios.

## Acceptance Criteria

### AC-1: Formulário valida
```gherkin
Given  o formulário de contato
When   submeto com campos obrigatórios vazios ou e-mail inválido
Then   vejo mensagens de validação inline
And    o envio é bloqueado até corrigir
```

### AC-2: Envio cria lead
```gherkin
Given  o formulário preenchido corretamente
When   submeto
Then   um Lead é criado via LeadRepository no estágio "Lead"
And    vejo confirmação de sucesso (toast/mensagem)
And    o formulário é limpo
```

### AC-3: Lead aparece no kanban
```gherkin
Given  um lead recém-criado pelo formulário
When   abro /admin/leads (kanban)
Then   o novo lead aparece na coluna "Lead" com os dados enviados
```

### AC-4: Página de contatos
```gherkin
Given  /contatos
When   acesso
Then   vejo os canais reais (hello@akrosimmigration.com, +1 469-758-9773, WhatsApp +1 689-322-4429,
       link de agendamento, redes sociais) além do formulário
```

### AC-5: i18n + impeccable + proteção duplo-envio
```gherkin
Given  o formulário
When   troco idioma / clico enviar duas vezes rápido
Then   textos traduzem; segundo clique é ignorado (botão desabilita durante envio)
And    checklist impeccable passa
```

## Out of Scope
- E-mail real / integração real. Anti-spam real. (Mock via porta.)

## Notas de implementação
- Use case `EnviarFormularioLead` (feature `site`) → `LeadRepository.criar`.
- Validação com Zod. Consentimento LGPD registrado no lead.
- Como o kanban compartilha o mesmo `useMockDb`, o lead aparece sem reload ao navegar ao admin.
