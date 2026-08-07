import type { IntegracaoExterna } from "@/features/configuracoes/domain/types";
import { useMockDb } from "@/mocks/store";
import { Badge, Button, Card, Input, Modal, toast } from "@/shared/ui";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CreditCard,
  Database,
  KeyRound,
  MessageCircle,
  PlugZap,
  Settings2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const CATEGORY_ICON = {
  mensageria: MessageCircle,
  pagamentos: CreditCard,
  crm: Database,
  automacao: PlugZap,
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

      {selecionada && (
        <IntegrationModal integracao={selecionada} onClose={() => setSelecionada(null)} />
      )}
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
