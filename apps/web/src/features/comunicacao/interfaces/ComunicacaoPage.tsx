import { container } from "@/app/di";
import { useConversas, useEmailThreads } from "@/features/comunicacao/application/hooks";
import type {
  EmailThread,
  Mensagem,
  RegraAtendimentoIA,
} from "@/features/comunicacao/domain/types";
import type { CanalComunicacao } from "@/features/comunicacao/domain/types";
import type { ProvedorCanal } from "@/features/configuracoes/domain/types";
import { useMockDb } from "@/mocks/store";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import {
  AlertTriangle,
  BookOpenCheck,
  Bot,
  Brain,
  CalendarClock,
  Clock,
  Cpu,
  FileText,
  Image as ImageIcon,
  Instagram,
  Mail,
  MessageCircle,
  Mic,
  Paperclip,
  Pause,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Square,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function formatarCustoIA(valor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(valor);
}

const CANAL_ICON: Record<CanalComunicacao, typeof MessageCircle> = {
  whatsapp_oficial: MessageCircle,
  evolution: MessageCircle,
  instagram: Instagram,
};

const CANAL_I18N_KEY: Record<CanalComunicacao, string> = {
  whatsapp_oficial: "comunicacao.channelOfficial",
  evolution: "comunicacao.channelEvolution",
  instagram: "comunicacao.channelInstagram",
};

const PROVEDOR_CANAL_ICON: Record<ProvedorCanal, typeof MessageCircle> = {
  whatsapp_oficial: MessageCircle,
  evolution: MessageCircle,
  instagram: Instagram,
};

/** Catálogo de modelos disponíveis via OpenRouter — BYOK por agente (não compartilhado). */
const MODELOS_OPENROUTER = [
  { slug: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5 (Anthropic)" },
  { slug: "openai/gpt-5", label: "GPT-5 (OpenAI)" },
  { slug: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Google)" },
  { slug: "meta-llama/llama-4-scout", label: "Llama 4 Scout (Meta)" },
  { slug: "deepseek/deepseek-v3", label: "DeepSeek V3" },
];

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
          <TabsTrigger value="email">E-mail</TabsTrigger>
          <TabsTrigger value="agent">{t("comunicacao.tabAgent")}</TabsTrigger>
          <TabsTrigger value="knowledge">Base de conhecimento</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          <Inbox />
        </TabsContent>
        <TabsContent value="email">
          <EmailInbox />
        </TabsContent>
        <TabsContent value="agent">
          <AgentConfig />
        </TabsContent>
        <TabsContent value="knowledge">
          <KnowledgeBaseCatalog />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const EMOJIS = [
  "😀",
  "😂",
  "😊",
  "🙂",
  "😉",
  "😍",
  "🤔",
  "😅",
  "😢",
  "😮",
  "🙏",
  "👍",
  "👎",
  "👏",
  "🙌",
  "💪",
  "❤️",
  "🎉",
  "✅",
  "📌",
  "📎",
  "📄",
  "📅",
  "⏰",
  "🔥",
  "✨",
  "😴",
  "🤝",
  "👋",
  "😬",
];

function formatarDuracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${seg.toString().padStart(2, "0")}`;
}

export function MensagemBubble({
  mensagem,
  conversaId,
  lado,
}: {
  mensagem: Mensagem;
  conversaId: string;
  lado: "esquerda" | "direita";
}) {
  const balaoClass = cn(
    "max-w-[75%] rounded-md px-3 py-2 text-sm",
    lado === "esquerda" ? "self-start bg-cream-200 text-ink" : "self-end bg-gold-50 text-navy",
  );

  if (mensagem.tipo === "imagem") {
    return (
      <div className={balaoClass}>
        <div className="flex h-32 w-48 items-center justify-center rounded-md border border-border bg-white/70">
          <ImageIcon className="h-8 w-8 text-ink-muted" aria-hidden />
        </div>
        <p className="mt-1.5 truncate text-xs text-ink-muted">{mensagem.midiaNome}</p>
      </div>
    );
  }

  if (mensagem.tipo === "audio") {
    return (
      <div className={balaoClass}>
        <AudioBubblePlayer mensagem={mensagem} conversaId={conversaId} />
      </div>
    );
  }

  if (mensagem.tipo === "arquivo") {
    return (
      <div className={cn(balaoClass, "flex items-center gap-2")}>
        <FileText className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{mensagem.midiaNome}</span>
      </div>
    );
  }

  return <div className={balaoClass}>{mensagem.texto}</div>;
}

function AudioBubblePlayer({
  mensagem,
  conversaId,
}: {
  mensagem: Mensagem;
  conversaId: string;
}) {
  const whisperAtivo = useMockDb(
    (state) => state.integracoes.find((i) => i.id === "whisper")?.ativa ?? false,
  );
  const [tocando, setTocando] = useState(false);
  const duracao = mensagem.duracaoSegundos ?? 0;

  function alternarPlay() {
    setTocando((atual) => {
      const proximo = !atual;
      if (proximo) {
        setTimeout(() => setTocando(false), Math.min(duracao, 8) * 1000);
      }
      return proximo;
    });
  }

  return (
    <div className="flex min-w-[13rem] flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={alternarPlay}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-white"
          aria-label={tocando ? "Pausar áudio" : "Reproduzir áudio"}
        >
          {tocando ? (
            <Pause className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <div className="flex flex-1 items-center gap-[3px]" aria-hidden>
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={`${mensagem.id}-bar-${i}`}
              className={cn(
                "w-[3px] rounded-full bg-navy-300 transition-all",
                tocando && "animate-pulse bg-navy",
              )}
              style={{ height: `${8 + ((i * 7) % 16)}px` }}
            />
          ))}
        </div>
        <span className="shrink-0 text-xs text-ink-muted">{formatarDuracao(duracao)}</span>
      </div>
      {mensagem.transcricao ? (
        <p className="rounded-md bg-white/70 px-2.5 py-2 text-xs text-ink-soft">
          {mensagem.transcricao}
        </p>
      ) : whisperAtivo ? (
        <button
          type="button"
          onClick={() => container.conversas.transcreverMensagem(conversaId, mensagem.id)}
          className="self-start text-xs font-medium text-gold-700 hover:text-gold-800"
        >
          Transcrever áudio
        </button>
      ) : (
        <Link
          to="/admin/configuracoes"
          className="self-start text-xs font-medium text-ink-muted underline hover:text-gold-700"
        >
          Configure o Whisper para transcrever →
        </Link>
      )}
    </div>
  );
}

function Inbox() {
  const { t } = useTranslation("admin");
  const conversas = useConversas();
  const [selecionadaId, setSelecionadaId] = useState<string | null>(conversas[0]?.id ?? null);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [segundosGravando, setSegundosGravando] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selecionada = conversas.find((c) => c.id === selecionadaId);

  async function handleEnviar() {
    if (!mensagem.trim() || !selecionadaId || enviando) return;
    setEnviando(true);
    try {
      await container.conversas.enviarMensagem(selecionadaId, mensagem.trim());
      setMensagem("");
      setEmojiAberto(false);
    } finally {
      setEnviando(false);
    }
  }

  function handleAnexar(file: File | undefined) {
    if (!file || !selecionadaId) return;
    const tipo = file.type.startsWith("image/")
      ? ("imagem" as const)
      : file.type.startsWith("audio/")
        ? ("audio" as const)
        : ("arquivo" as const);
    container.conversas.enviarMensagemRica(selecionadaId, { tipo, midiaNome: file.name });
    toast.success("Anexo enviado no ambiente de demonstração.");
  }

  function alternarGravacao() {
    if (!selecionadaId) return;
    if (!gravando) {
      setGravando(true);
      setSegundosGravando(0);
      return;
    }
    setGravando(false);
    container.conversas.enviarMensagemRica(selecionadaId, {
      tipo: "audio",
      midiaNome: `audio-gravado-${Date.now()}.m4a`,
      duracaoSegundos: Math.max(segundosGravando, 1),
    });
  }

  useEffect(() => {
    if (!gravando) return;
    const intervalo = setInterval(() => setSegundosGravando((s) => s + 1), 1000);
    return () => clearInterval(intervalo);
  }, [gravando]);

  if (conversas.length === 0) {
    return <p className="text-sm text-ink-muted">{t("comunicacao.noConversations")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      <div className="flex flex-col gap-2">
        {conversas.map((c) => {
          const naoLidas = c.mensagens.filter((m) => !m.lida && m.autor === "cliente").length;
          const ultima = c.mensagens[c.mensagens.length - 1];
          const CanalIcon = CANAL_ICON[c.canal];
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
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                  <CanalIcon className="h-3 w-3" aria-hidden />
                  {t(CANAL_I18N_KEY[c.canal])}
                </p>
                {c.atendidoPorIA && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge variant="navy">
                      <Bot className="h-3 w-3" aria-hidden />
                      {t("comunicacao.handledByAI")}
                    </Badge>
                    {c.custoIA !== undefined && (
                      <Badge variant="gold">
                        {t("comunicacao.aiCost", { valor: formatarCustoIA(c.custoIA) })}
                      </Badge>
                    )}
                  </div>
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
            {selecionada.atendidoPorIA && selecionada.custoIA !== undefined && (
              <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                <p className="text-sm font-medium text-navy">{selecionada.clienteNome}</p>
                <Badge variant="gold">
                  {t("comunicacao.aiCost", { valor: formatarCustoIA(selecionada.custoIA) })}
                </Badge>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2">
                {selecionada.mensagens.map((m) => (
                  <MensagemBubble
                    key={m.id}
                    mensagem={m}
                    conversaId={selecionada.id}
                    lado={m.autor === "cliente" ? "esquerda" : "direita"}
                  />
                ))}
              </div>
            </div>

            {gravando && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />
                Gravando áudio… {formatarDuracao(segundosGravando)}
              </div>
            )}

            <div className="relative mt-4 flex items-center gap-1.5 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setEmojiAberto((v) => !v)}
                className="rounded-md p-2 text-ink-muted transition hover:bg-cream-200 hover:text-navy"
                aria-label="Emojis"
              >
                <Smile className="h-4 w-4" aria-hidden />
              </button>
              {emojiAberto && (
                <div className="absolute bottom-full left-0 mb-2 grid w-64 grid-cols-8 gap-1 rounded-lg border border-border bg-white p-2 shadow-elevated">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="rounded p-1 text-lg hover:bg-cream-200"
                      onClick={() => setMensagem((atual) => atual + emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md p-2 text-ink-muted transition hover:bg-cream-200 hover:text-navy"
                aria-label="Anexar arquivo"
              >
                <Paperclip className="h-4 w-4" aria-hidden />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  handleAnexar(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={alternarGravacao}
                className={cn(
                  "rounded-md p-2 transition",
                  gravando
                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                    : "text-ink-muted hover:bg-cream-200 hover:text-navy",
                )}
                aria-label={gravando ? "Parar gravação" : "Gravar áudio"}
              >
                {gravando ? (
                  <Square className="h-4 w-4" aria-hidden />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden />
                )}
              </button>
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

function EmailInbox() {
  const threads = useEmailThreads();
  const contas = useMockDb((state) => state.contasAgenda);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(threads[0]?.id ?? null);
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);

  const contasEmail = contas.filter((conta) => conta.escopos.includes("email"));
  const selecionada = threads.find((thread) => thread.id === selecionadaId);

  function selecionar(threadId: string) {
    setSelecionadaId(threadId);
    container.email.marcarComoLido(threadId);
  }

  async function handleResponder() {
    if (!resposta.trim() || !selecionadaId || enviando) return;
    setEnviando(true);
    try {
      await container.email.responder(selecionadaId, resposta.trim());
      setResposta("");
    } finally {
      setEnviando(false);
    }
  }

  if (contasEmail.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Nenhuma conta com escopo de e-mail conectada ainda.{" "}
        <Link to="/admin/configuracoes" className="font-medium text-gold-700 underline">
          Conectar em Configurações →
        </Link>
      </p>
    );
  }

  if (threads.length === 0) {
    return <p className="text-sm text-ink-muted">Nenhum e-mail recebido ainda.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-2">
        {threads.map((thread) => {
          const conta = contas.find((item) => item.id === thread.contaEmailId);
          const naoLidas = thread.mensagens.filter(
            (m) => m.direcao === "entrada" && !m.lida,
          ).length;
          const ultima = thread.mensagens[thread.mensagens.length - 1];
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => selecionar(thread.id)}
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors",
                selecionadaId === thread.id
                  ? "border-navy bg-navy-50"
                  : "border-border bg-white hover:bg-cream-200",
              )}
            >
              <Avatar name={thread.clienteNome ?? ultima?.deNome ?? ultima?.de ?? "?"} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-navy">{thread.assunto}</p>
                  {naoLidas > 0 && <Badge variant="gold">{naoLidas}</Badge>}
                </div>
                <p className="truncate text-xs text-ink-muted">
                  {ultima?.deNome ?? ultima?.de}: {ultima?.corpo}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                    <Mail className="h-3 w-3" aria-hidden />
                    {conta?.nomeExibicao ?? "Conta desconectada"}
                  </span>
                  {thread.clienteNome ? (
                    <Badge variant="navy">
                      <UserRound className="h-3 w-3" aria-hidden />
                      {thread.clienteNome}
                    </Badge>
                  ) : (
                    <Badge variant="warning">Sem cliente vinculado</Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="flex flex-col p-0">
        {!selecionada ? (
          <p className="p-5 text-sm text-ink-muted">Selecione um e-mail para ler.</p>
        ) : (
          <EmailThreadPane
            thread={selecionada}
            contaNome={contas.find((c) => c.id === selecionada.contaEmailId)?.nomeExibicao}
            resposta={resposta}
            onRespostaChange={setResposta}
            onResponder={handleResponder}
            enviando={enviando}
          />
        )}
      </Card>
    </div>
  );
}

export function EmailThreadPane({
  thread,
  contaNome,
  resposta,
  onRespostaChange,
  onResponder,
  enviando,
}: {
  thread: EmailThread;
  contaNome: string | undefined;
  resposta: string;
  onRespostaChange: (value: string) => void;
  onResponder: () => void;
  enviando: boolean;
}) {
  const ultimoRemetenteExterno = [...thread.mensagens]
    .reverse()
    .find((m) => m.direcao === "entrada");

  return (
    <>
      <div className="flex flex-col gap-1.5 border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold text-navy">{thread.assunto}</p>
          {thread.clienteNome ? (
            <Link
              to="/admin/clientes"
              className="whitespace-nowrap text-xs font-medium text-gold-700 hover:text-gold-800"
            >
              Ver cliente →
            </Link>
          ) : (
            <Badge variant="warning">Sem cliente vinculado</Badge>
          )}
        </div>
        <p className="text-xs text-ink-muted">Caixa: {contaNome ?? "conta desconectada"}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-3">
          {thread.mensagens.map((m) => (
            <article key={m.id} className="overflow-hidden rounded-lg border border-border">
              <header className="flex items-center justify-between gap-3 bg-cream-100 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={m.deNome ?? m.de} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy">{m.deNome ?? m.de}</p>
                    <p className="truncate text-xs text-ink-muted">{m.de}</p>
                  </div>
                </div>
                <p className="shrink-0 text-xs text-ink-muted">
                  {new Date(m.recebidoEm).toLocaleString("pt-BR")}
                </p>
              </header>
              <div className="whitespace-pre-wrap px-4 py-3 text-sm text-ink">{m.corpo}</div>
              {m.anexoNome && (
                <div className="border-t border-border px-4 py-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-cream-50 px-2 py-1 text-xs text-ink-soft">
                    <Paperclip className="h-3 w-3" aria-hidden />
                    {m.anexoNome}
                  </span>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border bg-cream-50/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span>
            Para: <span className="font-medium text-ink-soft">{ultimoRemetenteExterno?.de}</span>
          </span>
          <span>
            Assunto: <span className="font-medium text-ink-soft">Re: {thread.assunto}</span>
          </span>
        </div>
        <Textarea
          placeholder="Escrever resposta…"
          rows={3}
          value={resposta}
          onChange={(e) => onRespostaChange(e.target.value)}
        />
        <Button
          className="self-end"
          onClick={onResponder}
          loading={enviando}
          disabled={enviando || !resposta.trim()}
        >
          <Send className="h-4 w-4" aria-hidden />
          Enviar
        </Button>
      </div>
    </>
  );
}

function AgentConfig() {
  const agentes = useMockDb((state) => state.agentesIA);
  const contasAgenda = useMockDb((state) =>
    state.contasAgenda.filter((conta) => conta.escopos.includes("agenda")),
  );
  const contasCanal = useMockDb((state) => state.contasCanal);
  const basesConhecimento = useMockDb((state) => state.basesConhecimento);
  const [selecionadoId, setSelecionadoId] = useState(agentes[0]?.id ?? "");
  const selecionado = agentes.find((agente) => agente.id === selecionadoId) ?? agentes[0];
  const [config, setConfig] = useState<RegraAtendimentoIA | null>(
    selecionado ? structuredClone(selecionado) : null,
  );
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<{ resposta: string; handoff: boolean } | null>(null);
  const [novaCorrecao, setNovaCorrecao] = useState("");
  const [saving, setSaving] = useState(false);
  const [chaveLLM, setChaveLLM] = useState("");

  useEffect(() => {
    if (selecionado) setConfig(structuredClone(selecionado));
    setChaveLLM("");
  }, [selecionado]);

  if (!config) return null;

  async function handleSave() {
    if (saving || !config) return;
    setSaving(true);
    try {
      const chave = chaveLLM.trim();
      const configFinal: RegraAtendimentoIA = {
        ...config,
        llm: {
          provedor: "openrouter",
          modelo: config.llm?.modelo ?? MODELOS_OPENROUTER[0].slug,
          apiKeyConfigurada: chave ? true : (config.llm?.apiKeyConfigurada ?? false),
          apiKeyFinal: chave ? chave.slice(-4).toUpperCase() : config.llm?.apiKeyFinal,
        },
      };
      await container.agenteIA.salvarAgente(configFinal);
      setConfig(configFinal);
      setChaveLLM("");
      toast.success("Agente atualizado no ambiente de demonstração.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const agente = config;
    if (!pergunta.trim() || !agente) return;
    const topico = agente.topicos.find((item) => pergunta.toLowerCase().includes(item.pergunta));
    setResposta(
      topico
        ? { resposta: topico.resposta, handoff: false }
        : { resposta: agente.mensagemHandoff, handoff: true },
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="rounded-xl border border-border bg-white p-3 shadow-subtle">
        <div className="mb-3 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-label text-gold-700">
            Equipe de agentes
          </p>
          <p className="mt-1 text-xs text-ink-muted">Papéis e capacidades independentes</p>
        </div>
        <div className="flex flex-col gap-1">
          {agentes.map((agente) => (
            <button
              key={agente.id}
              type="button"
              onClick={() => setSelecionadoId(agente.id)}
              className={cn(
                "rounded-lg p-3 text-left transition",
                agente.id === config.id ? "bg-navy text-white" : "hover:bg-cream-100",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{agente.nomeAgente}</p>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    agente.ativo ? "bg-emerald-400" : "bg-slate-300",
                  )}
                />
              </div>
              <p
                className={cn(
                  "mt-1 text-xs",
                  agente.id === config.id ? "text-slate-300" : "text-ink-muted",
                )}
              >
                {agente.funcao}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        <section className="rounded-xl bg-navy p-5 text-white shadow-elevated">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/15 text-gold-300">
                  <Bot className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">
                  Agente configurável
                </p>
              </div>
              <h2 className="font-display text-2xl font-semibold">{config.nomeAgente}</h2>
              <p className="mt-1 text-sm text-slate-300">{config.funcao}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium">
              <input
                type="checkbox"
                checked={config.ativo}
                onChange={(event) => setConfig({ ...config, ativo: event.target.checked })}
                className="h-3.5 w-3.5 accent-gold-500"
              />
              {config.ativo ? "Ativo" : "Em rascunho"}
            </label>
          </div>
          <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
            <AgentSignal
              icon={BookOpenCheck}
              label="Base de conhecimento"
              value={`${config.baseConhecimentoIds.length} fontes`}
            />
            <AgentSignal
              icon={AlertTriangle}
              label="Correções registradas"
              value={`${config.correcoes.length}`}
            />
            <AgentSignal
              icon={Brain}
              label="Memória"
              value={config.memoria.ativa ? "Por cliente" : "Desativada"}
            />
          </div>
        </section>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-gold-700" aria-hidden />
            <h3 className="font-semibold text-navy">Modelo de IA (LLM)</h3>
          </div>
          <p className="text-xs text-ink-muted">
            Cada agente usa sua própria chave OpenRouter e escolhe o modelo — nada é compartilhado
            entre agentes (BYOK).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Modelo"
              value={config.llm?.modelo ?? MODELOS_OPENROUTER[0].slug}
              onChange={(event) =>
                setConfig({
                  ...config,
                  llm: {
                    provedor: "openrouter",
                    modelo: event.target.value,
                    apiKeyConfigurada: config.llm?.apiKeyConfigurada ?? false,
                    apiKeyFinal: config.llm?.apiKeyFinal,
                  },
                })
              }
            >
              {MODELOS_OPENROUTER.map((modelo) => (
                <option key={modelo.slug} value={modelo.slug}>
                  {modelo.label}
                </option>
              ))}
            </Select>
            <Input
              label="Chave da API (OpenRouter)"
              type="password"
              autoComplete="off"
              placeholder={
                config.llm?.apiKeyConfigurada
                  ? `Chave atual •••• ${config.llm.apiKeyFinal}`
                  : "Cole a chave OpenRouter deste agente"
              }
              value={chaveLLM}
              onChange={(event) => setChaveLLM(event.target.value)}
            />
          </div>
          {!config.llm?.apiKeyConfigurada && !chaveLLM.trim() && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Sem chave configurada, este agente só responde com a simulação mockada (tópicos) — não
              com o modelo de verdade.
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-gold-700" aria-hidden />
            <h3 className="font-semibold text-navy">Canais atendidos</h3>
          </div>
          <p className="text-xs text-ink-muted">
            Quais contas conectadas (WhatsApp/Instagram) este agente atende.
          </p>
          {contasCanal.length === 0 ? (
            <p className="rounded-lg bg-cream-100 p-3 text-sm text-ink-soft">
              Nenhuma conta de canal conectada ainda.{" "}
              <Link to="/admin/configuracoes" className="font-medium text-gold-700 underline">
                Conectar em Configurações →
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {contasCanal
                .filter((conta) => conta.ativa)
                .map((conta) => {
                  const Icon = PROVEDOR_CANAL_ICON[conta.provedor];
                  const marcado = config.contasCanalIds.includes(conta.id);
                  return (
                    <label
                      key={conta.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3"
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={(event) =>
                          setConfig({
                            ...config,
                            contasCanalIds: event.target.checked
                              ? [...config.contasCanalIds, conta.id]
                              : config.contasCanalIds.filter((id) => id !== conta.id),
                          })
                        }
                        className="h-4 w-4 accent-gold-600"
                      />
                      <Icon className="h-4 w-4 text-navy" aria-hidden />
                      <span className="text-sm text-navy">
                        {conta.nomeExibicao}{" "}
                        <span className="text-ink-muted">· {conta.identificador}</span>
                      </span>
                    </label>
                  );
                })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-gold-700" aria-hidden />
            <h3 className="font-semibold text-navy">Ferramenta de agendamento</h3>
          </div>
          <p className="text-xs text-ink-muted">
            Com a ferramenta ativa, o agente pergunta dia/período, consulta disponibilidade e marca
            a reunião direto na conversa — sem aprovação humana por reunião (ADR-0007).
          </p>
          {contasAgenda.length === 0 ? (
            <p className="rounded-lg bg-cream-100 p-3 text-sm text-ink-soft">
              Nenhuma conta de agenda conectada ainda.{" "}
              <Link to="/admin/configuracoes" className="font-medium text-gold-700 underline">
                Conectar em Configurações →
              </Link>
            </p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3.5">
                <span className="text-sm font-medium text-navy">Ativar ferramenta</span>
                <input
                  type="checkbox"
                  checked={config.ferramentaAgendamento?.ativa ?? false}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      ferramentaAgendamento: {
                        ativa: event.target.checked,
                        contasAgendaIds: config.ferramentaAgendamento?.contasAgendaIds ?? [],
                      },
                    })
                  }
                  className="h-4 w-4 accent-gold-600"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                {contasAgenda
                  .filter((conta) => conta.ativa)
                  .map((conta) => {
                    const contasSelecionadas = config.ferramentaAgendamento?.contasAgendaIds ?? [];
                    const marcado = contasSelecionadas.includes(conta.id);
                    return (
                      <label
                        key={conta.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3"
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={(event) =>
                            setConfig({
                              ...config,
                              ferramentaAgendamento: {
                                ativa: config.ferramentaAgendamento?.ativa ?? false,
                                contasAgendaIds: event.target.checked
                                  ? [...contasSelecionadas, conta.id]
                                  : contasSelecionadas.filter((id) => id !== conta.id),
                              },
                            })
                          }
                          className="h-4 w-4 accent-gold-600"
                        />
                        <span className="text-sm text-navy">{conta.nomeExibicao}</span>
                      </label>
                    );
                  })}
              </div>
            </>
          )}
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-700" aria-hidden />
              <h3 className="font-semibold text-navy">Alma e comportamento</h3>
            </div>
            <Input
              label="Nome do agente"
              value={config.nomeAgente}
              onChange={(event) => setConfig({ ...config, nomeAgente: event.target.value })}
            />
            <Textarea
              label="Alma do agente"
              rows={8}
              value={config.alma}
              onChange={(event) => setConfig({ ...config, alma: event.target.value })}
              hint="Prompt de instruções: tom de voz, limites, como conduzir a conversa e quando consultar cada base de conhecimento selecionada abaixo."
            />
            <Textarea
              label="Mensagem de handoff"
              rows={2}
              value={config.mensagemHandoff}
              onChange={(event) => setConfig({ ...config, mensagemHandoff: event.target.value })}
            />
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="h-4 w-4 text-gold-700" aria-hidden />
                <h3 className="font-semibold text-navy">Base de conhecimento</h3>
              </div>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Fontes do catálogo geral que este agente pode consultar. Cadastre novas fontes na aba
              "Base de conhecimento" acima.
            </p>
            {basesConhecimento.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">Nenhuma fonte cadastrada ainda.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {basesConhecimento.map((fonte) => {
                  const marcado = config.baseConhecimentoIds.includes(fonte.id);
                  return (
                    <label
                      key={fonte.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-navy">{fonte.nome}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {fonte.tipo} · {fonte.itens} itens
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={fonte.status === "pronta" ? "success" : "warning"}>
                          {fonte.status === "pronta" ? "Pronta" : "Indexando"}
                        </Badge>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={(event) =>
                            setConfig({
                              ...config,
                              baseConhecimentoIds: event.target.checked
                                ? [...config.baseConhecimentoIds, fonte.id]
                                : config.baseConhecimentoIds.filter((id) => id !== fonte.id),
                            })
                          }
                          className="h-4 w-4 accent-gold-600"
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gold-700" aria-hidden />
              <h3 className="font-semibold text-navy">Correções</h3>
            </div>
            <p className="text-xs text-ink-muted">
              Registre explicitamente algo que o agente fez e não deve repetir.
            </p>
            <div className="flex flex-col gap-2">
              {config.correcoes.length === 0 ? (
                <p className="text-sm text-ink-soft">Nenhuma correção registrada ainda.</p>
              ) : (
                config.correcoes.map((correcao) => (
                  <div key={correcao.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm text-navy">{correcao.texto}</p>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      {new Date(correcao.registradoEm).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ex.: Não prometer prazo exato de aprovação"
                value={novaCorrecao}
                onChange={(event) => setNovaCorrecao(event.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!novaCorrecao.trim()}
                onClick={() => {
                  setConfig({
                    ...config,
                    correcoes: [
                      ...config.correcoes,
                      {
                        id: crypto.randomUUID(),
                        texto: novaCorrecao.trim(),
                        registradoEm: new Date().toISOString(),
                      },
                    ],
                  });
                  setNovaCorrecao("");
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Adicionar
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gold-700" aria-hidden />
              <h3 className="font-semibold text-navy">Horários de atendimento</h3>
            </div>
            <p className="text-xs text-ink-muted">Janelas em que o agente responde.</p>
            <div className="flex flex-col gap-2">
              {config.janelasAtendimento.map((janela, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: janelas não têm id próprio no domínio; lista curta, sem reordenação
                <div key={`janela-${index}`} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={janela.inicio}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        janelasAtendimento: config.janelasAtendimento.map((item, i) =>
                          i === index ? { ...item, inicio: event.target.value } : item,
                        ),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="text-sm text-ink-muted">até</span>
                  <Input
                    type="time"
                    value={janela.fim}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        janelasAtendimento: config.janelasAtendimento.map((item, i) =>
                          i === index ? { ...item, fim: event.target.value } : item,
                        ),
                      })
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={config.janelasAtendimento.length === 1}
                    onClick={() =>
                      setConfig({
                        ...config,
                        janelasAtendimento: config.janelasAtendimento.filter((_, i) => i !== index),
                      })
                    }
                    aria-label="Remover janela"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setConfig({
                  ...config,
                  janelasAtendimento: [
                    ...config.janelasAtendimento,
                    { inicio: "09:00", fim: "18:00" },
                  ],
                })
              }
            >
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar janela
            </Button>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-navy">
                <Brain className="h-4 w-4 text-gold-700" aria-hidden />
                Memória {config.memoria.escopo === "por_cliente" ? "por cliente" : "por conversa"}
              </span>
              <input
                type="checkbox"
                checked={config.memoria.ativa}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    memoria: { ...config.memoria, ativa: event.target.checked },
                  })
                }
                className="h-4 w-4 accent-gold-600"
              />
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Retenção: {config.memoria.retencao}. Campos: {config.memoria.campos.join(", ")}.
            </p>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-gold-700" aria-hidden />
              <h3 className="font-semibold text-navy">Simular conversa</h3>
            </div>
            <p className="text-xs text-ink-muted">
              A simulação usa a base de tópicos mockada do agente selecionado.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Ex.: Quanto custa o processo?"
                value={pergunta}
                onChange={(event) => setPergunta(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleTest()}
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleTest} disabled={!pergunta.trim()}>
                Testar
              </Button>
            </div>
            {resposta && (
              <div className="rounded-lg bg-cream-100 p-3 text-sm text-ink-soft">
                {resposta.resposta}
                {resposta.handoff && (
                  <Badge variant="warning" className="ml-2">
                    Handoff
                  </Badge>
                )}
              </div>
            )}
          </Card>
          <Card className="flex flex-col justify-between gap-4 border-gold-200 bg-gold-50/40">
            <div>
              <ShieldCheck className="h-5 w-5 text-gold-700" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-navy">Guardrails visíveis</p>
              <p className="mt-1 text-xs text-ink-soft">
                Correções registradas ficam explícitas no prompt do agente. Memória e canais
                atendidos ficam separados por papel.
              </p>
            </div>
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              Salvar agente
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AgentSignal({
  icon: Icon,
  label,
  value,
}: { icon: typeof Brain; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-gold-300" aria-hidden />
      <div>
        <p className="text-sm font-medium text-white">{value}</p>
        <p className="text-[11px] text-slate-400">{label}</p>
      </div>
    </div>
  );
}

const TIPO_FONTE_LABEL = {
  documento: "Documento",
  url: "URL",
  faq: "FAQ",
  base_interna: "Base interna",
} as const;

function KnowledgeBaseCatalog() {
  const basesConhecimento = useMockDb((state) => state.basesConhecimento);
  const agentes = useMockDb((state) => state.agentesIA);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<keyof typeof TIPO_FONTE_LABEL>("documento");
  const [status, setStatus] = useState<"pronta" | "indexando">("pronta");
  const [itens, setItens] = useState("");

  function agentesQueUsam(fonteId: string): string {
    const nomes = agentes
      .filter((agente) => agente.baseConhecimentoIds.includes(fonteId))
      .map((agente) => agente.nomeAgente);
    return nomes.length > 0 ? nomes.join(", ") : "Nenhum agente ainda";
  }

  function adicionar() {
    if (!nome.trim()) return;
    container.baseConhecimento.salvar({
      nome: nome.trim(),
      tipo,
      status,
      itens: Number(itens) || 0,
    });
    toast.success("Fonte adicionada ao catálogo.");
    setNome("");
    setItens("");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <Card>
        <h3 className="font-semibold text-navy">Catálogo de fontes</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Cadastradas aqui uma vez, disponíveis pra qualquer agente selecionar.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {basesConhecimento.length === 0 ? (
            <p className="text-sm text-ink-soft">Nenhuma fonte cadastrada ainda.</p>
          ) : (
            basesConhecimento.map((fonte) => (
              <div
                key={fonte.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-navy">{fonte.nome}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {TIPO_FONTE_LABEL[fonte.tipo]} · {fonte.itens} itens · usada por:{" "}
                    {agentesQueUsam(fonte.id)}
                  </p>
                </div>
                <Badge variant={fonte.status === "pronta" ? "success" : "warning"}>
                  {fonte.status === "pronta" ? "Pronta" : "Indexando"}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="font-semibold text-navy">Adicionar fonte</h3>
        <Input label="Nome" value={nome} onChange={(event) => setNome(event.target.value)} />
        <Select
          label="Tipo"
          value={tipo}
          onChange={(event) => setTipo(event.target.value as keyof typeof TIPO_FONTE_LABEL)}
        >
          {Object.entries(TIPO_FONTE_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as "pronta" | "indexando")}
        >
          <option value="pronta">Pronta</option>
          <option value="indexando">Indexando</option>
        </Select>
        <Input
          type="number"
          label="Itens"
          value={itens}
          onChange={(event) => setItens(event.target.value)}
        />
        <Button onClick={adicionar} disabled={!nome.trim()}>
          <Plus className="h-4 w-4" aria-hidden />
          Adicionar fonte
        </Button>
      </Card>
    </div>
  );
}
