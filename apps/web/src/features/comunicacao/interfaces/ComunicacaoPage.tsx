import { container } from "@/app/di";
import { useConversas } from "@/features/comunicacao/application/hooks";
import type { RegraAtendimentoIA } from "@/features/comunicacao/domain/types";
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
  Instagram,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
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
          <TabsTrigger value="knowledge">Base de conhecimento</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          <Inbox />
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
  const contasAgenda = useMockDb((state) => state.contasAgenda);
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
              hint="Prompt de instruções: tom de voz, limites, como conduzir a conversa — e quando consultar cada base de conhecimento selecionada abaixo."
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
  const salvarBaseConhecimento = useMockDb((state) => state.salvarBaseConhecimento);
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
    salvarBaseConhecimento({ nome: nome.trim(), tipo, status, itens: Number(itens) || 0 });
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
