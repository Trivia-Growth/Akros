import { container } from "@/app/di";
import { useTimeline } from "@/features/comunicacao/application/hooks";
import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { Button, Card, Textarea } from "@/shared/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * E08-S02 — chat do portal: canal registrável, nunca apagável. O WhatsApp continua existindo
 * (E04-S01) — este canal existe para documento, decisão e aprovação formal.
 */
export function MensagensPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const timeline = useTimeline(cliente?.id);
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
