// E13-S15 (ADR-0022) — painel da transcrição de áudio em Configurações: provedor, modelo, idioma e
// chave (write-only), com o aceite explícito de que o áudio do cliente sai do Akros. Ligar exige
// teste de chave+modelo; a transcrição em si só um áudio real prova (homologação).
import { Badge, Button, Card, Checkbox, Input, Modal, Select, toast } from "@/shared/ui";
import { AudioLines, ShieldAlert } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TranscricaoAudioPort } from "../application/ports";
import { useTranscricaoAudio } from "../application/useTranscricaoAudio";
import { ErroCanalEvolution } from "../domain/evolution";
import {
  IDIOMAS_TRANSCRICAO,
  PROVEDORES_TRANSCRICAO,
  type PassoTranscricao,
  type ProvedorTranscricao,
  aceiteVale,
  exigeChave,
  passoDaTranscricao,
} from "../domain/transcricao";

const VARIANTE: Record<PassoTranscricao, "success" | "warning" | "neutral"> = {
  configurar: "neutral",
  testar: "warning",
  ligar: "warning",
  ligada: "success",
};

function mensagemDeErro(
  t: (chave: string, opcoes?: Record<string, unknown>) => string,
  erro: unknown,
): string {
  if (erro instanceof ErroCanalEvolution) {
    return t(`transcricaoAudio.erros.${erro.codigo}`, { defaultValue: erro.message });
  }
  return erro instanceof Error ? erro.message : t("transcricaoAudio.erros.erro");
}

