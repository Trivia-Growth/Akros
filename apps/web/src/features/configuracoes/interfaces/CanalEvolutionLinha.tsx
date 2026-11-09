// E13-S15 — uma linha de canal Evolution: estado, próximo passo, QR e operação.
// Regras de tela: UM passo principal por vez; sem botão de "reiniciar por logout" (FR-019); o QR
// existe só na memória deste componente (nunca em storage, log ou URL); nada de segredo.
import { Badge, Button, Checkbox, Input, Select, toast } from "@/shared/ui";
import { CheckCircle2, CircleAlert, Loader2, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EvolutionCanalPort } from "../application/ports";
import {
  type CanalEvolution,
  type CompatibilidadeEvolution,
  ErroCanalEvolution,
  type EstadoConexao,
  type ServidorEvolution,
  envioProvado,
  proximoPasso,
  versaoAfetadaPorLogout,
} from "../domain/evolution";
import type { AgenteIAIntegracao } from "../domain/types";

const VARIANTE: Record<EstadoConexao, "neutral" | "warning" | "success" | "danger"> = {
  sem_credencial: "neutral",
  configuracao_incompleta: "warning",
  aguardando_pareamento: "warning",
  conectado_verificado: "success",
  desconectado: "danger",
  erro: "danger",
};

const INTERVALO_CONSULTA_MS = 4_000;

/** `base64` cru, data URI ou outra coisa (ex.: o texto `2@…` do código): só os dois primeiros viram imagem. */
export function srcDoQr(valor: string): string | null {
  if (valor.startsWith("data:image/")) return valor;
  return /^[A-Za-z0-9+/=\s]{200,}$/.test(valor)
    ? `data:image/png;base64,${valor.replace(/\s/g, "")}`
    : null;
}

export function mensagemDeErro(
  t: (chave: string, opcoes?: Record<string, unknown>) => string,
  erro: unknown,
): string {
  if (erro instanceof ErroCanalEvolution) {
    return t(`canalEvolution.erros.${erro.codigo}`, { defaultValue: erro.message });
  }
  return erro instanceof Error ? erro.message : t("canalEvolution.erros.erro");
}

interface Props {
  canal: CanalEvolution;
  porta: EvolutionCanalPort;
  servidor: ServidorEvolution | null;
  matriz: CompatibilidadeEvolution[];
  agentes: AgenteIAIntegracao[];
  aoMudar: () => Promise<void>;
}

