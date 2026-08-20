import { useMockDb } from "@/mocks/store";
import { Badge, Button, Card, Modal, toast } from "@/shared/ui";
import { Bot, CalendarDays, CheckCircle2, FileAudio, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const INTEGRACAO_POR_PROVEDOR: Record<string, string> = {
  fireflies: "fireflies",
  microsoft_teams: "teams-transcricao",
};

const NOME_PROVEDOR: Record<string, string> = {
  fireflies: "Fireflies",
  microsoft_teams: "Microsoft Teams",
};

export function AdminAgendaPage() {
  const { t } = useTranslation("admin");
  const reunioes = useMockDb((s) => s.reunioes);
  const transcricoes = useMockDb((s) => s.transcricoes);
  const clientes = useMockDb((s) => s.clientes);
  const leads = useMockDb((s) => s.leads);
  const integracoes = useMockDb((s) => s.integracoes);
  const [syncing, setSyncing] = useState(false);
  const [transcricaoSelecionada, setTranscricaoSelecionada] = useState<string | null>(null);

  function provedorAtivo(provedor: string): boolean {
    const integracaoId = INTEGRACAO_POR_PROVEDOR[provedor];
    return integracoes.find((i) => i.id === integracaoId)?.ativa ?? false;
  }

  const nomeCliente = (clienteId: string) =>
    clientes.find((c) => c.id === clienteId)?.nome ??
    leads.find((l) => l.id === clienteId)?.nome ??
    clienteId;

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSyncing(false);
    toast.success(t("agendaAdmin.synced"));
  }

  const reunioesOrdenadas = [...reunioes].sort((a, b) => b.inicio.localeCompare(a.inicio));
  const transcricaoAtiva = transcricoes.find((tr) => tr.id === transcricaoSelecionada);
  const reuniaoDaTranscricao = reunioes.find((r) => r.id === transcricaoAtiva?.reuniaoId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("agendaAdmin.title")}</h1>
        <p className="text-sm text-ink-soft">{t("agendaAdmin.subtitle")}</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-label text-gold-700">
              {t("agendaAdmin.connectionStatus")}
            </h2>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                {t("agendaAdmin.connectedGmail")}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                {t("agendaAdmin.connectedOutlook")}
              </span>
            </div>
          </div>
          <Button variant="secondary" onClick={handleSync} loading={syncing} disabled={syncing}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {syncing ? t("agendaAdmin.syncing") : t("agendaAdmin.sync")}
          </Button>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("agendaAdmin.allMeetings")}
        </h2>
        <div className="flex flex-col gap-2">
          {reunioesOrdenadas.map((r) => {
            const transcricao = transcricoes.find((tr) => tr.reuniaoId === r.id);
            return (
              <Card key={r.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-navy">{r.titulo}</p>
                    {r.criadaPor === "agente_ia" && (
                      <Badge variant="gold">
                        <Bot className="h-3 w-3" aria-hidden />
                        Agendado pelo agente
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-ink-muted">
                    {t("agendaAdmin.client")}: {nomeCliente(r.clienteId)} ·{" "}
                    {new Date(r.inicio).toLocaleDateString("pt-BR")} · {r.canal}
                  </p>
                </div>
                {transcricao && provedorAtivo(transcricao.provedor) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setTranscricaoSelecionada(transcricao.id)}
                  >
                    <FileAudio className="h-3.5 w-3.5" aria-hidden />
                    {t("agendaAdmin.viewTranscription")}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <Modal
        open={!!transcricaoAtiva}
        onClose={() => setTranscricaoSelecionada(null)}
        title={reuniaoDaTranscricao?.titulo}
      >
        {transcricaoAtiva && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-label text-gold-700">
                {t("agendaAdmin.summary")}
              </h3>
              <p className="text-sm text-ink-soft">{transcricaoAtiva.resumo}</p>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-label text-gold-700">
                {t("agendaAdmin.actionItems")}
              </h3>
              <ul className="list-inside list-disc text-sm text-ink-soft">
                {transcricaoAtiva.actionItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Badge variant="neutral" className="w-fit">
              {NOME_PROVEDOR[transcricaoAtiva.provedor]}
            </Badge>
          </div>
        )}
      </Modal>
    </div>
  );
}
