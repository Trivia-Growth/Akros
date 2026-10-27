import type { Jornada } from "@/features/jornada/domain/types";
import { Button, Card, Input, Select, Textarea, toast } from "@/shared/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { requisitosDaFase } from "../application/requisitosDaFase";
import { useParticipantesConsulta } from "../application/useParticipantesConsulta";
import { useSolicitacaoDocumento } from "../application/useSolicitacaoDocumento";
import type { Familiar } from "../domain/types";

const PAPEL_LABEL = {
  aplicante: "participants.roleApplicant",
  beneficiario: "participants.roleBeneficiary",
  organizacao_aplicante: "participants.roleApplicantOrganization",
  familiar_apoio: "participants.roleSupportFamily",
} as const;

export function SolicitarDocumentoPainel({
  clienteId,
  jornada,
  familiares,
  onSalvo,
}: { clienteId: string; jornada: Jornada; familiares: Familiar[]; onSalvo: () => void }) {
  const { t } = useTranslation("admin");
  const { programa, carregando, salvando, erro, solicitar } = useSolicitacaoDocumento(
    clienteId,
    jornada,
  );
  const participantes = useParticipantesConsulta(clienteId);
  const [faseId, setFaseId] = useState("");
  const [requisitoId, setRequisitoId] = useState("");
  const [sujeito, setSujeito] = useState("caso");
  const [prazoEm, setPrazoEm] = useState("");
  const [instrucao, setInstrucao] = useState("");
  const fase = jornada.fases.find((item) => item.id === faseId);
  const requisitos = programa && fase ? requisitosDaFase(programa, fase) : [];
  const requisito = requisitos.find((item) => item.id === requisitoId);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!fase || !requisito || salvando) return;
    const alvo = sujeito.startsWith("participante:")
      ? {
          sujeitoTipo: "participante" as const,
          sujeitoParticipanteId: sujeito.slice("participante:".length),
        }
      : sujeito.startsWith("familiar:")
        ? { sujeitoTipo: "familiar" as const, sujeitoFamiliarId: sujeito.slice("familiar:".length) }
        : { sujeitoTipo: "caso" as const };
    const sucesso = await solicitar({
      faseId: fase.id,
      requisitoId: requisito.id,
      titulo: requisito.titulo,
      ...alvo,
      ...(prazoEm ? { prazoEm } : {}),
      ...(instrucao.trim() ? { instrucao: instrucao.trim() } : {}),
    });
    if (sucesso) {
      setRequisitoId("");
      setPrazoEm("");
      setInstrucao("");
      setSujeito("caso");
      toast.success(t("case.requestSuccess"));
      onSalvo();
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-navy">{t("case.requestTitle")}</p>
      {carregando ? (
        <p>{t("case.requestLoading")}</p>
      ) : (
        programa && (
          <form className="flex flex-col gap-3" onSubmit={(evento) => void enviar(evento)}>
            <Select
              label={t("case.requestPhase")}
              value={faseId}
              onChange={(e) => {
                setFaseId(e.target.value);
                setRequisitoId("");
              }}
            >
              <option value="">{t("case.requestSelect")}</option>
              {jornada.fases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titulo}
                </option>
              ))}
            </Select>
            <Select
              label={t("case.requestRequirement")}
              value={requisitoId}
              onChange={(e) => setRequisitoId(e.target.value)}
              disabled={!fase}
            >
              <option value="">{t("case.requestSelect")}</option>
              {requisitos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titulo}
                </option>
              ))}
            </Select>
            {fase && requisitos.length === 0 && (
              <p className="text-sm text-ink-muted">{t("case.requestNone")}</p>
            )}
            {requisito?.restrito && requisito.papelDirigido && (
              <p className="text-sm text-ink-soft">
                {t("case.requestRestricted", { papel: t(PAPEL_LABEL[requisito.papelDirigido]) })}
              </p>
            )}
            <Select
              label={t("case.requestSubject")}
              value={sujeito}
              onChange={(e) => setSujeito(e.target.value)}
            >
              <option value="caso">{t("case.requestSubjectCase")}</option>
              {participantes.participantes
                .filter((item) => item.estado === "ativo")
                .map((item) => (
                  <option key={item.id} value={`participante:${item.id}`}>
                    {item.nomeExibicao}
                  </option>
                ))}
              {familiares.map((item) => (
                <option key={item.id} value={`familiar:${item.id}`}>
                  {item.nome}
                </option>
              ))}
            </Select>
            {participantes.erro && <p role="alert">{t("case.requestParticipantsError")}</p>}
            <Input
              label={t("case.requestDeadline")}
              type="date"
              value={prazoEm}
              onChange={(e) => setPrazoEm(e.target.value)}
            />
            <Textarea
              label={t("case.requestInstruction")}
              value={instrucao}
              onChange={(e) => setInstrucao(e.target.value)}
            />
            <Button type="submit" disabled={!requisito || salvando}>
              {t("case.requestSubmit")}
            </Button>
          </form>
        )
      )}
      {erro && <p role="alert">{t(erro)}</p>}
    </Card>
  );
}
