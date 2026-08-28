import { container } from "@/app/di";
import { useTimeline } from "@/features/comunicacao/application/hooks";
import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { Button, Card, Textarea } from "@/shared/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * E08-S02 — chat do portal: canal registrável, nunca apagável. O WhatsApp/e-mail continuam
 * existindo (E04-S01/E04-S12) mas não aparecem aqui — o cliente já sabe o que escreveu por lá;
 * este histórico é só o chat do portal (E08-S02) e os eventos de sistema (fase liberada,
 * documento analisado, pagamento confirmado…), nunca a mensageria externa (E04-S16).
 */
export function MensagensPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const timelineCompleta = useTimeline(cliente?.id);
  const timeline = useMemo(
    () =>
      timelineCompleta.filter((evento) => evento.canal !== "whatsapp" && evento.canal !== "email"),
    [timelineCompleta],
  );
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleEnviar() {
    if (!mensagem.trim() || !cliente || enviando) return;
    setEnviando(true);
    try {
      await container.timeline.registrar({
        clienteOuLeadId: cliente.id,
        canal: "chat_portal",
        direcao: "entrada",
        autor: cliente.nome,
        conteudo: mensagem.trim(),
        ocorridoEm: new Date().toISOString(),
      });
      setMensagem("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("messages.title")}</h1>
        <p className="text-sm text-ink-soft">{t("messages.subtitle")}</p>
        <p className="mt-2 text-xs italic text-ink-muted">{t("messages.notDeletableNotice")}</p>
      </div>

      <Card>
        <p className="mb-3 text-xs text-ink-muted">
          {t("messages.caseManager")}: <strong className="text-navy">{cliente?.caseManager}</strong>
        </p>
        <Timeline eventos={timeline} emptyLabel={t("messages.empty")} />
      </Card>

      <Card className="flex flex-col gap-3">
        <Textarea
          placeholder={t("messages.placeholder")}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={3}
        />
        <Button
          className="self-end"
          onClick={handleEnviar}
          loading={enviando}
          disabled={enviando || !mensagem.trim()}
        >
          {t("messages.send")}
        </Button>
      </Card>
    </div>
  );
}
