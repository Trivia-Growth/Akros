import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import { Card } from "@/shared/ui";
import { CircleAlert, LockKeyhole, MessageCircle } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useComunicacaoClienteReal } from "../application/real-hooks";

/** Portal real: consulta eventos autorizados por RLS; criação aguarda função Edge autenticada. */
export function MensagensRealPage() {
  const { t } = useTranslation("portal");
  const { eventos, carregando, erro } = useComunicacaoClienteReal();
  const timeline = useMemo(
    () => eventos.filter((evento) => evento.canal !== "whatsapp" && evento.canal !== "email"),
    [eventos],
  );

  if (carregando) return <EstadoMensagens mensagem="Carregando mensagens reais…" />;
  if (erro) return <EstadoMensagens mensagem="Não foi possível carregar mensagens." erro />;

  return (
    <div className="flex flex-col gap-6" data-testid="mensagens-real">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("messages.title")}</h1>
        <p className="text-sm text-ink-soft">{t("messages.subtitle")}</p>
        <p className="mt-2 text-xs italic text-ink-muted">{t("messages.notDeletableNotice")}</p>
      </div>

      <Card>
        <Timeline eventos={timeline} emptyLabel={t("messages.empty")} />
      </Card>

      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
        <p>
          Envio pelo portal aguarda função segura de mensageria. Esta tela não grava conversas nem
          eventos diretamente pelo navegador.
        </p>
      </Card>
    </div>
  );
}

function EstadoMensagens({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Mensagens</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? (
          <CircleAlert className="h-4 w-4 text-red-600" />
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        {mensagem}
      </Card>
    </div>
  );
}
