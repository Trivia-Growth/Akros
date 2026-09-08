import { Badge, Card, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { CircleAlert, Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOperacaoAdminReal } from "../application/real-hooks";

export function OperacaoRealPage() {
  const { t } = useTranslation("admin");
  const { dados, carregando, erro } = useOperacaoAdminReal();

  if (carregando) return <EstadoOperacao mensagem="Carregando operação real…" />;
  if (erro || !dados)
    return <EstadoOperacao mensagem="Não foi possível carregar a operação." erro />;

  return (
    <div className="flex flex-col gap-6" data-testid="operacao-real">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">{t("operations.title")}</h1>
          <p className="text-sm text-ink-soft">{t("operations.subtitle")}</p>
        </div>
        <p className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft">
          Dados reais protegidos por RLS
        </p>
      </div>

      <Tabs defaultValue="bottlenecks">
        <TabsList>
          <TabsTrigger value="bottlenecks">{t("operations.tabsBottlenecks")}</TabsTrigger>
          <TabsTrigger value="alerts">{t("operations.tabsAlerts")}</TabsTrigger>
        </TabsList>

        <TabsContent value="bottlenecks">
          {dados.gargalos.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("operations.noBottlenecks")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {dados.gargalos.map((gargalo) => (
                <Card
                  key={`${gargalo.titulo}-${gargalo.responsavel}`}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">{gargalo.titulo}</p>
                    <p className="text-xs text-ink-muted">
                      {t("operations.casesStuck", { count: gargalo.casos })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">
                      {t(`journey.responsible.${gargalo.responsavel}`)}
                    </Badge>
                    <Badge variant="gold">
                      {t("operations.avgDaysStuck", { days: gargalo.mediaDias })}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          {dados.alertas.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("operations.noAlerts")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {dados.alertas.map((alerta, indice) => (
                <Card
                  key={`${alerta.clienteId}-${alerta.tipo}-${alerta.etapaTitulo ?? indice}`}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">{alerta.clienteNome}</p>
                    <p className="text-xs text-ink-muted">
                      {alerta.tipo === "inatividade"
                        ? t("operations.alertInactive", { days: alerta.dias })
                        : t("operations.alertStuck", {
                            step: alerta.etapaTitulo,
                            days: alerta.dias,
                          })}
                    </p>
                  </div>
                  <Badge variant={alerta.tipo === "inatividade" ? "warning" : "danger"}>
                    {t(`operations.alertType.${alerta.tipo}`)}
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

function EstadoOperacao({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Operação</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? <CircleAlert className="h-4 w-4 text-red-600" /> : <Clock3 className="h-4 w-4" />}
        {mensagem}
      </Card>
    </div>
  );
}
