import { container } from "@/app/di";
import { useMockDb } from "@/mocks/store";
import { Badge, Button, Card, Input, Modal, Select, Textarea, toast } from "@/shared/ui";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const STATUS_VARIANT = {
  rascunho: "neutral",
  enviada: "navy",
  aceita: "success",
  recusada: "danger",
} as const;

function formatarValor(valor: number, moeda: "BRL" | "USD"): string {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

export function PropostasPage() {
  const { t } = useTranslation("admin");
  const propostas = useMockDb((s) => s.propostas);
  const leads = useMockDb((s) => s.leads);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const nomePara = (id: string) => leads.find((l) => l.id === id)?.nome ?? id;

  async function handleEnviar(id: string) {
    await container.propostas.enviar(id);
    toast.success(t("proposals.sentSuccess"));
  }

  async function handleStatus(id: string, status: "aceita" | "recusada") {
    await container.propostas.marcarStatus(id, status);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">{t("proposals.title")}</h1>
          <p className="text-sm text-ink-soft">{t("proposals.subtitle")}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>{t("proposals.new")}</Button>
      </div>

      {propostas.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("proposals.noProposals")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {propostas.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-navy">{nomePara(p.leadOuClienteId)}</p>
                  <p className="mt-1 text-xs text-ink-muted">{p.tipoVisto}</p>
                </div>
                <Badge variant={STATUS_VARIANT[p.status]}>
                  {t(`proposals.status_${p.status}`)}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{p.escopo}</p>
              <p className="mt-2 font-display text-lg font-semibold text-navy">
                {formatarValor(p.valor, p.moeda)}
              </p>
              <p className="text-xs text-ink-muted">{p.condicoes}</p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/admin/propostas/${p.id}`)}
                >
                  Ver documento
                </Button>
                {p.status === "rascunho" && (
                  <Button size="sm" onClick={() => handleEnviar(p.id)}>
                    {t("proposals.send")}
                  </Button>
                )}
                {p.status === "enviada" && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatus(p.id, "aceita")}
                    >
                      {t("proposals.markAccepted")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatus(p.id, "recusada")}
                    >
                      {t("proposals.markRejected")}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <NovaPropostaModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function NovaPropostaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const todosLeads = useMockDb((s) => s.leads);
  const leads = useMemo(
    () => todosLeads.filter((l) => l.estagio === "em_negociacao"),
    [todosLeads],
  );
  const proximoItemId = useRef(1);
  const [leadId, setLeadId] = useState("");
  const [escopo, setEscopo] = useState("");
  const [itensEscopo, setItensEscopo] = useState<{ id: number; texto: string }[]>([
    { id: 0, texto: "" },
  ]);
  const [tipoVisto, setTipoVisto] = useState("EB-2 NIW");
  const [valor, setValor] = useState("");
  const [condicoes, setCondicoes] = useState("");
  const [validoAte, setValidoAte] = useState("");
  const [criando, setCriando] = useState(false);

  const itensPreenchidos = itensEscopo.map((item) => item.texto.trim()).filter(Boolean);

  async function handleCriar() {
    if (!leadId || !escopo || !valor || !validoAte || itensPreenchidos.length === 0 || criando)
      return;
    setCriando(true);
    try {
      await container.propostas.criar({
        leadOuClienteId: leadId,
        escopo,
        itensEscopo: itensPreenchidos,
        tipoVisto,
        valor: Number(valor),
        moeda: "BRL",
        condicoes,
        validoAte: new Date(validoAte).toISOString(),
      });
      toast.success(t("proposals.createdSuccess"));
      onClose();
      setLeadId("");
      setEscopo("");
      setItensEscopo([{ id: 0, texto: "" }]);
      setValor("");
      setCondicoes("");
      setValidoAte("");
    } finally {
      setCriando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("proposals.new")}>
      <div className="flex flex-col gap-4">
        <Select label="Lead" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
          <option value="" disabled>
            Selecione
          </option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </Select>
        <Textarea
          label={t("proposals.scope")}
          placeholder={t("proposals.scopePlaceholder")}
          value={escopo}
          onChange={(e) => setEscopo(e.target.value)}
        />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-navy">Itens do escopo</p>
          {itensEscopo.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                value={item.texto}
                onChange={(e) =>
                  setItensEscopo(
                    itensEscopo.map((atual) =>
                      atual.id === item.id ? { ...atual, texto: e.target.value } : atual,
                    ),
                  )
                }
                placeholder="Ex.: Business Plan completo"
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={itensEscopo.length === 1}
                onClick={() => setItensEscopo(itensEscopo.filter((atual) => atual.id !== item.id))}
                aria-label="Remover item"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              setItensEscopo([...itensEscopo, { id: proximoItemId.current++, texto: "" }])
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar item
          </Button>
        </div>
        <Input
          label={t("proposals.visaType")}
          value={tipoVisto}
          onChange={(e) => setTipoVisto(e.target.value)}
        />
        <Input
          type="number"
          label={t("proposals.value")}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <Input
          label={t("proposals.conditions")}
          placeholder={t("proposals.conditionsPlaceholder")}
          value={condicoes}
          onChange={(e) => setCondicoes(e.target.value)}
        />
        <Input
          type="date"
          label="Válida até"
          value={validoAte}
          onChange={(e) => setValidoAte(e.target.value)}
        />
        <Button
          onClick={handleCriar}
          loading={criando}
          disabled={
            criando || !leadId || !escopo || !valor || !validoAte || itensPreenchidos.length === 0
          }
        >
          {t("proposals.create")}
        </Button>
      </div>
    </Modal>
  );
}
