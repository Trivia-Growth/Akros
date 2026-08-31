import { container } from "@/app/di";
import { useReunioesCliente } from "@/features/agenda/application/hooks";
import {
  useConversaCliente,
  useEmailThreads,
  useTimeline,
} from "@/features/comunicacao/application/hooks";
import type { EmailThread } from "@/features/comunicacao/domain/types";
import { EmailThreadPane, MensagemBubble } from "@/features/comunicacao/interfaces/ComunicacaoPage";
import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import { useClienteReal } from "@/features/crm/application/hooks";
import {
  useCaminhoArquivoDrive,
  useContaArquivosAtiva,
  useDocumentosCliente,
} from "@/features/documentos/application/hooks";
import type { Documento } from "@/features/documentos/domain/types";
import { aprovarEtapa, devolverEtapaParaAjuste } from "@/features/jornada/application/hooks";
import { usePagamentosCliente } from "@/features/pagamentos/application/hooks";
import type { Pagamento, PagamentoTipo } from "@/features/pagamentos/domain/types";
import { useMockDb } from "@/mocks/store";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Stepper,
  type StepperItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@/shared/ui";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  Mail,
  MessageCircle,
  Plus,
  Send,
  Undo2,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { EstadoCivil, ParentescoFamiliar, PerfilImigratorio } from "../domain/types";

const SAUDE_VARIANT = {
  em_dia: "success",
  atencao: "warning",
  atrasado: "danger",
} as const;

const DOC_STATUS_VARIANT = {
  pendente: "neutral",
  enviado: "navy",
  em_analise: "gold",
  aprovado: "success",
  ajustes: "warning",
} as const;

const PAG_STATUS_VARIANT = {
  pendente: "gold",
  em_conferencia: "navy",
  pago: "success",
  divergente: "danger",
  atrasado: "danger",
} as const;

interface Props {
  clienteId: string;
  onBack: () => void;
}

