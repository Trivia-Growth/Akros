import { Badge, Button, Card, Modal } from "@/shared/ui";
import { CircleAlert, Copy, LockKeyhole, Wallet } from "lucide-react";
import { useState } from "react";
import { usePagamentosClienteReal } from "../application/real-hooks";
import type { DadosRecebimento, Pagamento } from "../domain/types";

const STATUS_VARIANT = {
  pendente: "gold",
  em_conferencia: "navy",
  pago: "success",
  divergente: "danger",
  atrasado: "danger",
} as const;

export function PagamentosRealPage() {
  const { pagamentos, dadosRecebimento, carregando, erro } = usePagamentosClienteReal();
  const [selecionado, setSelecionado] = useState<Pagamento | null>(null);
  const totalPago = pagamentos.filter((pagamento) => pagamento.status === "pago").length;
  const totalPendente = pagamentos.filter((pagamento) => pagamento.status === "pendente").length;
  const proximoVencimento = pagamentos.find((pagamento) => pagamento.status === "pendente");

  if (carregando) return <EstadoPagamentos mensagem="Carregando pagamentos reais…" />;
  if (erro) return <EstadoPagamentos mensagem="Não foi possível carregar pagamentos." erro />;

  return (
    <div className="flex flex-col gap-8" data-testid="pagamentos-real">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Pagamentos</h1>
        <p className="text-sm text-ink-soft">Valores e instruções vinculados ao seu processo.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Resumo label="Pagamentos confirmados" valor={String(totalPago)} />
        <Resumo label="Pagamentos pendentes" valor={String(totalPendente)} />
        <Resumo
          label="Próximo vencimento"
          valor={proximoVencimento ? formatarData(proximoVencimento.vencimento) : "Sem previsão"}
        />
      </div>

      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
        <p>
          Anexar comprovante aguarda fluxo seguro de arquivo e conciliação. Esta tela não grava
          pagamentos nem comprovantes diretamente pelo navegador.
        </p>
      </Card>

      {pagamentos.length === 0 ? (
        <Card className="text-sm text-ink-muted">Nenhum pagamento real registrado ainda.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {pagamentos.map((pagamento) => {
            const dados = dadosRecebimento.find((item) => item.moeda === pagamento.moeda);
            return (
              <Card
                key={pagamento.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                data-testid="pagamento-real"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy">
                    <Wallet className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{pagamento.descricao}</p>
                    <p className="text-xs text-ink-muted">
                      {formatarValor(pagamento.valor, pagamento.moeda)} · vencimento{" "}
                      {formatarData(pagamento.vencimento)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={STATUS_VARIANT[pagamento.status]}>
                    {rotuloStatus(pagamento.status)}
                  </Badge>
                  {pagamento.status === "pendente" && dados && (
                    <Button size="sm" variant="secondary" onClick={() => setSelecionado(pagamento)}>
                      Ver dados de transferência
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selecionado && (
        <TransferenciaModal
          pagamento={selecionado}
          dados={dadosRecebimento.find((item) => item.moeda === selecionado.moeda)}
          onClose={() => setSelecionado(null)}
        />
      )}
    </div>
  );
}

function TransferenciaModal({
  pagamento,
  dados,
  onClose,
}: {
  pagamento: Pagamento;
  dados: DadosRecebimento | undefined;
  onClose: () => void;
}) {
  if (!dados) return null;
  const campos: [string, string | undefined][] = [
    ["Titular", dados.titular],
    ["Banco", dados.banco],
    ["Agência", dados.agencia],
    ["Conta", dados.conta],
    ["Chave Pix", dados.chavePix],
    ["Routing number", dados.routingNumber],
    ["Account number", dados.accountNumber],
    ["SWIFT", dados.swift],
  ];
  const copiar = async (valor: string | undefined) => {
    if (valor) await navigator.clipboard?.writeText(valor).catch(() => undefined);
  };
  return (
    <Modal open onClose={onClose} title="Dados de transferência" description={pagamento.descricao}>
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2 rounded-md border border-border p-3">
          {campos
            .filter(([, valor]) => valor)
            .map(([rotulo, valor]) => (
              <li key={rotulo} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-muted">{rotulo}</span>
                <button
                  type="button"
                  onClick={() => copiar(valor)}
                  className="inline-flex items-center gap-2 font-medium text-navy hover:text-gold-700"
                >
                  {valor}
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
        </ul>
        <p className="text-xs text-ink-muted">{dados.instrucoes}</p>
        <p className="text-xs font-medium text-navy">Identificador: {pagamento.id}</p>
      </div>
    </Modal>
  );
}

function Resumo({ label, valor }: { label: string; valor: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{valor}</p>
    </Card>
  );
}

function EstadoPagamentos({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Pagamentos</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? <CircleAlert className="h-4 w-4 text-red-600" /> : <Wallet className="h-4 w-4" />}
        {mensagem}
      </Card>
    </div>
  );
}

function formatarValor(valor: number, moeda: Pagamento["moeda"]): string {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

function formatarData(data: string): string {
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR");
}

function rotuloStatus(status: Pagamento["status"]): string {
  const rotulos: Record<Pagamento["status"], string> = {
    pendente: "Pendente",
    em_conferencia: "Em conferência",
    pago: "Pago",
    divergente: "Divergente",
    atrasado: "Atrasado",
  };
  return rotulos[status];
}
