import type { FiltrosCarteira, ItemCarteira } from "@/features/crm/application/ports";
import { useCarteiraSupabase } from "@/features/crm/application/useCarteiraSupabase";
import { Badge, Button, Card, Input, Select } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import {
  AlertTriangle,
  CircleAlert,
  Clock3,
  FileWarning,
  Search,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const RESPONSAVEL_LABEL = { cliente: "Cliente", akros: "Akros" } as const;

export function CarteiraRealPage() {
  const { t } = useTranslation("admin");
  const [filtros, setFiltros] = useState<FiltrosCarteira>({});
  const [buscaRascunho, setBuscaRascunho] = useState("");
  const { itens, totais, temMais, carregando, carregandoMais, erro, carregarMais } =
    useCarteiraSupabase(filtros);

  function aplicarResponsavel(valor: "cliente" | "akros" | undefined) {
    setFiltros((atual) => ({
      ...atual,
      responsavel: atual.responsavel === valor ? undefined : valor,
    }));
  }

  return (
    <div className="flex flex-col gap-6" data-testid="carteira-real">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("portfolio.title")}</h1>
        <p className="text-sm text-ink-soft">{t("portfolio.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Indicador
          icon={Users}
          label={t("portfolio.indicatorTotal")}
          valor={totais.total}
          ativo={!filtros.responsavel && !filtros.tipoPendencia}
          onClick={() => setFiltros({})}
        />
        <Indicador
          icon={UserRound}
          label={t("portfolio.indicatorWaitingClient")}
          valor={totais.aguardandoCliente}
          tone="text-amber-700"
          ativo={filtros.responsavel === "cliente"}
          onClick={() => aplicarResponsavel("cliente")}
        />
        <Indicador
          icon={Clock3}
          label={t("portfolio.indicatorWaitingAkros")}
          valor={totais.aguardandoAkros}
          tone="text-navy"
          ativo={filtros.responsavel === "akros"}
          onClick={() => aplicarResponsavel("akros")}
        />
        <Indicador
          icon={WalletCards}
          label={t("portfolio.indicatorFinanceLate")}
          valor={totais.financeiroAtrasado}
          tone="text-red-700"
          ativo={filtros.tipoPendencia === "pagamento"}
          onClick={() =>
            setFiltros((atual) => ({
              ...atual,
              tipoPendencia: atual.tipoPendencia === "pagamento" ? undefined : "pagamento",
            }))
          }
        />
        <Indicador
          icon={FileWarning}
          label={t("portfolio.indicatorIncomplete")}
          valor={totais.cadastroIncompleto}
          tone="text-amber-700"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 shadow-subtle lg:flex-row lg:items-center lg:justify-between">
        <form
          className="relative w-full lg:max-w-sm"
          onSubmit={(evento) => {
            evento.preventDefault();
            setFiltros((atual) => ({ ...atual, busca: buscaRascunho || undefined }));
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            type="search"
            placeholder={t("portfolio.searchPlaceholder")}
            value={buscaRascunho}
            onChange={(evento) => setBuscaRascunho(evento.target.value)}
            className="pl-9"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filtros.tipoPendencia ?? ""}
            onChange={(evento) =>
              setFiltros((atual) => ({
                ...atual,
                tipoPendencia: (evento.target.value ||
                  undefined) as FiltrosCarteira["tipoPendencia"],
              }))
            }
          >
            <option value="">{t("portfolio.pendingTypeAll")}</option>
            <option value="documento">{t("portfolio.pendingTypeDocument")}</option>
            <option value="pagamento">{t("portfolio.pendingTypePayment")}</option>
          </Select>
          <Input
            type="date"
            value={filtros.prazoAte ?? ""}
            onChange={(evento) =>
              setFiltros((atual) => ({ ...atual, prazoAte: evento.target.value || undefined }))
            }
          />
        </div>
      </div>

      {carregando ? (
        <Estado mensagem={t("portfolio.loading")} />
      ) : erro ? (
        <Estado mensagem={t("portfolio.loadError")} erro />
      ) : itens.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("portfolio.empty")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
          <div className="divide-y divide-border">
            {itens.map((item) => (
              <LinhaCarteira key={item.clienteId} item={item} />
            ))}
          </div>
        </div>
      )}

      {temMais && (
        <Button
          variant="secondary"
          onClick={() => void carregarMais()}
          loading={carregandoMais}
          disabled={carregandoMais}
          className="self-center"
        >
          {t("portfolio.loadMore")}
        </Button>
      )}
    </div>
  );
}

function LinhaCarteira({ item }: { item: ItemCarteira }) {
  const { t } = useTranslation("admin");
  const pendenciasDocumento = item.documentosFaltantes + item.documentosEmRevisao;
  const pendenciasFinanceiro = item.pagamentosVencidos + item.pagamentosEmConferencia;
  const cadastroIncompleto = item.levantamentoEstado === "incompleto";
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy">{item.clienteNome}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span>{item.faseAtualTitulo ?? t("portfolio.noActiveJourney")}</span>
          {item.programaId && (
            <>
              <span className="text-border">·</span>
              <span>{item.programaId}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {cadastroIncompleto && (
          <Badge variant="warning" data-testid="selo-cadastro-incompleto">
            {t("case.registeredIncomplete")}
          </Badge>
        )}
        {pendenciasDocumento > 0 && (
          <Badge variant="gold" className="gap-1">
            <FileWarning className="h-3 w-3" />
            {pendenciasDocumento}
          </Badge>
        )}
        {pendenciasFinanceiro > 0 && (
          <Badge
            variant={item.situacaoFinanceira === "atrasado" ? "danger" : "neutral"}
            className="gap-1"
          >
            <WalletCards className="h-3 w-3" />
            {pendenciasFinanceiro}
          </Badge>
        )}
        {item.responsavel && (
          <Badge variant={item.responsavel === "cliente" ? "warning" : "navy"}>
            {RESPONSAVEL_LABEL[item.responsavel]}
          </Badge>
        )}
      </div>
    </div>
  );
}

function Indicador({
  icon: Icon,
  label,
  valor,
  tone = "text-navy",
  ativo = false,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  valor: number;
  tone?: string;
  ativo?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border bg-white p-3.5 text-left shadow-subtle transition",
        onClick ? "hover:border-gold-300" : "cursor-default",
        ativo ? "border-gold-400 ring-2 ring-gold-100" : "border-border",
      )}
    >
      <Icon className={cn("h-4 w-4", tone)} />
      <p className={cn("text-xl font-semibold tabular-nums", tone)}>{valor}</p>
      <p className="text-[11px] leading-tight text-ink-muted">{label}</p>
    </button>
  );
}

function Estado({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <Card className="flex items-center gap-3 text-sm text-ink-soft">
      {erro ? (
        <CircleAlert className="h-4 w-4 text-red-600" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      {mensagem}
    </Card>
  );
}
