import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import { usePerfilClienteSupabase } from "@/features/crm/application/usePerfilClienteSupabase";
import { Button, Card, Textarea } from "@/shared/ui";
import { CircleAlert, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useComunicacaoClienteReal } from "../application/real-hooks";
import { useChatPortal } from "../application/useChatPortal";

/** Portal real (E08-S05): chat do portal real, envio via `comunicacao-chat-portal`. Layout já é
 *  mobile-first (flex-col, sem largura fixa) — usável no celular por herança do design system. */
export function MensagensRealPage() {
  const { t } = useTranslation("portal");
  const { eventos, carregando, erro, refetch } = useComunicacaoClienteReal();
  const perfil = usePerfilClienteSupabase();
  const { enviar, enviando, erro: erroEnvio } = useChatPortal();
  const [texto, setTexto] = useState("");
  const timeline = useMemo(
    () => eventos.filter((evento) => evento.canal !== "whatsapp" && evento.canal !== "email"),
    [eventos],
  );

  if (carregando) return <EstadoMensagens mensagem="Carregando mensagens reais…" />;
  if (erro) return <EstadoMensagens mensagem="Não foi possível carregar mensagens." erro />;

  async function handleEnviar() {
    if (!perfil.cliente) return;
    const ok = await enviar(perfil.cliente.id, texto);
    if (ok) {
      setTexto("");
      void refetch();
    }
  }

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

      <Card className="flex flex-col gap-2">
        <Textarea
          placeholder="Escreva uma mensagem para a equipe Akros…"
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {erroEnvio && (
          <p className="text-xs text-red-700">Não foi possível enviar. Tente de novo.</p>
        )}
        <Button
          size="sm"
          variant="gold"
          className="self-end"
          onClick={() => void handleEnviar()}
          loading={enviando}
          disabled={enviando || !texto.trim() || !perfil.cliente}
        >
          Enviar
        </Button>
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
