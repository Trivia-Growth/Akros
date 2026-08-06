import { useMockDb } from "@/mocks/store";
import { Avatar, Badge, Card, Input } from "@/shared/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Cliente360 } from "./Cliente360";

const SAUDE_VARIANT = {
  em_dia: "success",
  atencao: "warning",
  atrasado: "danger",
} as const;

export function Clientes360Page() {
  const { t } = useTranslation("admin");
  const clientes = useMockDb((s) => s.clientes);
  const jornadas = useMockDb((s) => s.jornadas);
  const [busca, setBusca] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);

  if (clienteId) {
    return <Cliente360 clienteId={clienteId} onBack={() => setClienteId(null)} />;
  }

  const filtrados = clientes.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("clientes.title")}</h1>
        <p className="text-sm text-ink-soft">{t("clientes.subtitle")}</p>
      </div>

      <Input
        placeholder={t("clientes.search")}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((cliente) => {
          const jornada = jornadas.find((j) => j.clienteId === cliente.id);
          const faseAtual = jornada?.fases.find(
            (f) => f.status === "em_andamento" || f.status === "liberada",
          );
          return (
            <button key={cliente.id} type="button" onClick={() => setClienteId(cliente.id)}>
              <Card className="flex items-center gap-3 text-left transition-shadow hover:shadow-elevated">
                <Avatar name={cliente.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy">{cliente.nome}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {faseAtual?.titulo ?? "—"} · {cliente.tipoVisto}
                  </p>
                </div>
                <Badge variant={SAUDE_VARIANT[cliente.saude]}>
                  {t(`clientes.health_${cliente.saude}`)}
                </Badge>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
