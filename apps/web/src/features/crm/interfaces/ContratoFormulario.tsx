// E03-S07 (T037) — modal de registro de contrato (FR-022/FR-023). Mesmo padrão de
// `PropostasPage.tsx` (`NovaPropostaModal`): `Modal` de `@/shared/ui`, estado local controlado,
// `useContratoComandos` (T035) para a mutação, `toast` de sucesso/erro. Nenhuma chamada a
// `getSupabase()`/Edge Function aqui — só o hook de `application/`, que só fala com
// `infrastructure/` (regra de dependência desta feature).
//
// Decisão de implementação (ver tasks.md): PDF assinado NÃO entra neste formulário. Upload de
// arquivo depende da infraestrutura de arquivos da fase 5 (ainda não existe nesta base) — o
// campo `case.contractSignedFile` já existe em i18n para quando essa infraestrutura chegar, mas
// inventar um upload sem onde pousar o arquivo seria pior do que não ter o campo agora.
//
// Programa/versão são campos de texto livre (`case.contractProgramCode`/`contractProgramVersion`)
// e não um seletor de catálogo: o catálogo de programas é de outra feature (`programas/`) e puxar
// uma lista reusável aqui é escopo maior do que esta task pede — `crm.contratos.programa_id` é
// `text`, não FK (migration 0017), então o texto livre já é o contrato real que o servidor aceita.
import { Button, Input, Modal, Select, Textarea, toast } from "@/shared/ui";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CasoComandoError, CondicaoContratoInput } from "../application/ports";
import { useContratoComandos } from "../application/useContratoComandos";
import { type ContratoCondicao, condicoesValidas, prazoRespostaValido } from "../domain/contrato";

interface CondicaoFormulario {
  localId: number;
  descricao: string;
  tipo: ContratoCondicao["tipo"];
  valor: string;
  moeda: "BRL" | "USD";
  vencimento: string;
}

function novaCondicaoVazia(localId: number): CondicaoFormulario {
  return { localId, descricao: "", tipo: "parcela", valor: "", moeda: "BRL", vencimento: "" };
}

/** Mapeia pro shape que `condicoesValidas` (domínio) e o payload da RPC esperam. `id`/`ordem` são
 *  só para satisfazer o tipo `ContratoCondicao` do domínio — o servidor gera o `id` real. */
function paraCondicaoDominio(condicao: CondicaoFormulario, ordem: number): ContratoCondicao {
  return {
    id: String(condicao.localId),
    descricao: condicao.descricao,
    tipo: condicao.tipo,
    valor: Number(condicao.valor),
    moeda: condicao.moeda,
    vencimento: condicao.vencimento,
    ordem,
  };
}

function condicaoPreenchida(condicao: CondicaoFormulario): boolean {
  return condicao.descricao.trim() !== "" && condicao.vencimento !== "" && condicao.valor !== "";
}

interface ContratoFormularioProps {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  /** Chamado após `registrarContrato` + `prepararCaso` terem sucesso (ou só o primeiro, se o
   *  segundo falhar — o contrato já existe, então o pai precisa recarregar de qualquer forma). */
  onSalvo: () => void;
}

