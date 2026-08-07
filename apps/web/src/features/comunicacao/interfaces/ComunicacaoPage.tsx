import { container } from "@/app/di";
import { useConversas } from "@/features/comunicacao/application/hooks";
import type { RegraAtendimentoIA } from "@/features/comunicacao/domain/types";
import { useMockDb } from "@/mocks/store";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import {
  BookOpenCheck,
  Bot,
  Brain,
  DatabaseZap,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
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
  const agentes = useMockDb((state) => state.agentesIA);
  const salvarAgenteIA = useMockDb((state) => state.salvarAgenteIA);
  const [selecionadoId, setSelecionadoId] = useState(agentes[0]?.id ?? "");
  const selecionado = agentes.find((agente) => agente.id === selecionadoId) ?? agentes[0];
  const [config, setConfig] = useState<RegraAtendimentoIA | null>(
    selecionado ? structuredClone(selecionado) : null,
  );
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<{ resposta: string; handoff: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selecionado) setConfig(structuredClone(selecionado));
  }, [selecionado]);

  if (!config) return null;

  async function handleSave() {
    if (saving || !config) return;
    setSaving(true);
    try {
      salvarAgenteIA(config);
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
              value={`${config.baseConhecimento.length} fontes`}
            />
            <AgentSignal
              icon={Wrench}
              label="Skills ativas"
              value={`${config.skills.filter((skill) => skill.ativa).length} de ${config.skills.length}`}
            />
            <AgentSignal
              icon={Brain}
              label="Memória"
              value={config.memoria.ativa ? "Por cliente" : "Desativada"}
            />
          </div>
        </section>

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
              rows={5}
              value={config.alma}
              onChange={(event) => setConfig({ ...config, alma: event.target.value })}
              hint="Define tom de voz, limites e como o agente deve conduzir a conversa."
            />
            <Textarea
              label="Mensagem de handoff"
              rows={2}
              value={config.mensagemHandoff}
              onChange={(event) => setConfig({ ...config, mensagemHandoff: event.target.value })}
            />
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4 text-gold-700" aria-hidden />
              <h3 className="font-semibold text-navy">Base de conhecimento</h3>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Fontes indexadas que o agente pode consultar antes de responder.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {config.baseConhecimento.map((fonte) => (
                <div
                  key={fonte.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">{fonte.nome}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {fonte.tipo} · {fonte.itens} itens
                    </p>
                  </div>
                  <Badge variant={fonte.status === "pronta" ? "success" : "warning"}>
                    {fonte.status === "pronta" ? "Pronta" : "Indexando"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gold-700" aria-hidden />
              <h3 className="font-semibold text-navy">Skills</h3>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Ações especializadas liberadas para este papel.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {config.skills.map((skill) => (
                <label
                  key={skill.id}
                  className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">{skill.nome}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{skill.descricao}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={skill.ativa}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        skills: config.skills.map((item) =>
                          item.id === skill.id ? { ...item, ativa: event.target.checked } : item,
                        ),
                      })
                    }
                    className="mt-1 h-4 w-4 accent-gold-600"
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-4 w-4 text-gold-700" aria-hidden />
              <h3 className="font-semibold text-navy">MCPs e memória</h3>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Conectores autorizados e contexto que pode persistir entre conversas.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {config.mcps.map((mcp) => (
                <label
                  key={mcp.id}
                  className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {mcp.nome}{" "}
                      <span className="font-normal text-ink-muted">
                        · {mcp.permissao === "leitura" ? "somente leitura" : "leitura e escrita"}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{mcp.descricao}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={mcp.ativo}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        mcps: config.mcps.map((item) =>
                          item.id === mcp.id ? { ...item, ativo: event.target.checked } : item,
                        ),
                      })
                    }
                    className="mt-1 h-4 w-4 accent-gold-600"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-navy-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-navy">
                  <Brain className="h-4 w-4" aria-hidden />
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
              <p className="mt-1 text-xs text-ink-soft">
                Retenção: {config.memoria.retencao}. Campos: {config.memoria.campos.join(", ")}.
              </p>
            </div>
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
                Cada acesso MCP é concedido por agente. Memória e fontes ficam separadas por papel.
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
