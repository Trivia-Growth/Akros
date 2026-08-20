import type {
  IntegracaoExterna,
  ProvedorAgenda,
  ProvedorCanal,
} from "@/features/configuracoes/domain/types";
import { useMockDb } from "@/mocks/store";
import { Badge, Button, Card, Input, Modal, Select, toast } from "@/shared/ui";
import {
  ArrowUpRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Database,
  FileAudio,
  Instagram,
  KeyRound,
  MessageCircle,
  PlugZap,
  Settings2,
  Unplug,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const PROVEDOR_LABEL: Record<ProvedorAgenda, string> = {
  google: "Google Calendar",
  microsoft: "Microsoft (Outlook)",
  calendly: "Calendly",
};

const PROVEDOR_CANAL_LABEL: Record<ProvedorCanal, string> = {
  whatsapp_oficial: "WhatsApp Oficial",
  evolution: "Evolution (WhatsApp)",
  instagram: "Instagram",
};

const PROVEDOR_CANAL_ICON: Record<ProvedorCanal, typeof MessageCircle> = {
  whatsapp_oficial: MessageCircle,
  evolution: MessageCircle,
  instagram: Instagram,
};

const CATEGORY_ICON = {
  mensageria: MessageCircle,
  pagamentos: CreditCard,
  crm: Database,
  automacao: PlugZap,
  transcricao: FileAudio,
} as const;

export function ConfiguracoesPage() {
  const integracoes = useMockDb((state) => state.integracoes);
  const [selecionada, setSelecionada] = useState<IntegracaoExterna | null>(null);
  const ativas = integracoes.filter((integracao) => integracao.ativa).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
            Akros OS · preparação SaaS
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
            Central de configurações
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Configure a operação sem mexer em código: jornadas, canais, integrações e automações.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-subtle">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">Ambiente de demonstração</p>
            <p className="text-xs text-ink-muted">Dados isolados e mockados nesta sessão</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ConfigShortcut
          icon={Settings2}
          title="Jornadas por programa"
          description="Fases, passos e responsáveis para cada tipo de visto."
          href="/admin/programas"
          action="Configurar jornadas"
        />
        <ConfigShortcut
          icon={Bot}
          title="Agentes e atendimento"
          description="Tom de voz, handoff humano e simulação de respostas."
          href="/admin/comunicacao"
          action="Configurar agente"
        />
        <div className="rounded-xl border border-gold-200 bg-gold-50/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
            Conexões ativas
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-navy">{ativas}</p>
          <p className="mt-1 text-sm text-ink-soft">
            de {integracoes.length} integrações preparadas
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
        <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-navy">Integrações externas</h2>
            <p className="text-xs text-ink-muted">
              As chaves ficam mascaradas; nesta demo nada é enviado para provedores reais.
            </p>
          </div>
          <Badge variant="neutral">Mock</Badge>
        </div>
        <div className="divide-y divide-border">
          {integracoes.map((integracao) => {
            const Icon = CATEGORY_ICON[integracao.categoria];
            return (
              <div
                key={integracao.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-navy">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-navy">
                      {integracao.nome}{" "}
                      <span className="font-normal text-ink-muted">· {integracao.fornecedor}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">{integracao.descricao}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <Badge variant={integracao.ativa ? "success" : "neutral"}>
                      {integracao.ativa ? "Ativa" : "Não configurada"}
                    </Badge>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      {integracao.segredoConfigurado
                        ? `Chave •••• ${integracao.segredoFinal}`
                        : "Sem chave cadastrada"}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setSelecionada(integracao)}>
                    <KeyRound className="h-4 w-4" aria-hidden />
                    Configurar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selecionada &&
        (selecionada.id === "instagram" ? (
          <MetaIntegrationModal integracao={selecionada} onClose={() => setSelecionada(null)} />
        ) : (
          <IntegrationModal integracao={selecionada} onClose={() => setSelecionada(null)} />
        ))}

      <ContasAgendaSection />
      <ContasCanalSection />
    </div>
  );
}

function ContasAgendaSection() {
  const contasAgenda = useMockDb((state) => state.contasAgenda);
  const desconectarContaAgenda = useMockDb((state) => state.desconectarContaAgenda);
  const [conectando, setConectando] = useState(false);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-navy">Contas de agenda conectadas</h2>
          <p className="text-xs text-ink-muted">
            Google, Microsoft ou Calendly — o agente de IA usa essas contas pra marcar reunião
            direto na conversa (configure quais em Agente IA → Ferramenta de agendamento).
          </p>
        </div>
        <Button size="sm" onClick={() => setConectando(true)}>
          <PlugZap className="h-4 w-4" aria-hidden />
          Conectar conta
        </Button>
      </div>
      <div className="divide-y divide-border">
        {contasAgenda.length === 0 && (
          <p className="px-5 py-6 text-sm text-ink-muted">Nenhuma conta conectada ainda.</p>
        )}
        {contasAgenda.map((conta) => (
          <div
            key={conta.id}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-navy">
                <CalendarClock className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-navy">{conta.nomeExibicao}</p>
                <p className="text-xs text-ink-muted">{PROVEDOR_LABEL[conta.provedor]}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge variant={conta.ativa ? "success" : "neutral"}>
                {conta.ativa ? "Ativa" : "Inativa"}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => desconectarContaAgenda(conta.id)}
              >
                <Unplug className="h-4 w-4" aria-hidden />
                Desconectar
              </Button>
            </div>
          </div>
        ))}
      </div>
      {conectando && <ConectarContaAgendaModal onClose={() => setConectando(false)} />}
    </section>
  );
}

function ConectarContaAgendaModal({ onClose }: { onClose: () => void }) {
  const [provedor, setProvedor] = useState<ProvedorAgenda | null>(null);

  return (
    <Modal
      open
      onClose={onClose}
      title="Conectar conta de agenda"
      description="Simulação de credencial: os segredos são descartados e só os quatro últimos caracteres ficam salvos."
    >
      {!provedor ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(["google", "microsoft", "calendly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvedor(p)}
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:border-gold-300 hover:bg-gold-50/30"
            >
              <CalendarClock className="h-5 w-5 text-navy" aria-hidden />
              <span className="text-sm font-medium text-navy">{PROVEDOR_LABEL[p]}</span>
            </button>
          ))}
        </div>
      ) : (
        <ContaAgendaForm provedor={provedor} onClose={onClose} />
      )}
    </Modal>
  );
}

