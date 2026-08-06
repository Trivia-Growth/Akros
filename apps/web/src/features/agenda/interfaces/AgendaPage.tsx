import { container } from "@/app/di";
import { useReunioesCliente } from "@/features/agenda/application/hooks";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { useMockDb } from "@/mocks/store";
import { Badge, Button, Card, Modal, toast } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import { CalendarDays, FileAudio, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function gerarSlots(): { label: string; inicio: string; fim: string }[] {
  const slots: { label: string; inicio: string; fim: string }[] = [];
  const base = new Date();
  base.setDate(base.getDate() + 1);
  base.setHours(10, 0, 0, 0);

  for (let i = 0; i < 3; i++) {
    const inicio = new Date(base);
    inicio.setDate(inicio.getDate() + i);
    const fim = new Date(inicio.getTime() + 30 * 60 * 1000);
    slots.push({
      label: inicio.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    });
  }
  return slots;
}

export function AgendaPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const reunioes = useReunioesCliente(cliente?.id);
  const transcricoes = useMockDb((s) => s.transcricoes);
  const [modalOpen, setModalOpen] = useState(false);
  const [slotSelecionado, setSlotSelecionado] = useState<string | null>(null);
  const [agendando, setAgendando] = useState(false);
  const slots = gerarSlots();

  const futuras = reunioes
    .filter((r) => r.status === "agendada")
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const passadas = reunioes
    .filter((r) => r.status !== "agendada")
    .sort((a, b) => b.inicio.localeCompare(a.inicio));

  async function handleAgendar() {
    if (!cliente || !slotSelecionado || agendando) return;
    const slot = slots.find((s) => s.inicio === slotSelecionado);
    if (!slot) return;

    setAgendando(true);
    try {
      await container.agenda.agendar({
        clienteId: cliente.id,
        titulo: "Reunião com case manager",
        inicio: slot.inicio,
        fim: slot.fim,
        canal: "calendly",
      });
      toast.success(t("agenda.scheduled"));
      setModalOpen(false);
      setSlotSelecionado(null);
    } finally {
      setAgendando(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">{t("agenda.title")}</h1>
          <p className="text-sm text-ink-soft">{t("agenda.subtitle")}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          {t("agenda.schedule")}
        </Button>
      </div>

      {reunioes.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("agenda.noMeetings")}</p>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-label text-gold-700">
              {t("agenda.upcoming")}
            </h2>
            <div className="flex flex-col gap-3">
              {futuras.map((r) => (
                <ReuniaoCard
                  key={r.id}
                  reuniaoId={r.id}
                  titulo={r.titulo}
                  inicio={r.inicio}
                  canal={r.canal}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-label text-gold-700">
              {t("agenda.past")}
            </h2>
            <div className="flex flex-col gap-3">
              {passadas.map((r) => {
                const transcricao = transcricoes.find((t) => t.reuniaoId === r.id);
                return (
                  <ReuniaoCard
                    key={r.id}
                    reuniaoId={r.id}
                    titulo={r.titulo}
                    inicio={r.inicio}
                    canal={r.canal}
                    temTranscricao={!!transcricao}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("agenda.scheduleModalTitle")}
        description={t("agenda.selectSlot")}
      >
        <div className="flex flex-col gap-3">
          {slots.map((slot) => (
            <button
              key={slot.inicio}
              type="button"
              onClick={() => setSlotSelecionado(slot.inicio)}
              className={cn(
                "rounded-md border px-4 py-3 text-left text-sm transition-colors",
                slotSelecionado === slot.inicio
                  ? "border-navy bg-navy-50 text-navy"
                  : "border-border text-ink-soft hover:bg-cream-200",
              )}
            >
              {slot.label}
            </button>
          ))}
          <Button
            className="mt-2"
            onClick={handleAgendar}
            loading={agendando}
            disabled={agendando || !slotSelecionado}
          >
            {t("agenda.confirm")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

interface ReuniaoCardProps {
  reuniaoId: string;
  titulo: string;
  inicio: string;
  canal: string;
  temTranscricao?: boolean;
}

function ReuniaoCard({ titulo, inicio, canal, temTranscricao }: ReuniaoCardProps) {
  const { t } = useTranslation("portal");
  return (
    <Card className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy">
        <CalendarDays className="h-4 w-4" aria-hidden />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-navy">{titulo}</p>
        <p className="text-xs text-ink-muted">
          {new Date(inicio).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {canal}
        </p>
      </div>
      {temTranscricao && (
        <Badge variant="gold">
          <FileAudio className="h-3 w-3" aria-hidden />
          {t("agenda.transcription")}
        </Badge>
      )}
    </Card>
  );
}
