import { Badge, Card } from "@/shared/ui";
import { CircleAlert, FileText, LockKeyhole, PenLine } from "lucide-react";
import { useDocumentosClienteReal } from "../application/real-hooks";
import type { Documento } from "../domain/types";

const STATUS_VARIANT = {
  pendente: "neutral",
  enviado: "navy",
  em_analise: "gold",
  aprovado: "success",
  ajustes: "warning",
} as const;

export function DocumentosRealPage() {
  const { documentos, solicitacoes, carregando, erro } = useDocumentosClienteReal();

  if (carregando) return <EstadoDocumentos mensagem="Carregando documentos reais…" />;
  if (erro) return <EstadoDocumentos mensagem="Não foi possível carregar documentos." erro />;

  return (
    <div className="flex flex-col gap-8" data-testid="documentos-real">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Documentos</h1>
        <p className="text-sm text-ink-soft">Documentos vinculados ao seu processo.</p>
      </div>

      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
        <p>
          Upload e assinatura aguardam fluxo seguro de arquivo e assinatura. Esta tela não envia
          dados nem atualiza status diretamente pelo navegador.
        </p>
      </Card>

      {documentos.length === 0 ? (
        <Card className="text-sm text-ink-muted">Nenhum documento real solicitado ainda.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {documentos.map((documento) => {
            const assinatura = solicitacoes.find(
              (solicitacao) => solicitacao.documentoId === documento.id,
            );
            return (
              <DocumentoCard key={documento.id} documento={documento} assinatura={assinatura} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocumentoCard({
  documento,
  assinatura,
}: {
  documento: Documento;
  assinatura: { status: string; assinadoPor?: string } | undefined;
}) {
  return (
    <Card className="flex flex-col gap-4" data-testid="documento-real">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy">
            <FileText className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-navy">{documento.nome}</p>
            <p className="text-xs text-ink-muted">{documento.tipo.replaceAll("_", " ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[documento.status]}>{rotuloStatus(documento.status)}</Badge>
          {assinatura && (
            <Badge variant={assinatura.status === "assinado" ? "success" : "gold"}>
              <PenLine className="h-3.5 w-3.5" aria-hidden />
              {assinatura.status === "assinado"
                ? `Assinado${assinatura.assinadoPor ? ` por ${assinatura.assinadoPor}` : ""}`
                : "Assinatura pendente"}
            </Badge>
          )}
        </div>
      </div>

      {documento.analise && (
        <div className="rounded-md border border-border bg-cream-100 px-4 py-3 text-sm text-ink-soft">
          <p className="font-medium text-navy">
            Parecer registrado: {documento.analise.aderencia.replaceAll("_", " ")}
          </p>
          {documento.analise.lacunas.length > 0 && (
            <p className="mt-1 text-xs text-ink-muted">
              {documento.analise.lacunas.length} lacuna(s) apontada(s) na análise.
            </p>
          )}
        </div>
      )}
      {documento.decisao && (
        <p className="text-xs text-ink-muted">
          Decisão humana: {documento.decisao.decisao} por {documento.decisao.autor}.
        </p>
      )}
    </Card>
  );
}

function rotuloStatus(status: Documento["status"]): string {
  const rotulos: Record<Documento["status"], string> = {
    pendente: "Pendente",
    enviado: "Enviado",
    em_analise: "Em análise",
    aprovado: "Aprovado",
    ajustes: "Ajustes necessários",
  };
  return rotulos[status];
}

function EstadoDocumentos({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Documentos</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? <CircleAlert className="h-4 w-4 text-red-600" /> : <FileText className="h-4 w-4" />}
        {mensagem}
      </Card>
    </div>
  );
}