function ContaAgendaForm({ provedor, onClose }: { provedor: ProvedorAgenda; onClose: () => void }) {
  const conectarContaAgenda = useMockDb((state) => state.conectarContaAgenda);
  const [nomeExibicao, setNomeExibicao] = useState("");

  // Google / Microsoft
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [tenantId, setTenantId] = useState("");

  // Calendly
  const [personalAccessToken, setPersonalAccessToken] = useState("");
  const [organizationUri, setOrganizationUri] = useState("");
  const [eventTypeUri, setEventTypeUri] = useState("");

  function salvar() {
    if (!nomeExibicao) return;
    if (provedor === "google") {
      conectarContaAgenda({
        provedor: "google",
        nomeExibicao,
        credenciais: {
          provedor: "google",
          dados: {
            clientId,
            clientSecretConfigurado: !!clientSecret,
            clientSecretFinal: clientSecret.slice(-4).toUpperCase() || undefined,
            refreshTokenConfigurado: !!refreshToken,
            refreshTokenFinal: refreshToken.slice(-4).toUpperCase() || undefined,
            calendarId,
          },
        },
      });
    } else if (provedor === "microsoft") {
      conectarContaAgenda({
        provedor: "microsoft",
        nomeExibicao,
        credenciais: {
          provedor: "microsoft",
          dados: {
            clientId,
            clientSecretConfigurado: !!clientSecret,
            clientSecretFinal: clientSecret.slice(-4).toUpperCase() || undefined,
            tenantId,
            refreshTokenConfigurado: !!refreshToken,
            refreshTokenFinal: refreshToken.slice(-4).toUpperCase() || undefined,
          },
        },
      });
    } else {
      conectarContaAgenda({
        provedor: "calendly",
        nomeExibicao,
        credenciais: {
          provedor: "calendly",
          dados: {
            personalAccessTokenConfigurado: !!personalAccessToken,
            personalAccessTokenFinal: personalAccessToken.slice(-4).toUpperCase() || undefined,
            organizationUri,
            eventTypeUri,
          },
        },
      });
    }
    toast.success("Conta de agenda conectada no ambiente de demonstração.");
    onClose();
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Nome de exibição"
        placeholder="Ex.: Natalia — Google Calendar"
        value={nomeExibicao}
        onChange={(event) => setNomeExibicao(event.target.value)}
      />
      {(provedor === "google" || provedor === "microsoft") && (
        <>
          <Input
            label="Client ID"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          />
          <Input
            label="Client Secret"
            type="password"
            autoComplete="off"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
          />
          {provedor === "microsoft" && (
            <Input
              label="Tenant ID"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
            />
          )}
          <Input
            label="Refresh Token"
            type="password"
            autoComplete="off"
            value={refreshToken}
            onChange={(event) => setRefreshToken(event.target.value)}
          />
          {provedor === "google" && (
            <Input
              label="Calendar ID"
              placeholder="pessoa@akrosimmigration.com"
              value={calendarId}
              onChange={(event) => setCalendarId(event.target.value)}
            />
          )}
        </>
      )}
      {provedor === "calendly" && (
        <>
          <Input
            label="Personal Access Token"
            type="password"
            autoComplete="off"
            value={personalAccessToken}
            onChange={(event) => setPersonalAccessToken(event.target.value)}
          />
          <Input
            label="Organization URI"
            placeholder="https://api.calendly.com/organizations/..."
            value={organizationUri}
            onChange={(event) => setOrganizationUri(event.target.value)}
          />
          <Input
            label="Event Type URI"
            placeholder="https://api.calendly.com/event_types/..."
            value={eventTypeUri}
            onChange={(event) => setEventTypeUri(event.target.value)}
          />
        </>
      )}
      <div className="mt-1 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={salvar} disabled={!nomeExibicao}>
          Conectar conta
        </Button>
      </div>
    </div>
  );
}