export function CanalEvolutionLinha({ canal, porta, servidor, matriz, agentes, aoMudar }: Props) {
  const { t } = useTranslation("admin");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);
  const [qr, setQr] = useState<{ src: string | null; expiraEm: number } | null>(null);
  const [numeroTeste, setNumeroTeste] = useState("");
  const [agenteId, setAgenteId] = useState(agentes[0]?.id ?? "");
  const aoMudarRef = useRef(aoMudar);
  aoMudarRef.current = aoMudar;

  const passo = proximoPasso(canal.estadoConexao);
  const riscoAceito = canal.aceiteRiscoEm !== null;
  const podeAtivar = envioProvado(servidor, matriz);
  const afetadaLogout = versaoAfetadaPorLogout(servidor, matriz);

  async function executar(chave: string, fn: () => Promise<void>, sucesso?: string) {
    setOcupado(chave);
    setAviso(null);
    try {
      await fn();
      if (sucesso) toast.success(sucesso);
    } catch (causa) {
      toast.error(mensagemDeErro(t, causa));
    } finally {
      setOcupado(null);
      await aoMudarRef.current();
    }
  }

  // Enquanto o QR está na tela, confere a conexão a cada poucos segundos e some quando vale/expira.
  useEffect(() => {
    if (!qr) return;
    const expirar = setTimeout(() => setQr(null), Math.max(0, qr.expiraEm - Date.now()));
    const consulta = setInterval(async () => {
      try {
        const r = await porta.consultarEstado(canal.id);
        if (r.estado === "conectado_verificado") {
          setQr(null);
          toast.success(t("canalEvolution.canal.conectado"));
          await aoMudarRef.current();
        } else if (r.numeroDivergente) {
          setQr(null);
          setAviso(t("canalEvolution.canal.numeroDivergente"));
          await aoMudarRef.current();
        }
      } catch {
        // Falha passageira de consulta: tenta de novo no próximo ciclo; o QR expira sozinho.
      }
    }, INTERVALO_CONSULTA_MS);
    return () => {
      clearTimeout(expirar);
      clearInterval(consulta);
    };
  }, [qr, porta, canal.id, t]);

  async function preparar() {
    await executar(
      "preparar",
      async () => {
        if (canal.estadoConexao === "sem_credencial") await porta.criarInstancia(canal.id);
        await porta.instalarWebhook(canal.id);
      },
      t("canalEvolution.canal.preparado"),
    );
  }

  async function gerarQr() {
    await executar("qr", async () => {
      if (!riscoAceito) await porta.aceitarRisco(canal.id);
      const r = await porta.gerarQr(canal.id);
      setQr({ src: srcDoQr(r.qrBase64), expiraEm: Date.parse(r.expiraEm) });
    });
  }

  return (
    <li
      className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3"
      data-testid={`canal-${canal.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-navy">{canal.nomeExibicao}</p>
          <p className="text-xs text-ink-soft">+{canal.numero}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={VARIANTE[canal.estadoConexao]}>
            {t(`canalEvolution.estados.${canal.estadoConexao}`)}
          </Badge>
          {canal.ativa && <Badge variant="gold">{t("canalEvolution.canal.ativo")}</Badge>}
        </div>
      </div>

      {canal.ultimoErroCodigo && canal.estadoConexao !== "conectado_verificado" && (
        <p role="alert" className="flex items-start gap-2 text-xs text-red-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t(`canalEvolution.erros.${canal.ultimoErroCodigo}`, {
            defaultValue: t("canalEvolution.erros.erro"),
          })}
        </p>
      )}
      {aviso && (
        <p role="alert" className="flex items-start gap-2 text-xs text-amber-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {aviso}
        </p>
      )}

      {passo === "preparar" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-soft">{t("canalEvolution.canal.prepararAjuda")}</p>
          <div>
            <Button
              size="sm"
              onClick={preparar}
              loading={ocupado === "preparar"}
              disabled={servidor?.estado !== "compativel"}
            >
              {canal.estadoConexao === "sem_credencial"
                ? t("canalEvolution.canal.preparar")
                : t("canalEvolution.canal.retomar")}
            </Button>
          </div>
        </div>
      )}

      {passo === "parear" && (
        <div className="flex flex-col gap-3">
          {riscoAceito ? (
            <p className="text-xs text-ink-soft">{t("canalEvolution.canal.riscoAceito")}</p>
          ) : (
            <Checkbox
              label={t("canalEvolution.canal.riscoLabel")}
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
            />
          )}
          {qr ? (
            <div className="flex flex-col items-start gap-2">
              {qr.src ? (
                <img
                  src={qr.src}
                  alt={t("canalEvolution.canal.qrAlt")}
                  className="h-56 w-56 rounded-md border border-border bg-white p-2"
                />
              ) : (
                <p role="alert" className="text-xs text-red-700">
                  {t("canalEvolution.canal.qrFormato")}
                </p>
              )}
              <p className="flex items-center gap-2 text-xs text-ink-soft">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {t("canalEvolution.canal.qrAguardando")}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={gerarQr}
                loading={ocupado === "qr"}
                disabled={!riscoAceito && !aceite}
              >
                <QrCode className="h-4 w-4" aria-hidden />
                {t("canalEvolution.canal.gerarQr")}
              </Button>
            </div>
          )}
        </div>
      )}

      {passo === "operar" && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t("canalEvolution.canal.verificado")}
          </p>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label={t("canalEvolution.canal.testeLabel")}
              hint={
                podeAtivar
                  ? t("canalEvolution.canal.testeProvado")
                  : t("canalEvolution.canal.testeHint")
              }
              inputMode="tel"
              placeholder="5511999999999"
              value={numeroTeste}
              onChange={(e) => setNumeroTeste(e.target.value)}
            />
            <Button
              size="sm"
              variant="secondary"
              loading={ocupado === "teste"}
              disabled={numeroTeste.replace(/\D/g, "").length < 8}
              onClick={() =>
                executar(
                  "teste",
                  () => porta.enviarTeste(canal.id, numeroTeste),
                  t("canalEvolution.canal.testeEnviado"),
                )
              }
            >
              {t("canalEvolution.canal.testeEnviar")}
            </Button>
          </div>

          {agentes.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <Select
                label={t("canalEvolution.canal.agenteLabel")}
                value={agenteId}
                onChange={(e) => setAgenteId(e.target.value)}
              >
                {agentes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                loading={ocupado === "agente"}
                disabled={!agenteId}
                onClick={() =>
                  executar(
                    "agente",
                    () => porta.vincularAgente(canal.id, agenteId),
                    t("canalEvolution.canal.agenteVinculado"),
                  )
                }
              >
                {t("canalEvolution.canal.agenteVincular")}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {canal.ativa ? (
              <Button
                size="sm"
                variant="ghost"
                loading={ocupado === "ativa"}
                onClick={() =>
                  executar(
                    "ativa",
                    () => porta.definirAtiva(canal.id, false),
                    t("canalEvolution.canal.desativado"),
                  )
                }
              >
                {t("canalEvolution.canal.desativar")}
              </Button>
            ) : (
              <Button
                size="sm"
                loading={ocupado === "ativa"}
                disabled={!podeAtivar}
                onClick={() =>
                  executar(
                    "ativa",
                    () => porta.definirAtiva(canal.id, true),
                    t("canalEvolution.canal.ativado"),
                  )
                }
              >
                {t("canalEvolution.canal.ativar")}
              </Button>
            )}
            {!canal.ativa && !podeAtivar && (
              <span className="text-xs text-ink-soft">
                {t("canalEvolution.canal.ativarBloqueado")}
              </span>
            )}
          </div>
        </div>
      )}

      {passo !== "preparar" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            loading={ocupado === "estado"}
            onClick={() =>
              executar("estado", async () => {
                const r = await porta.consultarEstado(canal.id);
                if (r.numeroDivergente) setAviso(t("canalEvolution.canal.numeroDivergente"));
              })
            }
          >
            {t("canalEvolution.canal.atualizar")}
          </Button>
          {afetadaLogout && (
            <span className="text-xs text-ink-soft">{t("canalEvolution.canal.avisoLogout")}</span>
          )}
        </div>
      )}
    </li>
  );
}
