import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import type { Documento } from "@/features/documentos/domain/types";
import type { Jornada } from "@/features/jornada/domain/types";
import type { Pagamento } from "@/features/pagamentos/domain/types";
import {
  Avatar,
  Badge,
  Card,
  Stepper,
  type StepperItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Clock3,
  FileText,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCliente360AdminSupabase } from "../application/useCliente360AdminSupabase";
import type { Cliente } from "../domain/types";

const SAUDE_VARIANT = { em_dia: "success", atencao: "warning", atrasado: "danger" } as const;
const DOCUMENTO_VARIANT = {
  pendente: "neutral",
  enviado: "navy",
  em_analise: "gold",
  aprovado: "success",
  ajustes: "warning",
} as const;
const PAGAMENTO_VARIANT = {
  pendente: "gold",
  em_conferencia: "navy",
  pago: "success",
  divergente: "danger",
  atrasado: "danger",
} as const;

export function Clientes360RealPage() {
  const { t } = useTranslation("admin");
  const { dados, carregando, erro } = useCliente360AdminSupabase();
  const [busca, setBusca] = useState("");
  const [filtroSaude, setFiltroSaude] = useState<"todos" | keyof typeof SAUDE_VARIANT>("todos");
  const [clienteId, setClienteId] = useState<string>();

  if (carregando) return <EstadoClientes mensagem="Carregando carteira real…" />;
  if (erro || !dados)
    return <EstadoClientes mensagem="Não foi possível carregar a carteira." erro />;

  const clienteSelecionado = dados.clientes.find((cliente) => cliente.id === clienteId);
  if (clienteSelecionado) {
    return (
      <Cliente360Real
        cliente={clienteSelecionado}
        dados={dados}
        onBack={() => setClienteId(undefined)}
      />
    );
  }

  const termo = busca.trim().toLocaleLowerCase();
  const clientes = dados.clientes.filter(
    (cliente) =>
      (filtroSaude === "todos" || cliente.saude === filtroSaude) &&
      (!termo ||
        [cliente.nome, cliente.email, cliente.tipoVisto, cliente.caseManager].some((valor) =>
          valor.toLocaleLowerCase().includes(termo),
        )),
  );
  const emAtencao = dados.clientes.filter((cliente) => cliente.saude === "atencao").length;
  const atrasados = dados.clientes.filter((cliente) => cliente.saude === "atrasado").length;

  return (
    <div className="flex flex-col gap-6" data-testid="clientes-360-real">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
            Carteira de processos
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
            {t("clientes.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("clientes.subtitle")}</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
          <Metric icon={UsersRound} value={dados.clientes.length} label="clientes" />
          <Metric icon={AlertTriangle} value={emAtencao} label="em atenção" tone="text-amber-700" />
          <Metric icon={Clock3} value={atrasados} label="atrasados" tone="text-red-700" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 shadow-subtle lg:flex-row lg:items-center lg:justify-between">
        <label className="relative w-full lg:max-w-sm">
          <span className="sr-only">{t("clientes.search")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            placeholder={t("clientes.search")}
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-cream-50 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-gold-400 focus:bg-white focus:ring-2 focus:ring-gold-100"
          />
        </label>
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-cream-100 p-1">
          {(["todos", "em_dia", "atencao", "atrasado"] as const).map((filtro) => (
            <button
              key={filtro}
              type="button"
              onClick={() => setFiltroSaude(filtro)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition",
                filtroSaude === filtro
                  ? "bg-white text-navy shadow-subtle"
                  : "text-ink-muted hover:text-ink-soft",
              )}
            >
              {filtro === "todos" ? "Todos" : t(`clientes.health_${filtro}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
        <div className="hidden grid-cols-[minmax(17rem,1.7fr)_minmax(7rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.8fr)_auto] items-center gap-5 border-b border-border bg-cream-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-label text-ink-muted lg:grid">
          <span>Cliente</span>
          <span>Processo</span>
          <span>Fase atual</span>
          <span>Responsável</span>
          <span>Saúde</span>
        </div>
        <div className="divide-y divide-border">
          {clientes.map((cliente) => (
            <ClienteLinha
              key={cliente.id}
              cliente={cliente}
              jornada={dados.jornadas.find((jornada) => jornada.clienteId === cliente.id)}
              onOpen={() => setClienteId(cliente.id)}
            />
          ))}
          {clientes.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-navy">Nenhum cliente encontrado</p>
              <p className="mt-1 text-xs text-ink-muted">Ajuste a busca ou filtro de saúde.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClienteLinha({
  cliente,
  jornada,
  onOpen,
}: { cliente: Cliente; jornada?: Jornada; onOpen: () => void }) {
  const { t } = useTranslation("admin");
  const faseAtual = jornada?.fases.find((fase) =>
    ["em_andamento", "liberada"].includes(fase.status),
  );
  const concluidas = jornada?.fases.filter((fase) => fase.status === "concluida").length ?? 0;
  const progresso = jornada?.fases.length
    ? Math.round((concluidas / jornada.fases.length) * 100)
    : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group grid w-full gap-3 px-4 py-4 text-left transition hover:bg-gold-50/35 lg:grid-cols-[minmax(17rem,1.7fr)_minmax(7rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.8fr)_auto] lg:items-center lg:gap-5 lg:px-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={cliente.nome} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-navy">{cliente.nome}</p>
          <p className="truncate text-xs text-ink-muted">{cliente.email}</p>
        </div>
      </div>
      <div>
        <p className="text-xs text-ink-muted lg:hidden">Processo</p>
        <p className="text-sm font-medium text-ink-soft">{cliente.tipoVisto}</p>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-muted lg:hidden">Fase atual</p>
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
          <p className="truncate text-sm font-medium text-ink-soft">
            {faseAtual?.titulo ?? "Sem jornada ativa"}
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 w-20 overflow-hidden rounded-full bg-cream-200">
            <div className="h-full rounded-full bg-gold-500" style={{ width: `${progresso}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-ink-muted">{progresso}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-ink-muted lg:hidden">Responsável</p>
        <p className="text-sm text-ink-soft">{cliente.caseManager}</p>
      </div>
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <Badge variant={SAUDE_VARIANT[cliente.saude]}>
          {t(`clientes.health_${cliente.saude}`)}
        </Badge>
        <ArrowUpRight className="h-4 w-4 text-ink-muted transition group-hover:text-gold-700" />
      </div>
    </button>
  );
}

function Cliente360Real({
  cliente,
  dados,
  onBack,
}: {
  cliente: Cliente;
  dados: NonNullable<ReturnType<typeof useCliente360AdminSupabase>["dados"]>;
  onBack: () => void;
}) {
  const { t } = useTranslation("admin");
  const jornada = dados.jornadas.find((item) => item.clienteId === cliente.id);
  const documentos = dados.documentos.filter((item) => item.clienteId === cliente.id);
  const pagamentos = dados.pagamentos.filter((item) => item.clienteId === cliente.id);
  const reunioes = dados.reunioes.filter((item) => item.clienteId === cliente.id);
  const conversas = dados.conversas.filter((item) => item.clienteId === cliente.id);
  const emails = dados.emails.filter((item) => item.clienteOuLeadId === cliente.id);
  const eventos = useMemo(
    () => [...dados.eventos.filter((item) => item.clienteOuLeadId === cliente.id)].reverse(),
    [cliente.id, dados.eventos],
  );
  const faseAtual = jornada?.fases.find((fase) =>
    ["em_andamento", "liberada"].includes(fase.status),
  );
  const proximaReuniao = [...reunioes]
    .filter((item) => new Date(item.inicio).getTime() >= Date.now())
    .sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const documentosEmAcao = documentos.filter((item) =>
    ["pendente", "ajustes", "em_analise"].includes(item.status),
  ).length;
  const pagamentosEmAberto = pagamentos.filter((item) => item.status !== "pago").length;
  const steps: StepperItem[] =
    jornada?.fases.map((fase) => ({ id: fase.id, title: fase.titulo, status: fase.status })) ?? [];

  return (
    <div className="flex flex-col gap-6" data-testid="cliente-360-real">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-gold-700 transition hover:text-gold-800"
      >
        <ArrowLeft className="h-4 w-4" />
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
          <Badge variant={SAUDE_VARIANT[cliente.saude]}>
            {t(`clientes.health_${cliente.saude}`)}
          </Badge>
        </div>
        <div className="grid divide-y divide-white/10 border-t border-white/10 bg-white/[0.045] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Sinal
            icon={FileText}
            label="Documentos em ação"
            value={documentosEmAcao ? `${documentosEmAcao} pendente(s)` : "Em dia"}
          />
          <Sinal
            icon={WalletCards}
            label="Financeiro"
            value={pagamentosEmAberto ? `${pagamentosEmAberto} em aberto` : "Regular"}
          />
          <Sinal
            icon={CalendarDays}
            label="Próximo encontro"
            value={proximaReuniao ? formatarData(proximaReuniao.inicio) : "Sem agenda"}
          />
        </div>
      </section>
      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
        <p>
          Visão somente leitura. Transições, upload, pagamentos e respostas exigem RPC/Edge Function
          segura; navegador não grava dados diretamente.
        </p>
      </Card>
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
          <DadosCliente cliente={cliente} />
        </TabsContent>
        <TabsContent value="journey">
          <Card>
            <p className="mb-3 text-sm font-semibold text-navy">
              {faseAtual ? `Em andamento: ${faseAtual.titulo}` : "Sem jornada ativa"}
            </p>
            {steps.length ? (
              <div className="overflow-x-auto">
                <Stepper items={steps} />
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Nenhuma jornada real cadastrada.</p>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          <ListaDocumentos documentos={documentos} />
        </TabsContent>
        <TabsContent value="payments">
          <ListaPagamentos pagamentos={pagamentos} />
        </TabsContent>
        <TabsContent value="meetings">
          <ListaReunioes reunioes={reunioes} />
        </TabsContent>
        <TabsContent value="conversations">
          <ListaConversas conversas={conversas} emails={emails} />
        </TabsContent>
        <TabsContent value="history">
          <Timeline eventos={eventos} emptyLabel={t("clientes.noHistory")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DadosCliente({ cliente }: { cliente: Cliente }) {
  const perfil = cliente.perfilImigratorio;
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Card className="grid grid-cols-1 gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
        <Campo label="Nome" value={cliente.nome} />
        <Campo label="E-mail" value={cliente.email} />
        <Campo label="Telefone" value={cliente.telefone} />
        <Campo label="Visto" value={cliente.tipoVisto} />
        <Campo label="Case manager" value={cliente.caseManager} />
        <Campo label="Cliente desde" value={formatarData(cliente.criadoEm)} />
      </Card>
      <Card>
        <p className="mb-4 font-semibold text-navy">Dados do processo</p>
        {!perfil ? (
          <p className="text-sm text-ink-muted">Cliente ainda não preencheu dados do processo.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <Campo label="Nome legal" value={perfil.nomeCompletoLegal ?? "Não informado"} />
            <Campo label="Nascimento" value={perfil.dataNascimento ?? "Não informado"} />
            <Campo label="Nacionalidade" value={perfil.nacionalidade ?? "Não informado"} />
            <Campo label="Passaporte" value={perfil.numeroPassaporte ?? "Não informado"} />
          </div>
        )}
      </Card>
    </div>
  );
}

function ListaDocumentos({ documentos }: { documentos: Documento[] }) {
  return documentos.length ? (
    <div className="flex flex-col gap-2">
      {documentos.map((documento) => (
        <Card key={documento.id} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-navy">{documento.nome}</p>
            <p className="text-xs text-ink-muted">{documento.tipo}</p>
          </div>
          <Badge variant={DOCUMENTO_VARIANT[documento.status]}>{documento.status}</Badge>
        </Card>
      ))}
    </div>
  ) : (
    <Vazio texto="Nenhum documento real cadastrado." />
  );
}
function ListaPagamentos({ pagamentos }: { pagamentos: Pagamento[] }) {
  return pagamentos.length ? (
    <div className="flex flex-col gap-2">
      {pagamentos.map((pagamento) => (
        <Card key={pagamento.id} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-navy">{pagamento.descricao}</p>
            <p className="text-xs text-ink-muted">
              {formatarMoeda(pagamento.valor, pagamento.moeda)} · vence{" "}
              {formatarData(pagamento.vencimento)}
            </p>
          </div>
          <Badge variant={PAGAMENTO_VARIANT[pagamento.status]}>{pagamento.status}</Badge>
        </Card>
      ))}
    </div>
  ) : (
    <Vazio texto="Nenhum pagamento real cadastrado." />
  );
}
function ListaReunioes({
  reunioes,
}: { reunioes: { id: string; titulo: string; inicio: string; status: string }[] }) {
  return reunioes.length ? (
    <div className="flex flex-col gap-2">
      {reunioes.map((reuniao) => (
        <Card key={reuniao.id} className="flex items-center justify-between">
          <p className="text-sm text-navy">{reuniao.titulo}</p>
          <p className="text-xs text-ink-muted">
            {formatarData(reuniao.inicio)} · {reuniao.status}
          </p>
        </Card>
      ))}
    </div>
  ) : (
    <Vazio texto="Nenhuma reunião real cadastrada." />
  );
}
function ListaConversas({
  conversas,
  emails,
}: {
  conversas: { id: string; mensagens: { id: string; texto: string }[] }[];
  emails: { id: string; assunto: string; mensagens: { id: string; corpo: string }[] }[];
}) {
  if (!conversas.length && !emails.length)
    return <Vazio texto="Nenhuma conversa real cadastrada." />;
  return (
    <div className="flex flex-col gap-2">
      {conversas.map((conversa) => (
        <Card key={conversa.id} className="flex items-center gap-3">
          <MessageCircle className="h-4 w-4 text-navy" />
          <div>
            <p className="text-sm font-medium text-navy">WhatsApp</p>
            <p className="text-xs text-ink-muted">
              {conversa.mensagens.at(-1)?.texto ?? "Sem mensagens válidas"}
            </p>
          </div>
        </Card>
      ))}
      {emails.map((email) => (
        <Card key={email.id} className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-navy" />
          <div>
            <p className="text-sm font-medium text-navy">{email.assunto}</p>
            <p className="text-xs text-ink-muted">
              {email.mensagens.at(-1)?.corpo ?? "Sem mensagens válidas"}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
function Vazio({ texto }: { texto: string }) {
  return <Card className="text-sm text-ink-muted">{texto}</Card>;
}
function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-medium text-navy">{value}</p>
    </div>
  );
}
function Sinal({
  icon: Icon,
  label,
  value,
}: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-gold-300">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}
function Metric({
  icon: Icon,
  value,
  label,
  tone = "text-navy",
}: { icon: typeof UsersRound; value: number; label: string; tone?: string }) {
  return (
    <div className="flex min-w-28 items-center gap-2.5 px-3.5 py-2.5">
      <Icon className={cn("h-4 w-4", tone)} />
      <div>
        <p className={cn("text-sm font-semibold tabular-nums", tone)}>{value}</p>
        <p className="text-[11px] leading-none text-ink-muted">{label}</p>
      </div>
    </div>
  );
}
function EstadoClientes({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Clientes</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? (
          <CircleAlert className="h-4 w-4 text-red-600" />
        ) : (
          <UsersRound className="h-4 w-4" />
        )}
        {mensagem}
      </Card>
    </div>
  );
}
function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString("pt-BR");
}
function formatarMoeda(valor: number, moeda: "BRL" | "USD") {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}