export function TranscricaoAudioPainel({ porta }: { porta?: TranscricaoAudioPort }) {
  const { t } = useTranslation("admin");
  const { config, carregando, erro, recarregar, porta: p } = useTranscricaoAudio(porta);
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState<"salvar" | "testar" | "ligar" | null>(null);

  const [provedor, setProvedor] = useState<ProvedorTranscricao>("groq");
  const [modelo, setModelo] = useState(PROVEDORES_TRANSCRICAO.groq.modeloPadrao);
  const [idioma, setIdioma] = useState("auto");
  const [apiKey, setApiKey] = useState("");
  const [aceite, setAceite] = useState(false);

  const passo = passoDaTranscricao(config);
  const precisaChave = exigeChave(config, provedor);
  const precisaAceite = !aceiteVale(config, provedor);
  const podeSalvar = (!precisaChave || apiKey.trim().length >= 8) && (!precisaAceite || aceite);

  function abrir() {
    const base = config?.provedor ?? "groq";
    setProvedor(base);
    setModelo(config?.modelo ?? PROVEDORES_TRANSCRICAO[base].modeloPadrao);
    setIdioma(config?.idioma ?? "auto");
    setApiKey("");
    setAceite(false);
    setAberto(true);
  }

  function trocarProvedor(novo: ProvedorTranscricao) {
    setProvedor(novo);
    setModelo(PROVEDORES_TRANSCRICAO[novo].modeloPadrao);
  }

  async function executar(acao: typeof ocupado, fn: () => Promise<void>, sucesso: string) {
    setOcupado(acao);
    try {
      await fn();
      toast.success(sucesso);
      return true;
    } catch (causa) {
      toast.error(mensagemDeErro(t, causa));
      return false;
    } finally {
      setOcupado(null);
      await recarregar();
    }
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const ok = await executar(
      "salvar",
      async () => {
        await p.salvar({
          provedor,
          modelo,
          idioma: idioma === "auto" ? null : idioma,
          apiKey: apiKey.trim(),
          aceiteEnvioDados: aceite || !precisaAceite,
        });
        // A chave sai do estado do componente assim que o servidor a recebe.
        setApiKey("");
      },
      t("transcricaoAudio.salvo"),
    );
    if (ok) setAberto(false);
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <AudioLines className="h-4 w-4 text-gold-700" aria-hidden />
        <h2 className="font-display text-base text-navy">{t("transcricaoAudio.titulo")}</h2>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5">
        <p className="max-w-2xl text-sm text-ink-soft">{t("transcricaoAudio.descricao")}</p>

        {carregando && <p className="text-sm text-ink-soft">{t("transcricaoAudio.carregando")}</p>}
        {erro && (
          <p role="alert" className="text-sm text-red-700">
            {t("transcricaoAudio.erroCarregar")}
          </p>
        )}

        {!carregando && !erro && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant={VARIANTE[passo]}>{t(`transcricaoAudio.estados.${passo}`)}</Badge>
              {config && (
                <p className="text-sm text-ink-soft">
                  {t("transcricaoAudio.resumo", {
                    provedor: t(`transcricaoAudio.provedores.${config.provedor}`),
                    modelo: config.modelo,
                    idioma: t(`transcricaoAudio.idiomas.${config.idioma ?? "auto"}`),
                    indicio: config.indicio || "????",
                  })}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={passo === "configurar" ? "primary" : "secondary"}
                onClick={abrir}
              >
                {config ? t("transcricaoAudio.alterar") : t("transcricaoAudio.configurar")}
              </Button>
              {passo === "testar" && (
                <Button
                  size="sm"
                  loading={ocupado === "testar"}
                  onClick={() =>
                    executar("testar", () => p.testar(), t("transcricaoAudio.testeOk"))
                  }
                >
                  {t("transcricaoAudio.testar")}
                </Button>
              )}
              {passo === "ligar" && (
                <Button
                  size="sm"
                  loading={ocupado === "ligar"}
                  onClick={() =>
                    executar("ligar", () => p.definirAtiva(true), t("transcricaoAudio.ligadaOk"))
                  }
                >
                  {t("transcricaoAudio.ligar")}
                </Button>
              )}
              {passo === "ligada" && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={ocupado === "ligar"}
                  onClick={() =>
                    executar(
                      "ligar",
                      () => p.definirAtiva(false),
                      t("transcricaoAudio.desligadaOk"),
                    )
                  }
                >
                  {t("transcricaoAudio.desligar")}
                </Button>
              )}
            </div>

            {passo === "testar" && (
              <p className="text-xs text-ink-soft">{t("transcricaoAudio.ajudaTestar")}</p>
            )}
            {(passo === "ligar" || passo === "ligada") && (
              <p className="text-xs text-ink-soft">{t("transcricaoAudio.ajudaHomologar")}</p>
            )}

            <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t("transcricaoAudio.privacidade")}
            </div>
          </>
        )}
      </div>

      <Modal
        open={aberto}
        onClose={() => ocupado === null && setAberto(false)}
        title={t("transcricaoAudio.modalTitulo")}
        description={t("transcricaoAudio.modalDescricao")}
      >
        <form className="flex flex-col gap-4" onSubmit={salvar}>
          <Select
            label={t("transcricaoAudio.provedorLabel")}
            value={provedor}
            onChange={(e) => trocarProvedor(e.target.value as ProvedorTranscricao)}
          >
            {(Object.keys(PROVEDORES_TRANSCRICAO) as ProvedorTranscricao[]).map((id) => (
              <option key={id} value={id}>
                {t(`transcricaoAudio.provedores.${id}`)}
              </option>
            ))}
          </Select>
          <Select
            label={t("transcricaoAudio.modeloLabel")}
            hint={t("transcricaoAudio.modeloHint")}
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
          >
            {PROVEDORES_TRANSCRICAO[provedor].modelos.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Select
            label={t("transcricaoAudio.idiomaLabel")}
            hint={t("transcricaoAudio.idiomaHint")}
            value={idioma}
            onChange={(e) => setIdioma(e.target.value)}
          >
            {IDIOMAS_TRANSCRICAO.map((i) => (
              <option key={i} value={i}>
                {t(`transcricaoAudio.idiomas.${i}`)}
              </option>
            ))}
          </Select>
          <Input
            type="password"
            autoComplete="new-password"
            required={precisaChave}
            label={t("transcricaoAudio.chaveLabel")}
            hint={
              precisaChave ? t("transcricaoAudio.chaveHint") : t("transcricaoAudio.chaveManter")
            }
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          {precisaAceite && (
            <Checkbox
              label={t("transcricaoAudio.aceite", {
                provedor: t(`transcricaoAudio.provedores.${provedor}`),
              })}
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={ocupado !== null}
              onClick={() => setAberto(false)}
            >
              {t("transcricaoAudio.cancelar")}
            </Button>
            <Button type="submit" loading={ocupado === "salvar"} disabled={!podeSalvar}>
              {t("transcricaoAudio.salvar")}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
