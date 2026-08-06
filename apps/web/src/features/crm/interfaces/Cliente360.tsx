import { container } from "@/app/di";
import { useReunioesCliente } from "@/features/agenda/application/hooks";
import { useConversaCliente } from "@/features/comunicacao/application/hooks";
import { useDocumentosCliente } from "@/features/documentos/application/hooks";
import { usePagamentosCliente } from "@/features/pagamentos/application/hooks";
import { useMockDb } from "@/mocks/store";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Modal,
  Stepper,
  type StepperItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@/shared/ui";
import { MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const SAUDE_VARIANT = {
  em_dia: "success",
  atencao: "warning",
  atrasado: "danger",
} as const;

const DOC_STATUS_VARIANT = {
  pendente: "neutral",
  enviado: "navy",
  em_analise: "gold",
  aprovado: "success",
  ajustes: "warning",
} as const;

const PAG_STATUS_VARIANT = {
  pendente: "gold",
  pago: "success",
  atrasado: "danger",
} as const;

interface Props {
  clienteId: string;
  onBack: () => void;
}

export function Cliente360({ clienteId, onBack }: Props) {
  const { t } = useTranslation("admin");
  const cliente = useMockDb((s) => s.clientes.find((c) => c.id === clienteId));
  const jornada = useMockDb((s) => s.jornadas.find((j) => j.clienteId === clienteId));
  const todasInteracoes = useMockDb((s) => s.interacoes);
  const interacoes = useMemo(
    () =>
      todasInteracoes
        .filter((i) => i.clienteId === clienteId)
        .sort((a, b) => b.ocorridoEm.localeCompare(a.ocorridoEm)),
    [todasInteracoes, clienteId],
  );
  const documentos = useDocumentosCliente(clienteId);
  const pagamentos = usePagamentosCliente(clienteId);
  const reunioes = useReunioesCliente(clienteId);
  const conversa = useConversaCliente(clienteId);

  if (!cliente || !jornada) return null;

  const stepperItems: StepperItem[] = jornada.fases.map((f) => ({
    id: f.id,
    title: f.titulo,
    status: f.status,
  }));

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="w-fit text-sm text-gold-700 hover:underline"
      >
        {t("clientes.backToList")}
      </button>

      <div className="flex items-center gap-4">
        <Avatar name={cliente.nome} size="lg" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">{cliente.nome}</h1>
          <p className="text-sm text-ink-soft">
            {cliente.tipoVisto} · {cliente.caseManager}
          </p>
        </div>
        <Badge variant={SAUDE_VARIANT[cliente.saude]} className="ml-auto">
          {t(`clientes.health_${cliente.saude}`)}
        </Badge>
      </div>

      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data">{t("clientes.tabs.data")}</TabsTrigger>
          <TabsTrigger value="journey">{t("clientes.tabs.journey")}</TabsTrigger>
          <TabsTrigger value="documents">{t("clientes.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="payments">{t("clientes.tabs.payments")}</TabsTrigger>
          <TabsTrigger value="meetings">{t("clientes.tabs.meetings")}</TabsTrigger>
          <TabsTrigger value="conversations">{t("clientes.tabs.conversations")}</TabsTrigger>
          <TabsTrigger value="history">{t("clientes.tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <Card className="grid max-w-lg grid-cols-2 gap-4 text-sm">
            <Info label="Nome" value={cliente.nome} />
            <Info label="E-mail" value={cliente.email} />
            <Info label="Telefone" value={cliente.telefone} />
            <Info label="Visto" value={cliente.tipoVisto} />
            <Info label="Case manager" value={cliente.caseManager} />
            <Info
              label="Cliente desde"
              value={new Date(cliente.criadoEm).toLocaleDateString("pt-BR")}
            />
          </Card>
        </TabsContent>

        <TabsContent value="journey">
          <Card>
            <div className="mb-6 overflow-x-auto">
              <Stepper items={stepperItems} />
            </div>
            <JornadaGestao clienteId={clienteId} />
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          {documentos.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <div className="flex flex-col gap-2">
              {documentos.map((d) => (
                <Card key={d.id} className="flex items-center justify-between">
                  <p className="text-sm text-navy">{d.nome}</p>
                  <Badge variant={DOC_STATUS_VARIANT[d.status]}>{d.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {pagamentos.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pagamentos.map((p) => (
                <Card key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-navy">{p.descricao}</p>
                    <p className="text-xs text-ink-muted">
                      {new Intl.NumberFormat(p.moeda === "BRL" ? "pt-BR" : "en-US", {
                        style: "currency",
                        currency: p.moeda,
                      }).format(p.valor)}
                    </p>
                  </div>
                  <Badge variant={PAG_STATUS_VARIANT[p.status]}>{p.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="meetings">
          {reunioes.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <div className="flex flex-col gap-2">
              {reunioes.map((r) => (
                <Card key={r.id} className="flex items-center justify-between">
                  <p className="text-sm text-navy">{r.titulo}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(r.inicio).toLocaleDateString("pt-BR")}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conversations">
          {!conversa ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <Card>
              <div className="mb-3 flex items-center gap-2 text-xs text-ink-muted">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                {conversa.canal}
              </div>
              <div className="flex flex-col gap-2">
                {conversa.mensagens.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                      m.autor === "cliente"
                        ? "self-start bg-cream-200 text-ink"
                        : "self-end bg-navy-50 text-navy"
                    }`}
                  >
                    {m.texto}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          {interacoes.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("clientes.noHistory")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {interacoes.map((i) => (
                <li
                  key={i.id}
                  className="rounded-md border border-border bg-white px-4 py-3 text-sm"
                >
                  <p className="text-ink-soft">{i.descricao}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {new Date(i.ocorridoEm).toLocaleString("pt-BR")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-medium text-navy">{value}</p>
    </div>
  );
}

function JornadaGestao({ clienteId }: { clienteId: string }) {
  const { t } = useTranslation("admin");
  const jornada = useMockDb((s) => s.jornadas.find((j) => j.clienteId === clienteId));
  const [modalOpen, setModalOpen] = useState(false);
  const [liberando, setLiberando] = useState(false);

  if (!jornada) return null;

  const faseAtualIdx = jornada.fases.findIndex((f) => f.status === "em_andamento");
  const proximaBloqueadaIdx = jornada.fases.findIndex((f) => f.status === "bloqueada");

  if (proximaBloqueadaIdx === -1) {
    return <p className="text-sm text-ink-muted">{t("clientes.allPhasesUnlocked")}</p>;
  }

  const proximaFase = jornada.fases[proximaBloqueadaIdx];
  const faseAtualConcluida =
    faseAtualIdx === -1 || jornada.fases[faseAtualIdx]?.status === "concluida";

  async function handleLiberar() {
    if (liberando) return;
    setLiberando(true);
    try {
      await container.jornada.liberarFase(clienteId, proximaFase.id);
      toast.success(t("clientes.unlockedSuccess"));
      setModalOpen(false);
    } finally {
      setLiberando(false);
    }
  }

  return (
    <>
      <Button onClick={() => setModalOpen(true)}>{t("clientes.unlockNextPhase")}</Button>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("clientes.unlockConfirmTitle")}
        description={t("clientes.unlockConfirmDescription", { fase: proximaFase.titulo })}
      >
        <div className="flex flex-col gap-4">
          {!faseAtualConcluida && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t("clientes.currentPhaseIncomplete")}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLiberar} loading={liberando} disabled={liberando}>
              {t("clientes.unlockNextPhase")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
