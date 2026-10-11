# Quickstart — validação planejada

**Story**: E03-S07 · Revisado em 2026-10-06. Guia para implementação futura; cenários ainda não
executados.

## Pré-requisitos

E12-S04 operacional **com convite por participante e papel**; programa de teste com dois papéis e um
requisito restrito (espelho do visto R e de um visto com empregador); migrations/commands desta feature
aplicados em ambiente autorizado; sessão real e modo demo desligado nesse ambiente. App Microsoft consentido e pasta de teste corporativa
sem documentos reais, dois clientes fictícios e conta admin. Não copiar credenciais para docs/logs.

Configurar acesso E2E conforme guia existente do repositório. Nenhum comando abaixo implanta recursos.

## Comandos existentes

Executar após implementação, sempre via RTK:

```bash
rtk pnpm run ci:local
rtk pnpm run arch:check
rtk pnpm e2e
```

Na entrega de banco, rodar testes SQL pelo fluxo existente de db-tests. Testes novos devem integrar
os runners atuais; não inventar nome de script ou afirmar que cenários novos já estão cobertos.

## Cenários

1. **Preparação**: admin cadastra situação inicial fictícia, familiar e pasta existente. Caso sem
   levantamento aparece incompleto. Depois de conferência, portal/360 apresentam mesma fase e próxima ação.
2. **Família**: convidar o aplicante; solicitar documento do cônjuge. Ele envia e a equipe vê a
   identificação correta. Familiar de outro caso é recusado, sem leitura/alteração cruzada.
3. **Contrato**: registrar contrato fictício com duas parcelas, prazos de resposta e prioridade; conferir
   participantes e cobranças derivados com origem. Contrato ausente deixa o caso como cadastro incompleto;
   alterar o contrato depois não reescreve cobrança já conciliada.
4. **Participantes e visibilidade**: caso com organização aplicante e beneficiário, cada um convidado com
   seu papel. Requisito restrito à organização não aparece na listagem do beneficiário, responde 404 por
   ID, recusa download e não revela nome nem tamanho. Envio de requisito dirigido ao outro papel é
   recusado; requisito de envio conjunto aceita os dois, com autoria. Revogar um participante não afeta o
   outro; participante adicionado depois não vê requisito restrito nem envio fora do seu papel. Provar em
   SQL, não só na tela.
5. **Documento**: enviar PDF válido; consultar recebimento e item no OneDrive. Repetir finalização
   conserva uma versão. Documento em fase bloqueada e arquivo inválido/acima do limite são recusados.
6. **Falha**: interromper envio e repetir; simular indisponibilidade Microsoft após recebimento.
   Arquivo permanece recuperável, estado pendente visível. Restaurar conexão/reprocessar sem duplicar.
7. **Resposta perdida**: Microsoft salva item e resposta/finalização no banco falha. Retomada reconcilia
   arquivo existente e não cria segundo item; temporário só é limpo depois de confirmação.
8. **Revisão**: devolver com motivo, enviar nova versão e aprovar. Versões/decisões anteriores continuam
   consultáveis. Duas decisões com mesma revisão não sobrescrevem silenciosamente uma à outra.
9. **Jornada e gamificação**: cliente tenta completar etapa direto e falha; envia para avaliação. Equipe
   aprova requisitos e libera fase; requisito obrigatório faltante impede conclusão normal. Antes da
   liberação, tarefa da fase seguinte não aparece no portal nem responde por consulta direta.
10. **Avanço e previsão**: conferir percentual com o critério exibido; caso sem levantamento mostra
    cadastro incompleto em vez de percentual; histórico insuficiente mostra "sem previsão" com motivo; o
    texto identifica estimativa de protocolo e nenhuma tela promete decisão do USCIS ou aprovação.
11. **Financeiro**: cobrança fictícia em BRL e outra em USD. Comprovante fica em conferência; admin
    confirma ou registra divergência. Totais separados, pagamento vencido distinguido de conferência.
12. **Carteira**: preparar casos com impedimentos distintos; conferir filtros, indicadores e itens
    no 360. Recarregar após alteração e confirmar consistência. Falha de consulta não vira zero.
13. **Permissões**: chamadas diretas tentam trocar caso/participante/papel, alterar status/valor, baixar
    arquivo de outro papel ou outro caso e ler nota interna; todas recusadas. Participante tenta aprovar
    documento, concluir etapa, liberar fase e conciliar pagamento; todas recusadas. Revogar participante e
    testar upload, download e retomada.
14. **UI**: PT-BR/EN, teclado, leitor de tela, celular, progresso de envio e instruções de erro.

Registrar evidência por cenário da spec e executar revisão adversarial antes de PASS.

## Adoção e reversão

Equipe escolhe clientes atuais do piloto (EB-2 NIW e visto R, cerca de três casos), confere
situação/pastas, testa convites por papel e define data de adoção. Piloto do R espera o programa do R
cadastrado a partir do manual escrito pela Akros. Não migrar automaticamente toda a base. Se falhar: desligar novas escritas, preservar
arquivos/versões recebidos, tratar tarefas pendentes; não apagar dados de negócio para reverter UI.
Rollout e publicação pelo papel @devops. Sucesso exige SC-001 a SC-005 comprovados no piloto.