export function ContratoFormulario({ open, onClose, clienteId, onSalvo }: ContratoFormularioProps) {
  const { t } = useTranslation("admin");
  const { registrarContrato, prepararCaso, salvando } = useContratoComandos();

  const [programaId, setProgramaId] = useState("");
  const [programaVersao, setProgramaVersao] = useState("");
  const [prazoDias, setPrazoDias] = useState("");
  const [prioridade, setPrioridade] = useState<"padrao" | "prioritaria">("padrao");
  const [origem, setOrigem] = useState<"" | "importado" | "nascido_na_plataforma">("");
  const [observacao, setObservacao] = useState("");
  const [condicoes, setCondicoes] = useState<CondicaoFormulario[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const proximoLocalId = useRef(1);

  // Idempotency key gerada uma vez por ABERTURA do modal (não a cada clique) — duplo-clique no
  // botão salvar reenvia a mesma chave e o servidor trata como a mesma operação (ver `caso-
  // comandos` T031/T032), em vez de criar dois contratos.
  const idempotencyKeyRef = useRef("");
  useEffect(() => {
    if (open) idempotencyKeyRef.current = crypto.randomUUID();
  }, [open]);

  function resetar() {
    setProgramaId("");
    setProgramaVersao("");
    setPrazoDias("");
    setPrioridade("padrao");
    setOrigem("");
    setObservacao("");
    setCondicoes([]);
    setErro(null);
  }

  function fechar() {
    resetar();
    onClose();
  }

  const prazoNumero = Number(prazoDias);
  const prazoValido = prazoDias !== "" && prazoRespostaValido(prazoNumero);
  const condicoesPreenchidas = condicoes.every(condicaoPreenchida);
  const condicoesValidasDominio = condicoesValidas(
    condicoes.map((condicao, index) => paraCondicaoDominio(condicao, index)),
  );
  const podeSalvar =
    programaId.trim() !== "" &&
    programaVersao.trim() !== "" &&
    prazoValido &&
    origem !== "" &&
    condicoesPreenchidas &&
    condicoesValidasDominio &&
    !salvando;

  function mensagemDeErro(causa: CasoComandoError): string {
    if (causa.status === 403) return t("case.errorForbidden");
    if (causa.status === 422) return causa.message || t("case.errorValidation");
    if (causa.status === 409) return t("case.errorConflict");
    return t("case.errorGeneric");
  }

  async function handleSalvar() {
    if (!podeSalvar || !origem) return;
    setErro(null);

    const payloadCondicoes: CondicaoContratoInput[] = condicoes.map((condicao, index) => ({
      descricao: condicao.descricao,
      tipo: condicao.tipo,
      valor: Number(condicao.valor),
      moeda: condicao.moeda,
      vencimento: condicao.vencimento,
      ordem: index,
    }));

    let contrato: Awaited<ReturnType<typeof registrarContrato>>;
    try {
      contrato = await registrarContrato({
        clienteId,
        programaId: programaId.trim(),
        programaVersao: programaVersao.trim(),
        prazoRespostaDiasUteis: prazoNumero,
        prioridade,
        ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
        condicoes: payloadCondicoes,
        idempotencyKey: idempotencyKeyRef.current,
      });
    } catch (causa) {
      setErro(mensagemDeErro(causa as CasoComandoError));
      return;
    }

    // FR-001 — contrato registrado deriva o preparo do caso. Chave própria: não reusar a de
    // `registrarContrato`, pois são comandos diferentes.
    try {
      await prepararCaso({
        clienteId,
        contratoId: contrato.id,
        origem,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(t("case.contractSavedSuccess"));
    } catch {
      // O contrato JÁ existe — um erro genérico aqui sugeriria (falsamente) que nada foi salvo.
      toast.error(t("case.caseNotPreparedWarning"));
    }

    fechar();
    onSalvo();
  }

  return (
    <Modal open={open} onClose={fechar} title={t("case.contractTitle")}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t("case.contractProgramCode")}
            value={programaId}
            onChange={(e) => setProgramaId(e.target.value)}
            placeholder="eb2-niw"
          />
          <Input
            label={t("case.contractProgramVersion")}
            value={programaVersao}
            onChange={(e) => setProgramaVersao(e.target.value)}
            placeholder="2026.1"
          />
        </div>
        <Input
          type="number"
          min={1}
          max={60}
          label={t("case.contractResponseDeadline")}
          value={prazoDias}
          onChange={(e) => setPrazoDias(e.target.value)}
          error={
            prazoDias !== "" && !prazoValido ? t("case.contractResponseDeadlineInvalid") : undefined
          }
        />
        <Select
          label={t("case.caseOrigin")}
          value={origem}
          onChange={(e) => setOrigem(e.target.value as "" | "importado" | "nascido_na_plataforma")}
        >
          <option value="">{t("case.caseOriginChoose")}</option>
          <option value="nascido_na_plataforma">{t("case.caseOriginNew")}</option>
          <option value="importado">{t("case.caseOriginImported")}</option>
        </Select>
        <Select
          label={t("case.contractPriority")}
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value as "padrao" | "prioritaria")}
        >
          <option value="padrao">{t("case.contractPriorityStandard")}</option>
          <option value="prioritaria">{t("case.contractPriorityUrgent")}</option>
        </Select>
        <Textarea
          label={t("case.contractObservation")}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-cream-50/60 p-3.5">
          <p className="text-sm font-semibold text-navy">{t("case.contractCondition")}</p>
          {condicoes.map((condicao) => (
            <div
              key={condicao.localId}
              className="grid grid-cols-1 gap-2.5 rounded-md border border-border bg-white p-3 sm:grid-cols-2"
            >
              <Input
                label={t("case.contractConditionDescription")}
                value={condicao.descricao}
                onChange={(e) =>
                  setCondicoes(
                    condicoes.map((atual) =>
                      atual.localId === condicao.localId
                        ? { ...atual, descricao: e.target.value }
                        : atual,
                    ),
                  )
                }
              />
              <Select
                label={t("case.contractConditionType")}
                value={condicao.tipo}
                onChange={(e) =>
                  setCondicoes(
                    condicoes.map((atual) =>
                      atual.localId === condicao.localId
                        ? { ...atual, tipo: e.target.value as ContratoCondicao["tipo"] }
                        : atual,
                    ),
                  )
                }
              >
                <option value="entrada">{t("case.contractConditionTypeEntry")}</option>
                <option value="parcela">{t("case.contractConditionTypeInstallment")}</option>
                <option value="taxa_federal">{t("case.contractConditionTypeFederalFee")}</option>
                <option value="outro">{t("case.contractConditionTypeOther")}</option>
              </Select>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                label={t("case.contractConditionAmount")}
                value={condicao.valor}
                onChange={(e) =>
                  setCondicoes(
                    condicoes.map((atual) =>
                      atual.localId === condicao.localId
                        ? { ...atual, valor: e.target.value }
                        : atual,
                    ),
                  )
                }
              />
              <Select
                label={t("case.contractConditionCurrency")}
                value={condicao.moeda}
                onChange={(e) =>
                  setCondicoes(
                    condicoes.map((atual) =>
                      atual.localId === condicao.localId
                        ? { ...atual, moeda: e.target.value as "BRL" | "USD" }
                        : atual,
                    ),
                  )
                }
              >
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </Select>
              <Input
                type="date"
                label={t("case.contractConditionDueDate")}
                value={condicao.vencimento}
                onChange={(e) =>
                  setCondicoes(
                    condicoes.map((atual) =>
                      atual.localId === condicao.localId
                        ? { ...atual, vencimento: e.target.value }
                        : atual,
                    ),
                  )
                }
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="sm:col-span-2 sm:justify-self-end"
                onClick={() =>
                  setCondicoes(condicoes.filter((atual) => atual.localId !== condicao.localId))
                }
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {t("case.contractConditionRemove")}
              </Button>
            </div>
          ))}
          {condicoes.length > 0 && (!condicoesPreenchidas || !condicoesValidasDominio) && (
            <p className="text-xs text-red-600">{t("case.contractConditionsInvalid")}</p>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              setCondicoes([...condicoes, novaCondicaoVazia(proximoLocalId.current++)])
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t("case.contractConditionAdd")}
          </Button>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <Button onClick={handleSalvar} loading={salvando} disabled={!podeSalvar}>
          {t("case.contractSave")}
        </Button>
      </div>
    </Modal>
  );
}
