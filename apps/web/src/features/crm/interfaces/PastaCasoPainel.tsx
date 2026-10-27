import { Button, Card, Input } from "@/shared/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePastaCaso } from "../application/usePastaCaso";

export function PastaCasoPainel({
  clienteId,
  jornadaId,
}: { clienteId: string; jornadaId: string }) {
  const { t } = useTranslation("admin");
  const pasta = usePastaCaso(clienteId, jornadaId);
  const [folderItemId, setFolderItemId] = useState("");
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-navy">{t("case.folderTitle")}</p>
      {pasta.carregando ? (
        <p>{t("case.folderLoading")}</p>
      ) : pasta.vinculo ? (
        <p>
          {t("case.folderLinked")}: {pasta.vinculo.folderItemId} ({pasta.vinculo.estado})
        </p>
      ) : pasta.erro === "case.folderReadError" ? null : !pasta.conectada ? (
        <p>{t("case.folderNeedsConnection")}</p>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void pasta.vincular(folderItemId.trim());
          }}
        >
          <p className="text-sm text-ink-soft">{t("case.folderHelp")}</p>
          <Input
            label={t("case.folderItemId")}
            value={folderItemId}
            onChange={(e) => setFolderItemId(e.target.value)}
          />
          <Button type="submit" disabled={pasta.salvando || !folderItemId.trim()}>
            {t("case.linkFolder")}
          </Button>
        </form>
      )}
      {pasta.erro && <p role="alert">{t(pasta.erro)}</p>}
    </Card>
  );
}