export function Cliente360({ clienteId, onBack }: Props) {
  const { t } = useTranslation("admin");
  const { cliente } = useClienteReal(clienteId);
  const jornada = useMockDb((s) => s.jornadas.find((j) => j.clienteId === clienteId));
  const timeline = useTimeline(clienteId);
  const timelineDesc = useMemo(() => [...timeline].reverse(), [timeline]);
  const documentos = useDocumentosCliente(clienteId);
  const pagamentos = usePagamentosCliente(clienteId);
  const reunioes = useReunioesCliente(clienteId);

  if (!cliente || !jornada) return null;

  const stepperItems: StepperItem[] = jornada.fases.map((f) => ({
    id: f.id,
    title: f.titulo,
    status: f.status,
  }));
  const faseAtual = jornada.fases.find(
    (fase) => fase.status === "em_andamento" || fase.status === "liberada",
  );
  const documentosEmAcao = documentos.filter((documento) =>
    ["pendente", "ajustes", "em_analise"].includes(documento.status),
  ).length;
  const pagamentosEmAberto = pagamentos.filter((pagamento) => pagamento.status !== "pago").length;
  const proximaReuniao = [...reunioes]
    .filter((reuniao) => new Date(reuniao.inicio).getTime() >= Date.now())
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0];

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-gold-700 transition hover:text-gold-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("clientes.backToList")}
      </button>

      <section className="overflow-hidden rounded-xl bg-navy text-white shadow-elevated">
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={cliente.nome} size="lg" className="ring-4 ring-white/15" />
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">
                Visão do cliente
              </p>
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-white">
                {cliente.nome}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {cliente.tipoVisto} <span className="mx-1.5 text-slate-500">·</span>{" "}
                {cliente.caseManager}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cliente.programaId && (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
                {cliente.programaId} · v{cliente.programaVersao}
              </span>
            )}
            <Badge variant={SAUDE_VARIANT[cliente.saude]}>
              {t(`clientes.health_${cliente.saude}`)}
            </Badge>
          </div>
        </div>
        <div className="grid divide-y divide-white/10 border-t border-white/10 bg-white/[0.045] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <ClientSignal
            icon={FileText}
            label="Documentos em ação"
            value={
              documentosEmAcao === 0
                ? "Em dia"
                : `${documentosEmAcao} pendente${documentosEmAcao > 1 ? "s" : ""}`
            }
          />
          <ClientSignal
            icon={WalletCards}
            label="Financeiro"
            value={pagamentosEmAberto === 0 ? "Regular" : `${pagamentosEmAberto} em aberto`}
          />
          <ClientSignal
            icon={CalendarDays}
            label="Próximo encontro"
            value={
              proximaReuniao
                ? new Date(proximaReuniao.inicio).toLocaleDateString("pt-BR")
                : "Sem agenda"
            }
          />
        </div>
      </section>

      <Tabs defaultValue="data">
        <TabsList className="flex max-w-full overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="data">{t("clientes.tabs.data")}</TabsTrigger>
          <TabsTrigger value="journey">{t("clientes.tabs.journey")}</TabsTrigger>
          <TabsTrigger value="documents">{t("clientes.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="payments">{t("clientes.tabs.payments")}</TabsTrigger>
          <TabsTrigger value="meetings">{t("clientes.tabs.meetings")}</TabsTrigger>
          <TabsTrigger value="conversations">{t("clientes.tabs.conversations")}</TabsTrigger>
          <TabsTrigger value="history">{t("clientes.tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <div className="flex max-w-2xl flex-col gap-5">
            <Card className="grid grid-cols-1 gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
              <Info label="Nome" value={cliente.nome} />
              <Info label="E-mail" value={cliente.email} />
              <Info label="Telefone" value={cliente.telefone} />
              <Info label="Visto" value={cliente.tipoVisto} />
              <Info label="Case manager" value={cliente.caseManager} />
              <Info
                label="Cliente desde"
                value={new Date(cliente.criadoEm).toLocaleDateString("pt-BR")}
              />
            </Card>
            <PerfilImigratorioResumo perfil={cliente.perfilImigratorio} />
            <PastaDriveCard clienteId={cliente.id} pastaDriveNome={cliente.pastaDriveNome} />
          </div>
        </TabsContent>

        <TabsContent value="journey">
          <Card>
            <div className="mb-5 flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-navy">Etapas do processo</p>
                <p className="text-xs text-ink-muted">
                  {faseAtual ? `Em andamento: ${faseAtual.titulo}` : "Jornada concluída"}
                </p>
              </div>
            </div>
            <div className="mb-6 overflow-x-auto">
              <Stepper items={stepperItems} />
            </div>
            <EtapasParaAprovar clienteId={clienteId} />
            <JornadaGestao clienteId={clienteId} />
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          {documentos.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <div className="flex flex-col gap-2">
              {documentos.some((d) => d.status === "em_analise") && (
                <Link to="/admin/documentos" className="text-xs text-gold-700 hover:underline">
                  {t("clientes.goToReviewQueue")}
                </Link>
              )}
              {documentos.map((d) => (
                <Card key={d.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-navy">{d.nome}</p>
                    <DocumentoCaminhoDrive documento={d} />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {d.analise && (
                      <Badge variant={d.analise.aderencia === "atende" ? "success" : "warning"}>
                        {d.analise.aderencia}
                      </Badge>
                    )}
                    <Badge variant={DOC_STATUS_VARIANT[d.status]}>{d.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments">
          <div className="flex flex-col gap-4">
            {pagamentos.length === 0 ? (
              <p className="text-sm text-ink-muted">Nenhum item de pagamento cadastrado ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pagamentos.map((p) => (
                  <Card key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-navy">{p.descricao}</p>
                      <p className="text-xs text-ink-muted">
                        {new Intl.NumberFormat(p.moeda === "BRL" ? "pt-BR" : "en-US", {
                          style: "currency",
                          currency: p.moeda,
                        }).format(p.valor)}{" "}
                        · vence {new Date(p.vencimento).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant={PAG_STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  </Card>
                ))}
              </div>
            )}
            <NovoPagamentoForm clienteId={clienteId} />
          </div>
        </TabsContent>

        <TabsContent value="meetings">
          {reunioes.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <div className="flex flex-col gap-2">
              {reunioes.map((r) => (
                <Card key={r.id} className="flex items-center justify-between">
                  <p className="text-sm text-navy">{r.titulo}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(r.inicio).toLocaleDateString("pt-BR")}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conversations">
          <ConversasTab clienteId={clienteId} />
        </TabsContent>

        <TabsContent value="history">
          <Timeline eventos={timelineDesc} emptyLabel={t("clientes.noHistory")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientSignal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-gold-300">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-medium text-navy">{value}</p>
    </div>
  );
}

function PerfilImigratorioResumo({ perfil }: { perfil?: PerfilImigratorio }) {
  if (!perfil || (!perfil.nomeCompletoLegal && perfil.familiares.length === 0)) {
    return (
      <Card className="text-sm text-ink-muted">
        Cliente ainda não preencheu os dados do processo em "Meu perfil" no portal.
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <h3 className="font-semibold text-navy">Dados do processo</h3>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        <Info label="Nome completo legal" value={perfil.nomeCompletoLegal || "Não informado"} />
        <Info label="Data de nascimento" value={perfil.dataNascimento || "Não informado"} />
        <Info label="País de nascimento" value={perfil.paisNascimento || "Não informado"} />
        <Info label="Nacionalidade" value={perfil.nacionalidade || "Não informado"} />
        <Info label="Passaporte" value={perfil.numeroPassaporte || "Não informado"} />
        <Info label="Validade do passaporte" value={perfil.validadePassaporte || "Não informado"} />
        <Info
          label="Estado civil"
          value={
            perfil.estadoCivil ? ESTADO_CIVIL_LABEL_ADMIN[perfil.estadoCivil] : "Não informado"
          }
        />
        <Info label="Endereço atual" value={perfil.enderecoAtual || "Não informado"} />
      </div>
      {perfil.familiares.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-label text-gold-700">
            Família
          </p>
          <div className="flex flex-col gap-1.5">
            {perfil.familiares.map((familiar) => (
              <div
                key={familiar.id}
                className="flex items-center justify-between rounded-md border border-border bg-cream-50/60 px-3 py-2 text-sm"
              >
                <span className="text-navy">
                  {familiar.nome || "Não informado"}{" "}
                  <span className="text-ink-muted">
                    · {PARENTESCO_LABEL_ADMIN[familiar.parentesco]}
                  </span>
                </span>
                {familiar.incluirNoProcesso && <Badge variant="gold">Incluído no processo</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

const ESTADO_CIVIL_LABEL_ADMIN: Record<EstadoCivil, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  uniao_estavel: "União estável",
};

const PARENTESCO_LABEL_ADMIN: Record<ParentescoFamiliar, string> = {
  conjuge: "Cônjuge",
  filho: "Filho",
  filha: "Filha",
  outro: "Outro",
};

function PastaDriveCard({
  clienteId,
  pastaDriveNome,
}: { clienteId: string; pastaDriveNome?: string }) {
  const contaArquivos = useContaArquivosAtiva();
  const { cliente, refetch } = useClienteReal(clienteId);
  const [valor, setValor] = useState(pastaDriveNome ?? "");
  const [salvando, setSalvando] = useState(false);

  const pastaEfetiva = valor.trim() || cliente?.nome || "";

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    try {
      await container.clientes.atualizar(clienteId, { pastaDriveNome: valor.trim() || undefined });
      refetch();
      toast.success("Pasta do OneDrive/Drive atualizada.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-gold-700" aria-hidden />
        <h3 className="font-semibold text-navy">Pasta no OneDrive/Drive</h3>
      </div>
      {!contaArquivos ? (
        <p className="text-sm text-ink-muted">
          Nenhuma conta com escopo de arquivos conectada.{" "}
          <Link to="/admin/configuracoes" className="font-medium text-gold-700 underline">
            Conectar em Configurações →
          </Link>
        </p>
      ) : (
        <>
          <p className="text-xs text-ink-muted">
            Subpastas por fase são criadas automaticamente conforme o cliente avança — ex.:{" "}
            <span className="font-mono">
              {contaArquivos.pastaRaiz}/{pastaEfetiva}/Fase 1/...
            </span>
          </p>
          <Input
            label="Nome da pasta deste cliente"
            placeholder={cliente?.nome}
            value={valor}
            onChange={(event) => setValor(event.target.value)}
          />
          <Button size="sm" className="self-start" onClick={salvar} loading={salvando}>
            Salvar pasta
          </Button>
        </>
      )}
    </Card>
  );
}

function DocumentoCaminhoDrive({ documento }: { documento: Documento }) {
  const caminho = useCaminhoArquivoDrive(documento);
  if (!caminho) return null;
  return (
    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-muted">
      <FolderOpen className="h-3 w-3 shrink-0" aria-hidden />
      {caminho}
    </p>
  );
}

const TIPO_PAGAMENTO_LABEL: Record<PagamentoTipo, string> = {
  entrada: "Entrada",
  taxa_federal: "Taxa federal (USCIS)",
  parcela: "Parcela",
};

function NovoPagamentoForm({ clienteId }: { clienteId: string }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [moeda, setMoeda] = useState<Pagamento["moeda"]>("BRL");
  const [tipo, setTipo] = useState<PagamentoTipo>("parcela");
  const [vencimento, setVencimento] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function adicionar() {
    if (!descricao.trim() || !valor || !vencimento || salvando) return;
    setSalvando(true);
    try {
      await container.pagamentos.criar({
        clienteId,
        descricao: descricao.trim(),
        valor: Number(valor),
        moeda,
        tipo,
        vencimento: new Date(vencimento).toISOString(),
      });
      toast.success("Item de pagamento adicionado ao fluxo do cliente.");
      setDescricao("");
      setValor("");
      setVencimento("");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-gold-700" aria-hidden />
        <h3 className="font-semibold text-navy">Cadastrar item do fluxo de pagamento</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Descrição"
          placeholder="Ex.: Entrada, Parcela 2/4, Taxa USCIS"
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
        />
        <Select
          label="Tipo"
          value={tipo}
          onChange={(event) => setTipo(event.target.value as PagamentoTipo)}
        >
          {(Object.entries(TIPO_PAGAMENTO_LABEL) as [PagamentoTipo, string][]).map(
            ([valorTipo, label]) => (
              <option key={valorTipo} value={valorTipo}>
                {label}
              </option>
            ),
          )}
        </Select>
        <Input
          type="number"
          label="Valor"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
        />
        <Select
          label="Moeda"
          value={moeda}
          onChange={(event) => setMoeda(event.target.value as Pagamento["moeda"])}
        >
          <option value="BRL">BRL</option>
          <option value="USD">USD</option>
        </Select>
        <Input
          type="date"
          label="Vencimento"
          value={vencimento}
          onChange={(event) => setVencimento(event.target.value)}
        />
      </div>
      <Button
        size="sm"
        className="self-start"
        onClick={adicionar}
        loading={salvando}
        disabled={salvando || !descricao.trim() || !valor || !vencimento}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Adicionar ao fluxo
      </Button>
    </Card>
  );
}

function ConversasTab({ clienteId }: { clienteId: string }) {
  const conversaWhats = useConversaCliente(clienteId);
  const threadsEmail = useEmailThreads().filter((t) => t.clienteOuLeadId === clienteId);
  const contas = useMockDb((state) => state.contasAgenda);
  const [aberto, setAberto] = useState<{ tipo: "whatsapp" } | { tipo: "email"; id: string } | null>(
    null,
  );

  const threadEmailAberta =
    aberto?.tipo === "email" ? threadsEmail.find((t) => t.id === aberto.id) : undefined;

  if (!conversaWhats && threadsEmail.length === 0) {
    return <p className="text-sm text-ink-muted">Nenhuma conversa por WhatsApp ou e-mail ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {conversaWhats && (
        <button
          type="button"
          onClick={() => setAberto({ tipo: "whatsapp" })}
          className="flex items-center gap-3 rounded-md border border-border bg-white p-3 text-left transition-colors hover:bg-cream-200"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
            <MessageCircle className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-navy">WhatsApp</p>
            <p className="truncate text-xs text-ink-muted">
              {conversaWhats.mensagens.at(-1)?.texto || "Ver conversa completa"}
            </p>
          </div>
          <span className="shrink-0 text-xs text-ink-muted">
            {conversaWhats.mensagens.length} mensagens
          </span>
        </button>
      )}

      {threadsEmail.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => setAberto({ tipo: "email", id: thread.id })}
          className="flex items-center gap-3 rounded-md border border-border bg-white p-3 text-left transition-colors hover:bg-cream-200"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-700">
            <Mail className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy">{thread.assunto}</p>
            <p className="truncate text-xs text-ink-muted">
              {thread.mensagens.at(-1)?.corpo || "Ver e-mail completo"}
            </p>
          </div>
          <span className="shrink-0 text-xs text-ink-muted">
            {thread.mensagens.length} mensagens
          </span>
        </button>
      ))}

      {aberto?.tipo === "whatsapp" && conversaWhats && (
        <Modal
          open
          onClose={() => setAberto(null)}
          title="Conversa por WhatsApp"
          description={conversaWhats.clienteNome}
          className="max-w-2xl"
        >
          <WhatsappThreadCompleta conversaId={conversaWhats.id} />
        </Modal>
      )}

      {threadEmailAberta && (
        <Modal
          open
          onClose={() => setAberto(null)}
          title={threadEmailAberta.assunto}
          description="Thread completa"
          className="max-w-2xl"
        >
          <div className="flex max-h-[70vh] flex-col">
            <EmailThreadModal
              thread={threadEmailAberta}
              contaNome={contas.find((c) => c.id === threadEmailAberta.contaEmailId)?.nomeExibicao}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function WhatsappThreadCompleta({ conversaId }: { conversaId: string }) {
  const conversa = useMockDb((state) => state.conversas.find((c) => c.id === conversaId));
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!conversa) return null;

  async function handleEnviar() {
    if (!mensagem.trim() || enviando) return;
    setEnviando(true);
    try {
      await container.conversas.enviarMensagem(conversaId, mensagem.trim());
      setMensagem("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {conversa.mensagens.map((m) => (
          <MensagemBubble
            key={m.id}
            mensagem={m}
            conversaId={conversaId}
            lado={m.autor === "cliente" ? "esquerda" : "direita"}
          />
        ))}
      </div>
      <div className="flex gap-2 border-t border-border pt-3">
        <Input
          placeholder="Escrever mensagem…"
          value={mensagem}
          onChange={(event) => setMensagem(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleEnviar()}
          className="flex-1"
        />
        <Button onClick={handleEnviar} loading={enviando} disabled={enviando || !mensagem.trim()}>
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function EmailThreadModal({
  thread,
  contaNome,
}: { thread: EmailThread; contaNome: string | undefined }) {
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleResponder() {
    if (!resposta.trim() || enviando) return;
    setEnviando(true);
    try {
      await container.email.responder(thread.id, resposta.trim());
      setResposta("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <EmailThreadPane
      thread={thread}
      contaNome={contaNome}
      resposta={resposta}
      onRespostaChange={setResposta}
      onResponder={handleResponder}
      enviando={enviando}
    />
  );
}

function EtapasParaAprovar({ clienteId }: { clienteId: string }) {
  const jornada = useMockDb((s) => s.jornadas.find((j) => j.clienteId === clienteId));
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [devolvendoId, setDevolvendoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const emAnalise = (jornada?.fases ?? []).flatMap((fase) =>
    fase.etapas.filter((etapa) => etapa.status === "em_analise").map((etapa) => ({ etapa, fase })),
  );

  if (emAnalise.length === 0) return null;

  async function handleAprovar(etapaId: string) {
    if (processandoId) return;
    setProcessandoId(etapaId);
    try {
      await aprovarEtapa(clienteId, etapaId);
      toast.success("Etapa aprovada. O cliente foi notificado.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleDevolver(etapaId: string) {
    if (!motivo.trim() || processandoId) return;
    setProcessandoId(etapaId);
    try {
      await devolverEtapaParaAjuste(clienteId, etapaId, motivo.trim());
      toast.success("Etapa devolvida para ajustes.");
      setDevolvendoId(null);
      setMotivo("");
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gold-200 bg-gold-50/40 p-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gold-700" aria-hidden />
        <p className="text-sm font-semibold text-navy">
          Aguardando sua avaliação ({emAnalise.length})
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {emAnalise.map(({ etapa, fase }) => (
          <div key={etapa.id} className="rounded-lg border border-border bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-navy">{etapa.titulo}</p>
                <p className="text-xs text-ink-muted">{fase.titulo}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDevolvendoId(devolvendoId === etapa.id ? null : etapa.id)}
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden />
                  Devolver p/ ajuste
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAprovar(etapa.id)}
                  loading={processandoId === etapa.id && devolvendoId !== etapa.id}
                  disabled={processandoId === etapa.id}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Aprovar
                </Button>
              </div>
            </div>
            {devolvendoId === etapa.id && (
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                <Textarea
                  placeholder="O que o cliente precisa corrigir ou completar?"
                  rows={2}
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="self-start"
                  onClick={() => handleDevolver(etapa.id)}
                  loading={processandoId === etapa.id}
                  disabled={processandoId === etapa.id || !motivo.trim()}
                >
                  Confirmar devolução
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function JornadaGestao({ clienteId }: { clienteId: string }) {
  const { t } = useTranslation("admin");
  const jornada = useMockDb((s) => s.jornadas.find((j) => j.clienteId === clienteId));
  const [modalOpen, setModalOpen] = useState(false);
  const [liberando, setLiberando] = useState(false);

  if (!jornada) return null;

  const faseAtualIdx = jornada.fases.findIndex((f) => f.status === "em_andamento");
  const proximaBloqueadaIdx = jornada.fases.findIndex((f) => f.status === "bloqueada");

  if (proximaBloqueadaIdx === -1) {
    return <p className="text-sm text-ink-muted">{t("clientes.allPhasesUnlocked")}</p>;
  }

  const proximaFase = jornada.fases[proximaBloqueadaIdx];
  const faseAtualConcluida =
    faseAtualIdx === -1 || jornada.fases[faseAtualIdx]?.status === "concluida";

  async function handleLiberar() {
    if (liberando) return;
    setLiberando(true);
    try {
      await container.jornada.liberarFase(clienteId, proximaFase.id);
      toast.success(t("clientes.unlockedSuccess"));
      setModalOpen(false);
    } finally {
      setLiberando(false);
    }
  }

  return (
    <>
      <Button onClick={() => setModalOpen(true)}>{t("clientes.unlockNextPhase")}</Button>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("clientes.unlockConfirmTitle")}
        description={t("clientes.unlockConfirmDescription", { fase: proximaFase.titulo })}
      >
        <div className="flex flex-col gap-4">
          {!faseAtualConcluida && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t("clientes.currentPhaseIncomplete")}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLiberar} loading={liberando} disabled={liberando}>
              {t("clientes.unlockNextPhase")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
