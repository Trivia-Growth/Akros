import { useMockDb } from "@/mocks/store";
import { Button } from "@/shared/ui";
import { ArrowLeft, Printer } from "lucide-react";
import { Link, useParams } from "react-router-dom";

function formatarValor(valor: number, moeda: "BRL" | "USD"): string {
  return new Intl.NumberFormat(moeda === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso));
}

export function PropostaDocumentoPage() {
  const { id } = useParams<{ id: string }>();
  const propostas = useMockDb((s) => s.propostas);
  const leads = useMockDb((s) => s.leads);
  const clientes = useMockDb((s) => s.clientes);

  const proposta = propostas.find((p) => p.id === id);
  const contato =
    leads.find((l) => l.id === proposta?.leadOuClienteId) ??
    clientes.find((c) => c.id === proposta?.leadOuClienteId);

  if (!proposta) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-sm text-ink-muted">Proposta não encontrada.</p>
        <Link to="/admin/propostas" className="mt-4 inline-block">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/admin/propostas">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Button>
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="mx-auto w-full max-w-[210mm] rounded-xl bg-white p-12 shadow-elevated print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-gold-200 pb-8">
          <div className="flex items-center gap-4">
            <img src="/logo-akros.png" alt="Akros" className="h-14 w-14 rounded-full" />
            <div>
              <p className="font-display text-xl font-semibold text-navy">
                Akros Immigration Solutions
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-gold-700">
                Assessoria de imigração para os Estados Unidos
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
              Proposta comercial
            </p>
            <p className="mt-1 font-mono text-xs text-ink-muted">{proposta.id}</p>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
              Preparado para
            </p>
            <p className="mt-1 font-medium text-navy">
              {contato?.nome ?? proposta.leadOuClienteId}
            </p>
            {contato?.email && <p className="text-ink-soft">{contato.email}</p>}
            <p className="mt-2 text-ink-soft">Tipo de visto: {proposta.tipoVisto}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
              Emitida em
            </p>
            <p className="mt-1 text-navy">{formatarData(proposta.criadoEm)}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-label text-gold-700">
              Válida até
            </p>
            <p className="mt-1 text-navy">{formatarData(proposta.validoAte)}</p>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-label text-gold-700">Escopo</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{proposta.escopo}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {proposta.itensEscopo.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-navy">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-lg bg-navy p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">
            Investimento
          </p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {formatarValor(proposta.valor, proposta.moeda)}
          </p>
          <p className="mt-2 text-sm text-slate-300">{proposta.condicoes}</p>
        </section>

        <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-ink-muted">
          <p>
            Akros Immigration Solutions · Documento gerado digitalmente para fins de proposta
            comercial.
          </p>
        </footer>
      </div>
    </div>
  );
}
