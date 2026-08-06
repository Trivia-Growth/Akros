import { container } from "@/app/di";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import {
  useDocumentosCliente,
  useSolicitacoesAssinatura,
} from "@/features/documentos/application/hooks";
import { useJornadaAtiva } from "@/features/jornada/application/hooks";
import { Badge, Button, Card, Input, Modal, toast } from "@/shared/ui";
import { FileText, PenLine, Upload } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const STATUS_VARIANT = {
  pendente: "neutral",
  enviado: "navy",
  em_analise: "gold",
  aprovado: "success",
  ajustes: "warning",
} as const;

export function DocumentosPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const jornada = useJornadaAtiva();
  const documentos = useDocumentosCliente(cliente?.id);
  const solicitacoes = useSolicitacoesAssinatura(documentos.map((d) => d.id));
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const faseNome = (faseId?: string) => jornada?.fases.find((f) => f.id === faseId)?.titulo ?? "—";

  async function handleUpload(documentoId: string) {
    if (uploadingId) return;
    setUploadingId(documentoId);
    try {
      await container.documentos.registrarEnvio(documentoId, `/mock-files/${documentoId}.pdf`);
      toast.success(t("documents.uploaded"));
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("documents.title")}</h1>
        <p className="text-sm text-ink-soft">{t("documents.subtitle")}</p>
      </div>

      <Card>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("documents.rulesTitle")}
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-ink-soft">
          <li>{t("documents.rule1")}</li>
          <li>{t("documents.rule2")}</li>
          <li>{t("documents.rule3")}</li>
          <li>{t("documents.rule4")}</li>
        </ul>
      </Card>

      {documentos.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("documents.noDocuments")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {documentos.map((doc) => {
            const solicitacao = solicitacoes.find((s) => s.documentoId === doc.id);
            return (
              <Card
                key={doc.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy">
                    <FileText className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{doc.nome}</p>
                    <p className="text-xs text-ink-muted">{faseNome(doc.faseId)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_VARIANT[doc.status]}>
                    {t(`common:status.${statusI18nKey(doc.status)}`)}
                  </Badge>
                  {doc.status === "pendente" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={uploadingId === doc.id}
                      disabled={uploadingId === doc.id}
                      onClick={() => handleUpload(doc.id)}
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                      {uploadingId === doc.id ? t("documents.uploading") : t("documents.upload")}
                    </Button>
                  )}
                  {solicitacao && <SignatureAction solicitacao={solicitacao} />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusI18nKey(status: string): string {
  const map: Record<string, string> = {
    pendente: "pending",
    enviado: "sent",
    em_analise: "underReview",
    aprovado: "approved",
    ajustes: "needsChanges",
  };
  return map[status] ?? "pending";
}

interface SignatureActionProps {
  solicitacao: { id: string; status: string };
}

function SignatureAction({ solicitacao }: SignatureActionProps) {
  const { t } = useTranslation("portal");
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [signing, setSigning] = useState(false);

  if (solicitacao.status === "assinado") {
    return <Badge variant="success">{t("documents.signatureTitle")}: ✓</Badge>;
  }

  async function handleConfirmar() {
    if (!nome.trim() || signing) return;
    setSigning(true);
    try {
      await container.assinatura.assinar(solicitacao.id, nome.trim());
      setModalOpen(false);
      toast.success(t("documents.uploaded"));
    } finally {
      setSigning(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="gold" onClick={() => setModalOpen(true)}>
        <PenLine className="h-3.5 w-3.5" aria-hidden />
        {t("documents.sign")}
      </Button>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("documents.signModalTitle")}
        description={t("documents.signModalDescription")}
      >
        <div className="flex flex-col gap-4">
          <Input
            placeholder={t("documents.signNamePlaceholder")}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} loading={signing} disabled={signing || !nome.trim()}>
              {t("documents.signConfirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
