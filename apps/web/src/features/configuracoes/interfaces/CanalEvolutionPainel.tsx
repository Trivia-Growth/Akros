// E13-S15 — painel do canal WhatsApp via Evolution em Configurações: servidor (com versão provada),
// números, instância + webhook, QR e estado. Segredos são write-only: a chave do servidor entra por
// um campo de senha, vai ao servidor uma vez e o campo é esvaziado; ela nunca volta à tela.
import { Badge, Button, Card, Checkbox, Input, Modal, Textarea, toast } from "@/shared/ui";
import { MessageCircle, ServerCog, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EvolutionCanalPort } from "../application/ports";
import { useEvolutionCanal } from "../application/useEvolutionCanal";
import {
  CAPACIDADES_OBRIGATORIAS,
  CAPACIDADE_DE_ENVIO,
  type ServidorEvolution,
} from "../domain/evolution";
import type { AgenteIAIntegracao } from "../domain/types";
import { CanalEvolutionLinha, mensagemDeErro } from "./CanalEvolutionLinha";

const VARIANTE_SERVIDOR: Record<ServidorEvolution["estado"], "success" | "danger" | "neutral"> = {
  compativel: "success",
  incompativel: "danger",
  pendente: "neutral",
};

const CAPACIDADES_REGISTRAVEIS = [...CAPACIDADES_OBRIGATORIAS, CAPACIDADE_DE_ENVIO] as const;

