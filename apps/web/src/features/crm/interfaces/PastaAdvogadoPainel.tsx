import { obterCasoComandosReal } from "@/app/real-repositories";
import { useIntegracaoOneDrive } from "@/features/configuracoes/application/useIntegracaoOneDrive";
import { Button, Card, Input } from "@/shared/ui";
import { useState } from "react";

/** E04-S17 — pasta separada da operacional, só com documentos marcados como compartilháveis
 *  (ListaDocumentos). Advogado nunca recebe login — a pasta é compartilhada fora do sistema,
 *  pelo painel nativo da Microsoft (fora de escopo desta entrega, ver SECURITY_DEBT). */
export function PastaAdvogadoPainel({ clienteId }: { clienteId: string }) {
  const { integracao } = useIntegracaoOneDrive();
  const [folderItemId, setFolderItemId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function vincular() {
    if (!integracao || integracao.estado !== "conectada" || !folderItemId.trim()) return;
    setSalvando(true);
    setMensagem(null);
    try {
      await obterCasoComandosReal().vincularPastaAdvogado({
        clienteId,
        integracaoId: integracao.id,
        folderItemId: folderItemId.trim(),
        idempotencyKey: crypto.randomUUID(),
      });
      setMensagem("Pasta do advogado vinculada.");
    } catch {
      setMensagem("Não foi possível vincular. Confira se a pasta operacional já existe.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-navy">Pasta do advogado parceiro</p>
      <p className="text-xs text-ink-muted">
        Separada da pasta operacional — só os documentos marcados como compartilháveis entram aqui.
        O advogado nunca recebe acesso ao sistema; a pasta é compartilhada com ele fora daqui, pelo
        painel do OneDrive.
      </p>
      <Input
        label="ID da pasta no OneDrive"
        value={folderItemId}
        onChange={(e) => setFolderItemId(e.target.value)}
      />
      <Button
        onClick={() => void vincular()}
        disabled={salvando || !folderItemId.trim()}
        loading={salvando}
      >
        Vincular pasta do advogado
      </Button>
      {mensagem && <p className="text-xs text-ink-soft">{mensagem}</p>}
    </Card>
  );
}
