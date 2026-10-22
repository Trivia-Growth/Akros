// E03-S07 (T050) — painel de participantes do caso (US6/ADR-0018): fecha a fase 4. Lista
// agrupada por papel (estado, quem convidou/revogou e quando), convite via modal e revogação com
// confirmação. Mesmo padrão visual de `ContratoFormulario.tsx` (Modal/Select/Input de
// `@/shared/ui`) e de `Clientes360RealPage.tsx` (Card/Badge). Nenhuma chamada a
// `getSupabase()`/Edge Function aqui — só os hooks de `application/`
// (`useParticipantesConsulta`/`useParticipantesComandos`), que só falam com `infrastructure/`
// (regra de dependência desta feature).
//
// O Select de papel SEMPRE apresenta os 4 papéis fixos do domínio (`PapelParticipante`), nunca
// puxa o catálogo de papéis do programa do caso: a validação real de "este papel existe na
// versão do programa" é do servidor (`crm.convidar_participante`, migration 0024), que recusa com
// 422 quando o papel não bate. Repetir essa checagem aqui, contra um catálogo buscado à parte,
// criaria uma segunda fonte de verdade que pode divergir da versão congelada do programa — exatamente
// o que ADR-0018 existe para evitar (ver brief da task, seção T050).
import { Badge, Button, Card, Input, Modal, Select, toast } from "@/shared/ui";
import { ShieldOff, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CasoComandoError } from "../application/ports";
import { useParticipantesComandos } from "../application/useParticipantesComandos";
import { useParticipantesConsulta } from "../application/useParticipantesConsulta";
import type { PapelParticipante, Participante, SujeitoTipo } from "../domain/participante";

const PAPEIS_FIXOS: PapelParticipante[] = [
  "aplicante",
  "beneficiario",
  "organizacao_aplicante",
  "familiar_apoio",
];

const PAPEL_LABEL_KEY: Record<PapelParticipante, string> = {
  aplicante: "participants.roleApplicant",
  beneficiario: "participants.roleBeneficiary",
  organizacao_aplicante: "participants.roleApplicantOrganization",
  familiar_apoio: "participants.roleSupportFamily",
};

const SUJEITO_LABEL_KEY: Record<SujeitoTipo, string> = {
  titular: "participants.subjectTypeTitleholder",
  familiar: "participants.subjectTypeFamily",
  organizacao: "participants.subjectTypeOrganization",
};

const ESTADO_VARIANT = { ativo: "success", revogado: "neutral" } as const;

function mensagemDeErro(
  t: (chave: string) => string,
  causa: CasoComandoError,
  mensagemValidacaoPadrao: string,
): string {
  if (causa.status === 403) return t("participants.errorForbidden");
  if (causa.status === 422) return causa.message || mensagemValidacaoPadrao;
  if (causa.status === 409) return t("participants.errorConflict");
  return t("participants.errorGeneric");
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString("pt-BR");
}

interface ParticipantesPainelProps {
  clienteId: string;
}

