import { container } from "@/app/di";
import { useReunioesCliente } from "@/features/agenda/application/hooks";
import { useConversaCliente, useTimeline } from "@/features/comunicacao/application/hooks";
import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
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
import { ArrowLeft, CalendarDays, FileText, MessageCircle, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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
  em_conferencia: "navy",
  pago: "success",
  divergente: "danger",
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
  const timeline = useTimeline(clienteId);
  const timelineDesc = useMemo(() => [...timeline].reverse(), [timeline]);
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
  const faseAtual = jornada.fases.find(
    (fase) => fase.status === "em_andamento" || fase.status === "liberada",
  );
  const documentosEmAcao = documentos.filter((documento) =>
    ["pendente", "ajustes", "em_analise"].includes(documento.status),
  ).length;
  const pagamentosEmAberto = pagamentos.filter((pagamento) => pagamento.status !== "pago").length;
  const proximaReuniao = [...reunioes]
    .filter((reuniao) => new Date(reuniao.inicio).getTime() >= Date.now())
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0];

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-gold-700 transition hover:text-gold-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("clientes.backToList")}
      </button>

      <section className="overflow-hidden rounded-xl bg-navy text-white shadow-elevated">
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={cliente.nome} size="lg" className="ring-4 ring-white/15" />
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">
                Visão do cliente
              </p>
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-white">
                {cliente.nome}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {cliente.tipoVisto} <span className="mx-1.5 text-slate-500">·</span>{" "}
                {cliente.caseManager}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cliente.programaId && (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
                {cliente.programaId} · v{cliente.programaVersao}
              </span>
            )}
            <Badge variant={SAUDE_VARIANT[cliente.saude]}>
              {t(`clientes.health_${cliente.saude}`)}
            </Badge>
          </div>
        </div>
        <div className="grid divide-y divide-white/10 border-t border-white/10 bg-white/[0.045] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <ClientSignal
            icon={FileText}
            label="Documentos em ação"
            value={
              documentosEmAcao === 0
                ? "Em dia"
                : `${documentosEmAcao} pendente${documentosEmAcao > 1 ? "s" : ""}`
            }
          />
          <ClientSignal
            icon={WalletCards}
            label="Financeiro"
            value={pagamentosEmAberto === 0 ? "Regular" : `${pagamentosEmAberto} em aberto`}
          />
          <ClientSignal
            icon={CalendarDays}
            label="Próximo encontro"
            value={
              proximaReuniao
                ? new Date(proximaReuniao.inicio).toLocaleDateString("pt-BR")
                : "Sem agenda"
            }
          />
        </div>
      </section>

      <Tabs defaultValue="data">
        <TabsList className="flex max-w-full overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="data">{t("clientes.tabs.data")}</TabsTrigger>
          <TabsTrigger value="journey">{t("clientes.tabs.journey")}</TabsTrigger>
          <TabsTrigger value="documents">{t("clientes.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="payments">{t("clientes.tabs.payments")}</TabsTrigger>
          <TabsTrigger value="meetings">{t("clientes.tabs.meetings")}</TabsTrigger>
          <TabsTrigger value="conversations">{t("clientes.tabs.conversations")}</TabsTrigger>
          <TabsTrigger value="history">{t("clientes.tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <Card className="grid max-w-2xl grid-cols-1 gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
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
            <div className="mb-5 flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-navy">Etapas do processo</p>
                <p className="text-xs text-ink-muted">
                  {faseAtual ? `Em andamento: ${faseAtual.titulo}` : "Jornada concluída"}
                </p>
              </div>
            </div>
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
              {documentos.some((d) => d.status === "em_analise") && (
                <Link to="/admin/documentos" className="text-xs text-gold-700 hover:underline">
                  {t("clientes.goToReviewQueue")}
                </Link>
              )}
              {documentos.map((d) => (
                <Card key={d.id} className="flex items-center justify-between">
                  <p className="text-sm text-navy">{d.nome}</p>
                  <div className="flex items-center gap-2">
                    {d.analise && (
                      <Badge variant={d.analise.aderencia === "atende" ? "success" : "warning"}>
                        {d.analise.aderencia}
                      </Badge>
                    )}
                    <Badge variant={DOC_STATUS_VARIANT[d.status]}>{d.status}</Badge>
                  </div>
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
          <Timeline eventos={timelineDesc} emptyLabel={t("clientes.noHistory")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientSignal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-gold-300">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
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
