import { container } from "@/app/di";
import { useConversas } from "@/features/comunicacao/application/hooks";
import type { RegraAtendimentoIA } from "@/features/comunicacao/domain/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import { Bot, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function ComunicacaoPage() {
  const { t } = useTranslation("admin");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("comunicacao.title")}</h1>
        <p className="text-sm text-ink-soft">{t("comunicacao.subtitle")}</p>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">{t("comunicacao.tabInbox")}</TabsTrigger>
          <TabsTrigger value="agent">{t("comunicacao.tabAgent")}</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          <Inbox />
        </TabsContent>
        <TabsContent value="agent">
          <AgentConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Inbox() {
  const { t } = useTranslation("admin");
  const conversas = useConversas();
  const [selecionadaId, setSelecionadaId] = useState<string | null>(conversas[0]?.id ?? null);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  const selecionada = conversas.find((c) => c.id === selecionadaId);

  async function handleEnviar() {
    if (!mensagem.trim() || !selecionadaId || enviando) return;
    setEnviando(true);
    try {
      await container.conversas.enviarMensagem(selecionadaId, mensagem.trim());
      setMensagem("");
    } finally {
      setEnviando(false);
    }
  }

  if (conversas.length === 0) {
    return <p className="text-sm text-ink-muted">{t("comunicacao.noConversations")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      <div className="flex flex-col gap-2">
        {conversas.map((c) => {
          const naoLidas = c.mensagens.filter((m) => !m.lida && m.autor === "cliente").length;
          const ultima = c.mensagens[c.mensagens.length - 1];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelecionadaId(c.id)}
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors",
                selecionadaId === c.id
                  ? "border-navy bg-navy-50"
                  : "border-border bg-white hover:bg-cream-200",
              )}
            >
              <Avatar name={c.clienteNome} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-navy">{c.clienteNome}</p>
                  {naoLidas > 0 && <Badge variant="gold">{naoLidas}</Badge>}
                </div>
                <p className="truncate text-xs text-ink-muted">{ultima?.texto}</p>
                {c.atendidoPorIA && (
                  <Badge variant="navy" className="mt-1">
                    <Bot className="h-3 w-3" aria-hidden />
                    {t("comunicacao.handledByAI")}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Card className="flex flex-col">
        {!selecionada ? (
          <p className="text-sm text-ink-muted">{t("comunicacao.selectConversation")}</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2">
                {selecionada.mensagens.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[75%] rounded-md px-3 py-2 text-sm",
                      m.autor === "cliente"
                        ? "self-start bg-cream-200 text-ink"
                        : m.autor === "agente_ia"
                          ? "self-end bg-gold-50 text-navy"
                          : "self-end bg-navy-50 text-navy",
                    )}
                  >
                    {m.texto}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-border pt-4">
              <Input
                placeholder={t("comunicacao.typeMessage")}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEnviar()}
                className="flex-1"
              />
              <Button
                onClick={handleEnviar}
                loading={enviando}
                disabled={enviando || !mensagem.trim()}
              >
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function AgentConfig() {
  const { t } = useTranslation("admin");
  const [config, setConfig] = useState<RegraAtendimentoIA | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<{ resposta: string; handoff: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    container.agenteIA.obterConfig().then(setConfig);
  }, []);

  if (!config) return null;

  async function handleSave() {
    if (saving || !config) return;
    setSaving(true);
    try {
      await container.agenteIA.atualizarConfig(config);
      toast.success(t("comunicacao.configSaved"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!pergunta.trim()) return;
    const r = await container.agenteIA.simularResposta(pergunta.trim());
    setResposta(r);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="flex flex-col gap-4">
        <Checkbox
          label={t("comunicacao.agentActive")}
          checked={config.ativo}
          onChange={(e) => setConfig({ ...config, ativo: e.target.checked })}
        />
        <Input
          label={t("comunicacao.agentName")}
          value={config.nomeAgente}
          onChange={(e) => setConfig({ ...config, nomeAgente: e.target.value })}
        />
        <Textarea
          label={t("comunicacao.greeting")}
          value={config.saudacao}
          onChange={(e) => setConfig({ ...config, saudacao: e.target.value })}
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">{t("comunicacao.activeWindows")}</p>
          {config.janelasAtendimento.map((janela) => (
            <p key={`${janela.inicio}-${janela.fim}`} className="text-sm text-ink-soft">
              {t("comunicacao.windowFrom")} {janela.inicio} {t("comunicacao.windowTo")} {janela.fim}
            </p>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">{t("comunicacao.topics")}</p>
          <ul className="list-inside list-disc text-sm text-ink-soft">
            {config.topicos.map((topico) => (
              <li key={topico.pergunta}>{topico.pergunta}</li>
            ))}
          </ul>
        </div>
        <Textarea
          label={t("comunicacao.handoffMessage")}
          value={config.mensagemHandoff}
          onChange={(e) => setConfig({ ...config, mensagemHandoff: e.target.value })}
        />
        <Button onClick={handleSave} loading={saving} disabled={saving} className="self-start">
          {t("comunicacao.saveConfig")}
        </Button>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("comunicacao.testAgent")}
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder={t("comunicacao.testPlaceholder")}
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTest()}
            className="flex-1"
          />
          <Button variant="secondary" onClick={handleTest} disabled={!pergunta.trim()}>
            {t("comunicacao.testSend")}
          </Button>
        </div>
        {resposta && (
          <div className="rounded-md bg-cream-200 p-3 text-sm text-ink-soft">
            {resposta.resposta}
            {resposta.handoff && (
              <Badge variant="warning" className="ml-2">
                {t("comunicacao.handoffBadge")}
              </Badge>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