export function ParticipantesPainel({ clienteId }: ParticipantesPainelProps) {
  const { t } = useTranslation("admin");
  const { participantes, carregando, erro, refetch } = useParticipantesConsulta(clienteId);
  const [modalAberto, setModalAberto] = useState(false);

  if (carregando) {
    return <Card className="text-sm text-ink-muted">{t("participants.loading")}</Card>;
  }
  if (erro) {
    return <Card className="text-sm text-red-600">{t("participants.loadError")}</Card>;
  }

  const grupos = PAPEIS_FIXOS.map((papel) => ({
    papel,
    itens: participantes.filter((participante) => participante.papel === papel),
  })).filter((grupo) => grupo.itens.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-navy">{t("participants.title")}</p>
        <Button size="sm" variant="gold" onClick={() => setModalAberto(true)}>
          <UserPlus className="h-4 w-4" aria-hidden />
          {t("participants.invite")}
        </Button>
      </div>

      {grupos.length === 0 ? (
        <Card className="text-sm text-ink-muted">{t("participants.empty")}</Card>
      ) : (
        <div className="flex flex-col gap-5">
          {grupos.map((grupo) => (
            <div key={grupo.papel} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-label text-ink-muted">
                {t(PAPEL_LABEL_KEY[grupo.papel])}
              </p>
              <div className="flex flex-col gap-2">
                {grupo.itens.map((participante) => (
                  <ParticipanteLinha
                    key={participante.id}
                    participante={participante}
                    onRevogado={() => void refetch()}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConvidarParticipanteModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        clienteId={clienteId}
        onConvidado={() => void refetch()}
      />
    </div>
  );
}

function ParticipanteLinha({
  participante,
  onRevogado,
}: { participante: Participante; onRevogado: () => void }) {
  const { t } = useTranslation("admin");
  const { revogar, salvando } = useParticipantesComandos();
  const ativo = participante.estado === "ativo";

  async function handleRevogar() {
    if (!window.confirm(t("participants.revokeConfirm"))) return;
    try {
      await revogar({ participanteId: participante.id, idempotencyKey: crypto.randomUUID() });
      toast.success(t("participants.successRevoked"));
      onRevogado();
    } catch (causa) {
      toast.error(mensagemDeErro(t, causa as CasoComandoError, t("participants.errorValidation")));
    }
  }

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-navy">{participante.nomeExibicao}</p>
          <Badge variant={ESTADO_VARIANT[participante.estado]}>
            {t(ativo ? "participants.statusActive" : "participants.statusRevoked")}
          </Badge>
          {!participante.authUserId && (
            <Badge variant="neutral">{t("participants.noAccess")}</Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-ink-muted">
          {t(SUJEITO_LABEL_KEY[participante.sujeitoTipo])}
          {participante.email ? ` · ${participante.email}` : ""}
        </p>
        {participante.convidadoPor && participante.convidadoEm && (
          <p className="mt-1 text-xs text-ink-muted">
            {/* FR-020 exige registrar quem convidou e quando — o dado fica em
                participante.convidadoPor (auth.uid() do admin, auditável no banco). Não há,
                nesta fase do protótipo, resolução de uuid de admin para nome de exibição
                (configuracoes.equipe não tem auth_user_id vinculado) — mostrar o uuid cru aqui
                pareceria um valor quebrado, não um nome. Achado da revisão adversarial de
                T049-053: corrigido removendo a interpolação de {{author}} em vez de inventar
                um lookup fora de escopo. */}
            {t("participants.invitedBy", {
              date: formatarData(participante.convidadoEm),
            })}
          </p>
        )}
        {!ativo && participante.revogadoPor && participante.revogadoEm && (
          <p className="mt-1 text-xs text-ink-muted">
            {t("participants.revokedBy", {
              date: formatarData(participante.revogadoEm),
            })}
          </p>
        )}
      </div>
      {ativo && (
        <Button
          size="sm"
          variant="danger"
          onClick={() => void handleRevogar()}
          loading={salvando}
          className="shrink-0"
        >
          <ShieldOff className="h-4 w-4" aria-hidden />
          {t("participants.revoke")}
        </Button>
      )}
    </Card>
  );
}

interface ConvidarParticipanteModalProps {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  onConvidado: () => void;
}

function ConvidarParticipanteModal({
  open,
  onClose,
  clienteId,
  onConvidado,
}: ConvidarParticipanteModalProps) {
  const { t } = useTranslation("admin");
  const { convidar, salvando } = useParticipantesComandos();

  const [papel, setPapel] = useState<PapelParticipante>("aplicante");
  const [sujeitoTipo, setSujeitoTipo] = useState<SujeitoTipo>("titular");
  const [familiarId, setFamiliarId] = useState("");
  const [organizacaoId, setOrganizacaoId] = useState("");
  const [nomeExibicao, setNomeExibicao] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // Idempotency key gerada uma vez por ABERTURA do modal (mesmo critério de
  // `ContratoFormulario.tsx`) — duplo-clique em "Convidar" reenvia a mesma chave, o servidor
  // trata como a mesma operação em vez de criar dois participantes.
  const idempotencyKeyRef = useRef("");
  useEffect(() => {
    if (open) idempotencyKeyRef.current = crypto.randomUUID();
  }, [open]);

  function resetar() {
    setPapel("aplicante");
    setSujeitoTipo("titular");
    setFamiliarId("");
    setOrganizacaoId("");
    setNomeExibicao("");
    setEmail("");
    setErro(null);
  }

  function fechar() {
    resetar();
    onClose();
  }

  const podeSalvar =
    nomeExibicao.trim() !== "" &&
    (sujeitoTipo !== "familiar" || familiarId.trim() !== "") &&
    (sujeitoTipo !== "organizacao" || organizacaoId.trim() !== "") &&
    !salvando;

  async function handleSalvar() {
    if (!podeSalvar) return;
    setErro(null);
    try {
      await convidar({
        clienteId,
        papel,
        sujeitoTipo,
        ...(sujeitoTipo === "familiar" ? { familiarId: familiarId.trim() } : {}),
        ...(sujeitoTipo === "organizacao" ? { organizacaoId: organizacaoId.trim() } : {}),
        nomeExibicao: nomeExibicao.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        idempotencyKey: idempotencyKeyRef.current,
      });
      toast.success(t("participants.successInvited"));
      fechar();
      onConvidado();
    } catch (causa) {
      setErro(mensagemDeErro(t, causa as CasoComandoError, t("participants.errorValidation")));
    }
  }

  return (
    <Modal open={open} onClose={fechar} title={t("participants.inviteTitle")}>
      <div className="flex flex-col gap-4">
        <Select
          label={t("participants.role")}
          value={papel}
          onChange={(e) => setPapel(e.target.value as PapelParticipante)}
        >
          {PAPEIS_FIXOS.map((item) => (
            <option key={item} value={item}>
              {t(PAPEL_LABEL_KEY[item])}
            </option>
          ))}
        </Select>
        <Select
          label={t("participants.subjectType")}
          value={sujeitoTipo}
          onChange={(e) => setSujeitoTipo(e.target.value as SujeitoTipo)}
        >
          <option value="titular">{t("participants.subjectTypeTitleholder")}</option>
          <option value="familiar">{t("participants.subjectTypeFamily")}</option>
          <option value="organizacao">{t("participants.subjectTypeOrganization")}</option>
        </Select>
        {sujeitoTipo === "familiar" && (
          <Input
            label={t("participants.familiarIdLabel")}
            value={familiarId}
            onChange={(e) => setFamiliarId(e.target.value)}
          />
        )}
        {sujeitoTipo === "organizacao" && (
          <Input
            label={t("participants.organizacaoIdLabel")}
            value={organizacaoId}
            onChange={(e) => setOrganizacaoId(e.target.value)}
          />
        )}
        <Input
          label={t("participants.displayNameLabel")}
          value={nomeExibicao}
          onChange={(e) => setNomeExibicao(e.target.value)}
        />
        <Input
          type="email"
          label={t("participants.emailLabel")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <Button onClick={() => void handleSalvar()} loading={salvando} disabled={!podeSalvar}>
          {t("participants.invite")}
        </Button>
      </div>
    </Modal>
  );
}
