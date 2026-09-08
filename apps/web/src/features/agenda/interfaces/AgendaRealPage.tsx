import { Badge, Button, Card, Modal } from "@/shared/ui";
import { CalendarDays, CircleAlert, FileAudio, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useAgendaClienteReal } from "../application/real-hooks";
import type { Reuniao, Transcricao } from "../domain/types";

export function AgendaRealPage() {
  const { reunioes, transcricoes, carregando, erro } = useAgendaClienteReal();
  const [transcricaoSelecionada, setTranscricaoSelecionada] = useState<Transcricao | null>(null);

  if (carregando) return <EstadoAgenda mensagem="Carregando agenda real…" />;
  if (erro) return <EstadoAgenda mensagem="Não foi possível carregar a agenda." erro />;

  const futuras = reunioes.filter((reuniao) => reuniao.status === "agendada");
  const anteriores = reunioes.filter((reuniao) => reuniao.status !== "agendada");
  const transcricoesPorReuniao = new Map(
    transcricoes.map((transcricao) => [transcricao.reuniaoId, transcricao]),
  );

  return (
    <div className="flex flex-col gap-7" data-testid="agenda-real">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
          Agenda do processo
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">Agenda</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Reuniões e transcrições visíveis somente para o seu processo.
        </p>
      </div>

      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
        <p>
          O agendamento por provedor ainda não está habilitado neste ambiente. Nenhuma reunião é
          criada por simulação ou gravada diretamente pelo navegador.
        </p>
      </Card>

      {reunioes.length === 0 ? (
        <Card className="text-sm text-ink-muted">Nenhuma reunião real registrada ainda.</Card>
      ) : (
        <>
          <SecaoReunioes
            titulo="Próximas reuniões"
            reunioes={futuras}
            transcricoesPorReuniao={transcricoesPorReuniao}
            onAbrirTranscricao={setTranscricaoSelecionada}
            vazio="Nenhuma reunião futura."
          />
          <SecaoReunioes
            titulo="Histórico"
            reunioes={anteriores}
            transcricoesPorReuniao={transcricoesPorReuniao}
            onAbrirTranscricao={setTranscricaoSelecionada}
            vazio="Nenhuma reunião concluída ou cancelada."
          />
        </>
      )}

      <Modal
        open={!!transcricaoSelecionada}
        onClose={() => setTranscricaoSelecionada(null)}
        title="Transcrição da reunião"
      >
        {transcricaoSelecionada && <ConteudoTranscricao transcricao={transcricaoSelecionada} />}
      </Modal>
    </div>
  );
}

function SecaoReunioes({
  titulo,
  reunioes,
  transcricoesPorReuniao,
  onAbrirTranscricao,
  vazio,
}: {
  titulo: string;
  reunioes: Reuniao[];
  transcricoesPorReuniao: Map<string, Transcricao>;
  onAbrirTranscricao: (transcricao: Transcricao) => void;
  vazio: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-label text-gold-700">
        {titulo}
      </h2>
      {reunioes.length === 0 ? (
        <p className="text-sm text-ink-muted">{vazio}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reunioes.map((reuniao) => {
            const transcricao = transcricoesPorReuniao.get(reuniao.id);
            return (
              <Card
                key={reuniao.id}
                className="flex items-center gap-3"
                data-testid="agenda-reuniao"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-navy" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy">{reuniao.titulo}</p>
                  <p className="text-xs text-ink-muted">
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
                    onClick={() => onAbrirTranscricao(transcricao)}
                  >
                    <FileAudio className="h-3.5 w-3.5" aria-hidden />
                    Ver transcrição
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ConteudoTranscricao({ transcricao }: { transcricao: Transcricao }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-label text-gold-700">Resumo</h3>
        <p className="mt-1 text-sm text-ink-soft">{transcricao.resumo}</p>
      </div>
      {transcricao.actionItems.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-label text-gold-700">
            Próximas ações
          </h3>
          <ul className="mt-1 list-inside list-disc text-sm text-ink-soft">
            {transcricao.actionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-label text-gold-700">
          Transcrição
        </h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{transcricao.texto}</p>
      </div>
    </div>
  );
}

function EstadoAgenda({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">Agenda</h1>
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
