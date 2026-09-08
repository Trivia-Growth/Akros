import { Badge, Card } from "@/shared/ui";
import { CircleAlert, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { usePropostasSupabase } from "../application/usePropostasSupabase";

const STATUS_VARIANT = {
  rascunho: "neutral",
  enviada: "navy",
  aceita: "success",
  recusada: "danger",
} as const;

export function PropostasRealPage() {
  const { t } = useTranslation("admin");
  const { propostas, contatos, carregando, erro } = usePropostasSupabase();

  if (carregando) return <EstadoPropostas mensagem="Carregando propostas reais…" />;
  if (erro) return <EstadoPropostas mensagem="Não foi possível carregar propostas." erro />;

  const contatosPorId = new Map(contatos.map((contato) => [contato.id, contato]));
  return (
    <div className="flex flex-col gap-6" data-testid="propostas-real">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("proposals.title")}</h1>
        <p className="text-sm text-ink-soft">{t("proposals.subtitle")}</p>
      </div>

      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
        <p>
          Criar, enviar e alterar status aguardam RPC segura de proposta. Esta tela não grava
          propostas diretamente pelo navegador.
        </p>
      </Card>

      {propostas.length === 0 ? (
        <Card className="text-sm text-ink-muted">Nenhuma proposta real registrada ainda.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {propostas.map((proposta) => {
            const contato = contatosPorId.get(proposta.leadOuClienteId);
            return (
              <Card key={proposta.id} data-testid="proposta-real">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {contato?.nome ?? proposta.leadOuClienteId}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">{proposta.tipoVisto}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[proposta.status]}>
                    {t(`proposals.status_${proposta.status}`)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-ink-soft">{proposta.escopo}</p>
                <p className="mt-2 font-display text-lg font-semibold text-navy">
                  {formatarValor(proposta.valor, proposta.moeda)}
                </p>
                <Link
                  to={`/admin/propostas/${proposta.id}`}
                  className="mt-4 inline-flex text-sm font-medium text-navy hover:text-gold-700"
                >
                  Ver documento
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EstadoPropostas({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Propostas</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        <CircleAlert className={`h-4 w-4 ${erro ? "text-red-600" : "text-navy"}`} />
        {mensagem}
      </Card>
    </div>
  );
}

function formatarValor(valor: number, moeda: "BRL" | "USD"): string {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}