export function CanalEvolutionPainel({
  agentes,
  porta,
}: {
  agentes: AgenteIAIntegracao[];
  /** Injeção para teste; em produção vem do composition root real. */
  porta?: EvolutionCanalPort;
}) {
  const { t } = useTranslation("admin");
  const {
    servidor,
    compatibilidade,
    canais,
    carregando,
    erro,
    recarregar,
    porta: p,
  } = useEvolutionCanal(porta);
  const [modal, setModal] = useState<"servidor" | "compat" | "canal" | null>(null);
  const [enviando, setEnviando] = useState(false);

  // formulários
  const [urlBase, setUrlBase] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [versao, setVersao] = useState("");
  const [capacidades, setCapacidades] = useState<string[]>([]);
  const [afetadaLogout, setAfetadaLogout] = useState(false);
  const [evidencia, setEvidencia] = useState("");
  const [nomeCanal, setNomeCanal] = useState("WhatsApp Akros");
  const [numeroCanal, setNumeroCanal] = useState("");

  async function enviar(evento: FormEvent, fn: () => Promise<void>) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await fn();
      setModal(null);
    } catch (causa) {
      toast.error(mensagemDeErro(t, causa));
    } finally {
      setEnviando(false);
      await recarregar();
    }
  }

  const salvarServidor = (e: FormEvent) =>
    enviar(e, async () => {
      const r = await p.salvarServidor(urlBase.trim(), apiKey.trim());
      // A chave sai do estado do componente assim que o servidor a recebe.
      setApiKey("");
      if (r.estado === "compativel")
        toast.success(t("canalEvolution.servidor.salvoCompativel", { versao: r.versao }));
      else toast.info(t("canalEvolution.servidor.salvoIncompativel", { versao: r.versao }));
    });

  const registrar = (e: FormEvent) =>
    enviar(e, async () => {
      const r = await p.registrarCompatibilidade({
        versao: versao.trim(),
        capacidades,
        afetadaLogout,
        evidencia: evidencia.trim(),
      });
      if (r.compativel) toast.success(t("canalEvolution.compat.registrada"));
      else toast.success(t("canalEvolution.compat.registradaParcial"));
    });

  const criarCanal = (e: FormEvent) =>
    enviar(e, async () => {
      await p.criarCanal(nomeCanal.trim(), numeroCanal);
      setNumeroCanal("");
      toast.success(t("canalEvolution.novoCanal.criado"));
    });

  function abrirCompat() {
    setVersao(servidor?.versao ?? "");
    const atual = compatibilidade.find((c) => c.versao === servidor?.versao);
    setCapacidades(atual?.capacidades ?? []);
    setAfetadaLogout(atual?.afetadaLogout ?? false);
    setEvidencia(atual?.evidencia ?? "");
    setModal("compat");
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <MessageCircle className="h-4 w-4 text-gold-700" aria-hidden />
        <h2 className="font-display text-base text-navy">{t("canalEvolution.titulo")}</h2>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        <p className="max-w-2xl text-sm text-ink-soft">{t("canalEvolution.descricao")}</p>

        {carregando && <p className="text-sm text-ink-soft">{t("canalEvolution.carregando")}</p>}
        {erro && (
          <p role="alert" className="text-sm text-red-700">
            {t("canalEvolution.erroCarregar")}
          </p>
        )}

        {!carregando && !erro && (
          <>
            <section
              aria-label={t("canalEvolution.servidor.titulo")}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-medium text-navy">
                  <ServerCog className="h-4 w-4" aria-hidden />
                  {t("canalEvolution.servidor.titulo")}
                </h3>
                {servidor && (
                  <Badge variant={VARIANTE_SERVIDOR[servidor.estado]}>
                    {t(`canalEvolution.servidor.estados.${servidor.estado}`)}
                  </Badge>
                )}
              </div>

              {servidor ? (
                <div className="flex flex-col gap-2 text-sm">
                  <p className="text-ink-soft">
                    {servidor.urlBase} · {t("canalEvolution.servidor.versao")}{" "}
                    {servidor.versao ?? "?"} ·{" "}
                    {t("canalEvolution.servidor.chaveFinal", {
                      indicio: servidor.indicio || "????",
                    })}
                  </p>
                  {servidor.estado === "incompativel" && (
                    <div
                      role="alert"
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                    >
                      <p>{servidor.motivo}</p>
                      <p className="mt-1">{t("canalEvolution.servidor.smokeAjuda")}</p>
                      <code className="mt-1 block break-all text-[11px]">
                        EVOLUTION_URL=… EVOLUTION_APIKEY=… deno run --allow-net --allow-env
                        scripts/evolution-contract-smoke.ts
                      </code>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-soft">{t("canalEvolution.servidor.nenhum")}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={servidor ? "secondary" : "primary"}
                  onClick={() => setModal("servidor")}
                >
                  {servidor
                    ? t("canalEvolution.servidor.trocar")
                    : t("canalEvolution.servidor.configurar")}
                </Button>
                {servidor && (
                  <Button size="sm" variant="secondary" onClick={abrirCompat}>
                    {t("canalEvolution.servidor.registrar")}
                  </Button>
                )}
              </div>
            </section>

            <section
              aria-label={t("canalEvolution.numeros.titulo")}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-navy">
                  {t("canalEvolution.numeros.titulo")}
                </h3>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={servidor?.estado !== "compativel"}
                  onClick={() => setModal("canal")}
                >
                  {t("canalEvolution.numeros.adicionar")}
                </Button>
              </div>
              {servidor?.estado !== "compativel" && (
                <p className="text-xs text-ink-soft">{t("canalEvolution.numeros.exigeServidor")}</p>
              )}
              {canais.length === 0 ? (
                <p className="text-sm text-ink-soft">{t("canalEvolution.numeros.nenhum")}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {canais.map((canal) => (
                    <CanalEvolutionLinha
                      key={canal.id}
                      canal={canal}
                      porta={p}
                      servidor={servidor}
                      matriz={compatibilidade}
                      agentes={agentes}
                      aoMudar={recarregar}
                    />
                  ))}
                </ul>
              )}
            </section>

            <div className="flex gap-2 rounded-lg bg-cream-100 px-3 py-2.5 text-xs text-ink-soft">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
              {t("canalEvolution.seguranca")}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modal === "servidor"}
        onClose={() => !enviando && setModal(null)}
        title={t("canalEvolution.servidor.modalTitulo")}
        description={t("canalEvolution.servidor.modalDescricao")}
      >
        <form className="flex flex-col gap-4" onSubmit={salvarServidor}>
          <Input
            required
            type="url"
            label={t("canalEvolution.servidor.urlLabel")}
            placeholder="https://evolution.suaempresa.com"
            value={urlBase}
            onChange={(e) => setUrlBase(e.target.value)}
          />
          <Input
            required
            type="password"
            autoComplete="new-password"
            label={t("canalEvolution.servidor.chaveLabel")}
            hint={t("canalEvolution.servidor.chaveHint")}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModal(null)}
              disabled={enviando}
            >
              {t("canalEvolution.cancelar")}
            </Button>
            <Button type="submit" loading={enviando}>
              {t("canalEvolution.servidor.salvar")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modal === "compat"}
        onClose={() => !enviando && setModal(null)}
        title={t("canalEvolution.compat.titulo")}
        description={t("canalEvolution.compat.descricao")}
      >
        <form className="flex flex-col gap-4" onSubmit={registrar}>
          <Input
            required
            label={t("canalEvolution.compat.versao")}
            value={versao}
            onChange={(e) => setVersao(e.target.value)}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-navy">
              {t("canalEvolution.compat.capacidades")}
            </legend>
            {CAPACIDADES_REGISTRAVEIS.map((c) => (
              <Checkbox
                key={c}
                label={t(`canalEvolution.compat.cap.${c}`)}
                checked={capacidades.includes(c)}
                onChange={(e) =>
                  setCapacidades((atual) =>
                    e.target.checked ? [...atual, c] : atual.filter((x) => x !== c),
                  )
                }
              />
            ))}
          </fieldset>
          <Checkbox
            label={t("canalEvolution.compat.afetadaLogout")}
            checked={afetadaLogout}
            onChange={(e) => setAfetadaLogout(e.target.checked)}
          />
          <Textarea
            required
            label={t("canalEvolution.compat.evidencia")}
            hint={t("canalEvolution.compat.evidenciaHint")}
            value={evidencia}
            onChange={(e) => setEvidencia(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModal(null)}
              disabled={enviando}
            >
              {t("canalEvolution.cancelar")}
            </Button>
            <Button type="submit" loading={enviando}>
              {t("canalEvolution.compat.registrar")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modal === "canal"}
        onClose={() => !enviando && setModal(null)}
        title={t("canalEvolution.novoCanal.titulo")}
        description={t("canalEvolution.novoCanal.descricao")}
      >
        <form className="flex flex-col gap-4" onSubmit={criarCanal}>
          <Input
            required
            label={t("canalEvolution.novoCanal.nome")}
            value={nomeCanal}
            onChange={(e) => setNomeCanal(e.target.value)}
          />
          <Input
            required
            inputMode="tel"
            label={t("canalEvolution.novoCanal.numero")}
            hint={t("canalEvolution.novoCanal.numeroHint")}
            placeholder="5511999999999"
            value={numeroCanal}
            onChange={(e) => setNumeroCanal(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModal(null)}
              disabled={enviando}
            >
              {t("canalEvolution.cancelar")}
            </Button>
            <Button type="submit" loading={enviando}>
              {t("canalEvolution.novoCanal.criar")}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