function ConfigShortcut({
  icon: Icon,
  title,
  description,
  href,
  action,
}: { icon: typeof Settings2; title: string; description: string; href: string; action: string }) {
  return (
    <Link
      to={href}
      className="group rounded-xl border border-border bg-white p-5 shadow-subtle transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-elevated"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <h2 className="mt-4 font-semibold text-navy">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{description}</p>
      <span className="mt-4 flex items-center gap-1 text-sm font-medium text-gold-700">
        {action}
        <ArrowUpRight
          className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}

function IntegrationModal({
  integracao,
  onClose,
}: { integracao: IntegracaoExterna; onClose: () => void }) {
  const atualizarIntegracao = useMockDb((state) => state.atualizarIntegracao);
  const [ativa, setAtiva] = useState(integracao.ativa);
  const [apiKey, setApiKey] = useState("");

  function salvar() {
    atualizarIntegracao(integracao.id, { ativa, apiKey });
    toast.success("Configuração salva no ambiente de demonstração.");
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Configurar ${integracao.nome}`}
      description="Simulação de credencial: a chave será descartada e apenas os quatro últimos caracteres serão exibidos."
    >
      <div className="flex flex-col gap-5">
        <Card className="flex items-start gap-3 border-gold-200 bg-gold-50/45">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
          <p className="text-sm text-ink-soft">
            No produto real, a chave será enviada ao cofre de segredos no backend. Ela nunca deve
            ser armazenada no navegador.
          </p>
        </Card>
        <Input
          label="Chave de API / token"
          type="password"
          autoComplete="off"
          placeholder={
            integracao.segredoConfigurado
              ? `Chave atual •••• ${integracao.segredoFinal}`
              : "Cole uma chave de demonstração"
          }
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3.5">
          <div>
            <p className="text-sm font-medium text-navy">Ativar integração</p>
            <p className="text-xs text-ink-muted">
              Disponibiliza o canal para automações quando houver backend.
            </p>
          </div>
          <input
            type="checkbox"
            checked={ativa}
            onChange={(event) => setAtiva(event.target.checked)}
            className="h-4 w-4 accent-gold-600"
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={salvar}>Salvar integração</Button>
      </div>
    </Modal>
  );
}

function MetaIntegrationModal({
  integracao,
  onClose,
}: { integracao: IntegracaoExterna; onClose: () => void }) {
  const atualizarCredenciaisMeta = useMockDb((state) => state.atualizarCredenciaisMeta);
  const atual = integracao.credenciaisMeta;
  const [ativa, setAtiva] = useState(integracao.ativa);
  const [appId, setAppId] = useState(atual?.appId ?? "");
  const [appSecret, setAppSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(atual?.webhookVerifyToken ?? "");
  const [contaInstagramId, setContaInstagramId] = useState(atual?.contaInstagramId ?? "");

  function salvar() {
    atualizarCredenciaisMeta(integracao.id, {
      ativa,
      appId,
      appSecret: appSecret || undefined,
      accessToken: accessToken || undefined,
      webhookVerifyToken,
      contaInstagramId,
    });
    toast.success("Credenciais da Meta salvas no ambiente de demonstração.");
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Configurar ${integracao.nome}`}
      description="Credenciais da Meta Graph API. App Secret e Access Token ficam mascarados após salvos; nesta demo nada é enviado para a Meta."
    >
      <div className="flex flex-col gap-5">
        <Card className="flex items-start gap-3 border-gold-200 bg-gold-50/45">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
          <p className="text-sm text-ink-soft">
            No produto real, App Secret e Access Token serão enviados ao cofre de segredos no
            backend. Eles nunca devem ser armazenados no navegador.
          </p>
        </Card>
        <Input label="App ID" value={appId} onChange={(event) => setAppId(event.target.value)} />
        <Input
          label="App Secret"
          type="password"
          autoComplete="off"
          placeholder={
            atual?.appSecretConfigurado
              ? `Segredo atual •••• ${atual.appSecretFinal}`
              : "Cole o App Secret de demonstração"
          }
          value={appSecret}
          onChange={(event) => setAppSecret(event.target.value)}
        />
        <Input
          label="Access Token (Page/Instagram)"
          type="password"
          autoComplete="off"
          placeholder={
            atual?.accessTokenConfigurado
              ? `Token atual •••• ${atual.accessTokenFinal}`
              : "Cole o Access Token de demonstração"
          }
          value={accessToken}
          onChange={(event) => setAccessToken(event.target.value)}
        />
        <Input
          label="Webhook Verify Token"
          value={webhookVerifyToken}
          onChange={(event) => setWebhookVerifyToken(event.target.value)}
        />
        <Input
          label="Instagram Business Account ID"
          value={contaInstagramId}
          onChange={(event) => setContaInstagramId(event.target.value)}
        />
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3.5">
          <div>
            <p className="text-sm font-medium text-navy">Ativar integração</p>
            <p className="text-xs text-ink-muted">
              Disponibiliza o Instagram como canal do agente de IA quando houver backend.
            </p>
          </div>
          <input
            type="checkbox"
            checked={ativa}
            onChange={(event) => setAtiva(event.target.checked)}
            className="h-4 w-4 accent-gold-600"
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={salvar}>Salvar credenciais</Button>
      </div>
    </Modal>
  );
}

