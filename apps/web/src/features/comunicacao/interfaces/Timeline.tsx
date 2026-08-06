import type { CanalEvento, EventoComunicacao } from "@/features/comunicacao/domain/types";
import { Badge } from "@/shared/ui";
import { AlertTriangle, Calendar, Mail, MessageCircle, MonitorCog, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

const CANAL_ICON: Record<CanalEvento, typeof Mail> = {
  whatsapp: MessageCircle,
  email: Mail,
  chat_portal: Send,
  reuniao: Calendar,
  sistema: MonitorCog,
};

interface TimelineProps {
  eventos: EventoComunicacao[];
  emptyLabel: string;
}

/**
 * Feed cronológico único (E08-S01). Usado na visão 360 (aba histórico), no detalhe de lead e
 * como base do chat do portal. Canal é sempre indicado por ícone + rótulo — nunca só cor
 * (regra de acessibilidade repetida nos specs de E08).
 */
export function Timeline({ eventos, emptyLabel }: TimelineProps) {
  const { t } = useTranslation("common");

  if (eventos.length === 0) {
    return <p className="text-sm text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {eventos.map((evento) => {
        const Icon = CANAL_ICON[evento.canal];
        return (
          <li
            key={evento.id}
            className="rounded-md border border-border bg-white px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span>{t(`timeline.channel.${evento.canal}`)}</span>
              <span aria-hidden>·</span>
              <span className="font-medium text-ink-soft">{evento.autor}</span>
              {evento.pendenteDeCanal && (
                <Badge variant="warning" className="ml-auto gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  {t("timeline.pendingChannel")}
                </Badge>
              )}
            </div>
            <p className="mt-1.5 text-ink-soft">{evento.conteudo}</p>
            {evento.anexos && evento.anexos.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {evento.anexos.map((a) => (
                  <li
                    key={a.nome}
                    className="rounded bg-cream-200 px-2 py-0.5 text-xs text-ink-muted"
                  >
                    📎 {a.nome}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1.5 text-xs text-ink-muted">
              {new Date(evento.ocorridoEm).toLocaleString("pt-BR")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
