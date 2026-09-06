import { Badge, Button, Card, Modal } from "@/shared/ui";
import { Bot, CalendarDays, CircleAlert, FileAudio, Users } from "lucide-react";
import { useState } from "react";
import { useAgendaAdminReal } from "../application/real-hooks";
import { ConteudoTranscricao } from "./AgendaRealPage";

export function AdminAgendaRealPage() {
  const { reunioes, transcricoes, nomesClientes, carregando, erro } = useAgendaAdminReal();
  const [transcricaoSelecionada, setTranscricaoSelecionada] = useState<string | null>(null);
  const transcricaoAtiva = transcricoes.find((item) => item.id === transcricaoSelecionada);

  if (carregando) return <EstadoAdminAgenda mensagem="Carregando agenda real…" />;
  if (erro) return <EstadoAdminAgenda mensagem="Não foi possível carregar a agenda." erro />;

  const transcricoesPorReuniao = new Map(transcricoes.map((item) => [item.reuniaoId, item]));
  return (
    <div className="flex flex-col gap-7" data-testid="admin-agenda-real">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
          Operação conectada
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
          Agenda administrativa
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Reuniões e transcrições reais, filtradas por RLS e sem simulação de sincronização.
        </p>
      </div>

      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        <Users className="h-4 w-4 text-gold-700" aria-hidden />
        {reunioes.length} reuniões registradas · {transcricoes.length} transcrições disponíveis
      </Card>

      {reunioes.length === 0 ? (
        <Card className="text-sm text-ink-muted">Nenhuma reunião real registrada ainda.</Card>
      ) : (
        <section className="flex flex-col gap-3">
          {reunioes.map((reuniao) => {
            const transcricao = transcricoesPorReuniao.get(reuniao.id);
            return (
              <Card
                key={reuniao.id}
                className="flex items-center gap-3"
                data-testid="admin-agenda-reuniao"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-navy" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-navy">{reuniao.titulo}</p>
                    {reuniao.criadaPor === "agente_ia" && (
                      <Badge variant="gold">
                        <Bot className="h-3 w-3" aria-hidden />
                        Agente IA
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted">
                    {nomesClientes[reuniao.clienteId] ?? reuniao.clienteId} ·{" "}
                    {new Date(reuniao.inicio).toLocaleString("pt-BR")} · {reuniao.canal}
                  </p>
                </div>
                <Badge variant={reuniao.status === "cancelada" ? "neutral" : "success"}>
                  {reuniao.status}
                </Badge>
                {transcricao && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setTranscricaoSelecionada(transcricao.id)}
                  >
                    <FileAudio className="h-3.5 w-3.5" aria-hidden />
                    Ver transcrição
                  </Button>
                )}
              </Card>
            );
          })}
        </section>
      )}

      <Modal
        open={!!transcricaoAtiva}
        onClose={() => setTranscricaoSelecionada(null)}
        title="Transcrição da reunião"
      >
        {transcricaoAtiva && <ConteudoTranscricao transcricao={transcricaoAtiva} />}
      </Modal>
    </div>
  );
}

function EstadoAdminAgenda({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
        Agenda administrativa
      </h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? (
          <CircleAlert className="h-4 w-4 text-red-600" />
        ) : (
          <CalendarDays className="h-4 w-4" />
        )}
        {mensagem}
      </Card>
    </div>
  );
}
