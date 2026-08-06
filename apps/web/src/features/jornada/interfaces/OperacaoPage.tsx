import { diasParado } from "@/features/jornada/application/calcular-previsao";
import { useMockDb } from "@/mocks/store";
import { Badge, Card, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const LIMIAR_INATIVO_DIAS = 21;
const LIMIAR_ETAPA_TRAVADA_MULTIPLICADOR = 3;

/**
 * E09-S03 (gargalos) + E09-S04 (alertas) — mesma tela, duas abas: evita duplicar a base de
 * dados (etapas pendentes por responsável) em duas páginas separadas.
 */
export function OperacaoPage() {
  const { t } = useTranslation("admin");
  const jornadas = useMockDb((s) => s.jornadas);
  const clientes = useMockDb((s) => s.clientes);
  const eventos = useMockDb((s) => s.eventosComunicacao);

  const nomeCliente = (clienteId: string) =>
    clientes.find((c) => c.id === clienteId)?.nome ?? clienteId;

  const gargalos = useMemo(() => {
    const porEtapa = new Map<
      string,
      { titulo: string; responsavel: string; totalDiasParado: number; casos: number }
    >();
    for (const jornada of jornadas) {
      for (const fase of jornada.fases) {
        for (const etapa of fase.etapas) {
          const dias = diasParado(etapa);
          if (dias === 0) continue;
          const atual = porEtapa.get(etapa.id) ?? {
            titulo: etapa.titulo,
            responsavel: etapa.responsavel,
            totalDiasParado: 0,
            casos: 0,
          };
          atual.totalDiasParado += dias;
          atual.casos += 1;
          porEtapa.set(etapa.id, atual);
        }
      }
    }
    return Array.from(porEtapa.values())
      .map((g) => ({ ...g, mediaDias: Math.round(g.totalDiasParado / g.casos) }))
      .sort((a, b) => b.mediaDias - a.mediaDias);
  }, [jornadas]);

  const alertas = useMemo(() => {
    const lista: { clienteId: string; tipo: string; detalhe: string }[] = [];
    for (const jornada of jornadas) {
      const ultimoEvento = eventos
        .filter((e) => e.clienteOuLeadId === jornada.clienteId && e.direcao === "entrada")
        .sort((a, b) => b.ocorridoEm.localeCompare(a.ocorridoEm))[0];
      const diasSemContato = ultimoEvento
        ? Math.round((Date.now() - new Date(ultimoEvento.ocorridoEm).getTime()) / 86_400_000)
        : null;
      if (diasSemContato !== null && diasSemContato >= LIMIAR_INATIVO_DIAS) {
        lista.push({
          clienteId: jornada.clienteId,
          tipo: "inatividade",
          detalhe: t("operations.alertInactive", { days: diasSemContato }),
        });
      }
      for (const fase of jornada.fases) {
        for (const etapa of fase.etapas) {
          const dias = diasParado(etapa);
          const limiar = (etapa.prazoMedioDiasUteis ?? 10) * LIMIAR_ETAPA_TRAVADA_MULTIPLICADOR;
          if (dias > limiar) {
            lista.push({
              clienteId: jornada.clienteId,
              tipo: "etapa_travada",
              detalhe: t("operations.alertStuck", { step: etapa.titulo, days: dias }),
            });
          }
        }
      }
    }
    return lista;
  }, [jornadas, eventos, t]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("operations.title")}</h1>
        <p className="text-sm text-ink-soft">{t("operations.subtitle")}</p>
      </div>

      <Tabs defaultValue="bottlenecks">
        <TabsList>
          <TabsTrigger value="bottlenecks">{t("operations.tabsBottlenecks")}</TabsTrigger>
          <TabsTrigger value="alerts">{t("operations.tabsAlerts")}</TabsTrigger>
        </TabsList>

        <TabsContent value="bottlenecks">
          {gargalos.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("operations.noBottlenecks")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {gargalos.map((g) => (
                <Card key={g.titulo} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy">{g.titulo}</p>
                    <p className="text-xs text-ink-muted">
                      {t("operations.casesStuck", { count: g.casos })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{t(`journey.responsible.${g.responsavel}`)}</Badge>
                    <Badge variant="gold">
                      {t("operations.avgDaysStuck", { days: g.mediaDias })}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          {alertas.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("operations.noAlerts")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {alertas.map((a, i) => (
                <Card key={`${a.clienteId}-${i}`} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy">{nomeCliente(a.clienteId)}</p>
                    <p className="text-xs text-ink-muted">{a.detalhe}</p>
                  </div>
                  <Badge variant={a.tipo === "inatividade" ? "warning" : "danger"}>
                    {t(`operations.alertType.${a.tipo}`)}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
