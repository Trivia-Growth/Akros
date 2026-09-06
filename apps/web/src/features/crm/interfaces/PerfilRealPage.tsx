import { Card } from "@/shared/ui";
import { CircleAlert, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePerfilClienteSupabase } from "../application/usePerfilClienteSupabase";
import type { PerfilImigratorio } from "../domain/types";

export function PerfilRealPage() {
  const { t } = useTranslation("portal");
  const { cliente, carregando, erro } = usePerfilClienteSupabase();

  if (carregando) return <EstadoPerfil mensagem="Carregando perfil real…" />;
  if (erro) return <EstadoPerfil mensagem="Não foi possível carregar o perfil." erro />;
  if (!cliente) return <EstadoPerfil mensagem="Perfil real não encontrado." />;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7" data-testid="perfil-real">
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
            Sua conta Akros
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-navy">
            {t("profile.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("profile.subtitle")}</p>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-ink-muted sm:text-right">
          Dados reais protegidos por RLS.
        </p>
      </div>

      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
        <p>
          Alteração de perfil fica indisponível até RPC validada e auditada; navegador não atualiza
          dados diretamente.
        </p>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2 lg:col-span-2">
          <Campo label={t("profile.name")} value={cliente.nome} />
          <Campo label={t("profile.email")} value={cliente.email} />
          <Campo label={t("profile.phone")} value={cliente.telefone} />
          <Campo label={t("profile.visaType")} value={cliente.tipoVisto} />
          <Campo label={t("profile.caseManager")} value={cliente.caseManager} />
          <Campo
            label="Cliente desde"
            value={new Date(cliente.criadoEm).toLocaleDateString("pt-BR")}
          />
        </Card>
        <PerfilProcesso perfil={cliente.perfilImigratorio} />
      </section>
    </div>
  );
}

function PerfilProcesso({ perfil }: { perfil?: PerfilImigratorio }) {
  if (!perfil)
    return <Card className="text-sm text-ink-muted">Dados do processo ainda não informados.</Card>;
  return (
    <Card>
      <h2 className="mb-4 font-display text-xl font-medium text-navy">Dados do processo</h2>
      <div className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        <Campo label="Nome completo legal" value={perfil.nomeCompletoLegal ?? "Não informado"} />
        <Campo label="Data de nascimento" value={perfil.dataNascimento ?? "Não informado"} />
        <Campo label="País de nascimento" value={perfil.paisNascimento ?? "Não informado"} />
        <Campo label="Nacionalidade" value={perfil.nacionalidade ?? "Não informado"} />
        <Campo label="Passaporte" value={perfil.numeroPassaporte ?? "Não informado"} />
        <Campo label="Endereço" value={perfil.enderecoAtual ?? "Não informado"} />
      </div>
      {perfil.familiares.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-label text-gold-700">
            Família
          </p>
          <ul className="flex flex-col gap-1 text-sm text-ink-soft">
            {perfil.familiares.map((familiar) => (
              <li key={familiar.id}>
                {familiar.nome || "Não informado"} · {familiar.parentesco}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-medium text-navy">{value}</p>
    </div>
  );
}

function EstadoPerfil({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Perfil</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? (
          <CircleAlert className="h-4 w-4 text-red-600" />
        ) : (
          <UserRound className="h-4 w-4" />
        )}
        {mensagem}
      </Card>
    </div>
  );
}