function ContasCanalSection() {
  const contasCanal = useMockDb((state) => state.contasCanal);
  const desconectarContaCanal = useMockDb((state) => state.desconectarContaCanal);
  const [conectando, setConectando] = useState(false);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-navy">Contas de canal conectadas</h2>
          <p className="text-xs text-ink-muted">
            WhatsApp ou Instagram — cadastre quantas contas precisar, como já é possível com e-mail.
            O agente de IA escolhe quais atende (Agente IA → Canais atendidos).
          </p>
        </div>
        <Button size="sm" onClick={() => setConectando(true)}>
          <PlugZap className="h-4 w-4" aria-hidden />
          Conectar conta
        </Button>
      </div>
      <div className="divide-y divide-border">
        {contasCanal.length === 0 && (
          <p className="px-5 py-6 text-sm text-ink-muted">Nenhuma conta conectada ainda.</p>
        )}
        {contasCanal.map((conta) => {
          const Icon = PROVEDOR_CANAL_ICON[conta.provedor];
          return (
            <div
              key={conta.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-navy">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">{conta.nomeExibicao}</p>
                  <p className="text-xs text-ink-muted">
                    {PROVEDOR_CANAL_LABEL[conta.provedor]} · {conta.identificador}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge variant={conta.ativa ? "success" : "neutral"}>
                  {conta.ativa ? "Ativa" : "Inativa"}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => desconectarContaCanal(conta.id)}
                >
                  <Unplug className="h-4 w-4" aria-hidden />
                  Desconectar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {conectando && <ConectarContaCanalModal onClose={() => setConectando(false)} />}
    </section>
  );
}

function ConectarContaCanalModal({ onClose }: { onClose: () => void }) {
  const conectarContaCanal = useMockDb((state) => state.conectarContaCanal);
  const [provedor, setProvedor] = useState<ProvedorCanal>("whatsapp_oficial");
  const [nomeExibicao, setNomeExibicao] = useState("");
  const [identificador, setIdentificador] = useState("");

  function salvar() {
    if (!nomeExibicao || !identificador) return;
    conectarContaCanal({ provedor, nomeExibicao, identificador });
    toast.success("Conta de canal conectada no ambiente de demonstração.");
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Conectar conta de canal">
      <div className="flex flex-col gap-4">
        <Select
          label="Provedor"
          value={provedor}
          onChange={(event) => setProvedor(event.target.value as ProvedorCanal)}
        >
          {(Object.entries(PROVEDOR_CANAL_LABEL) as [ProvedorCanal, string][]).map(
            ([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ),
          )}
        </Select>
        <Input
          label="Nome de exibição"
          placeholder="Ex.: WhatsApp — Atendimento"
          value={nomeExibicao}
          onChange={(event) => setNomeExibicao(event.target.value)}
        />
        <Input
          label="Número ou @handle"
          placeholder={provedor === "instagram" ? "@akrosimmigration" : "+55 11 90000-0000"}
          value={identificador}
          onChange={(event) => setIdentificador(event.target.value)}
        />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={salvar} disabled={!nomeExibicao || !identificador}>
          Conectar conta
        </Button>
      </div>
    </Modal>
  );
}
