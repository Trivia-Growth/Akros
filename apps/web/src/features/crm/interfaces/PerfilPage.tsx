import { container } from "@/app/di";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { useMockDb } from "@/mocks/store";
import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import {
  Avatar,
  Button,
  Card,
  Input,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@/shared/ui";
import { CalendarDays, LockKeyhole, MessageCircle, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { EstadoCivil, Familiar, ParentescoFamiliar, PerfilImigratorio } from "../domain/types";

const ESTADO_CIVIL_LABEL: Record<EstadoCivil, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  uniao_estavel: "União estável",
};

const PARENTESCO_LABEL: Record<ParentescoFamiliar, string> = {
  conjuge: "Cônjuge",
  filho: "Filho",
  filha: "Filha",
  outro: "Outro",
};

function perfilImigratorioVazio(): PerfilImigratorio {
  return { familiares: [] };
}

export function PerfilPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const programa = useMockDb((s) => s.programas.find((p) => p.codigo === cliente?.programaId));
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [perfil, setPerfil] = useState<PerfilImigratorio>(perfilImigratorioVazio());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    setNome(cliente.nome);
    setEmail(cliente.email);
    setTelefone(cliente.telefone);
    setPerfil(cliente.perfilImigratorio ?? perfilImigratorioVazio());
  }, [cliente]);

  if (!cliente) return null;

  const mostraFamilia = programa?.sujeito !== "organizacao";

  async function handleSalvarDados() {
    if (!cliente || saving) return;
    setSaving(true);
    try {
      await container.clientes.atualizar(cliente.id, { nome, email, telefone });
      toast.success(t("profile.saved"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSalvarPerfil() {
    if (!cliente || saving) return;
    setSaving(true);
    try {
      await container.clientes.atualizar(cliente.id, { perfilImigratorio: perfil });
      toast.success(t("profile.saved"));
    } finally {
      setSaving(false);
    }
  }

  function adicionarFamiliar() {
    setPerfil((atual) => ({
      ...atual,
      familiares: [
        ...atual.familiares,
        {
          id: `familiar-${crypto.randomUUID().slice(0, 6)}`,
          nome: "",
          parentesco: "conjuge",
          incluirNoProcesso: false,
        } satisfies Familiar,
      ],
    }));
  }

  function atualizarFamiliar(id: string, patch: Partial<Familiar>) {
    setPerfil((atual) => ({
      ...atual,
      familiares: atual.familiares.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }

  function removerFamiliar(id: string) {
    setPerfil((atual) => ({
      ...atual,
      familiares: atual.familiares.filter((f) => f.id !== id),
    }));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 lg:gap-8">
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
          Mantenha suas informações atualizadas para que sua equipe conduza o processo com
          segurança.
        </p>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="dados">Meus dados</TabsTrigger>
          <TabsTrigger value="processo">Dados do processo</TabsTrigger>
          {mostraFamilia && <TabsTrigger value="familia">Família</TabsTrigger>}
        </TabsList>

        <TabsContent value="dados">
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
            <Card className="border-border/80 p-6 sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-medium text-navy">
                    Informações pessoais
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">Como podemos falar com você.</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-gold-700" aria-hidden />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  className="md:col-span-2"
                  label={t("profile.name")}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <Input
                  type="email"
                  label={t("profile.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="tel"
                  label={t("profile.phone")}
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
                <Input label={t("profile.visaType")} value={cliente.tipoVisto} disabled />
                <Input label={t("profile.caseManager")} value={cliente.caseManager} disabled />
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <span className="text-sm font-medium text-ink">{t("profile.language")}</span>
                  <LanguageSwitcher />
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <p className="text-xs text-ink-muted">Alterações salvas na sua sessão Akros.</p>
                <Button onClick={handleSalvarDados} loading={saving} disabled={saving}>
                  {t("profile.save")}
                </Button>
              </div>
            </Card>
            <ProfileContext cliente={cliente} />
          </div>
        </TabsContent>

        <TabsContent value="processo">
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
            <Card className="border-border/80 p-6 sm:p-7">
              <div className="mb-6">
                <h2 className="font-display text-xl font-medium text-navy">Dados do processo</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Essas informações vão direto para petição. Use exatamente como constam no
                  passaporte.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  className="sm:col-span-2"
                  label="Nome completo legal"
                  placeholder="Como consta no passaporte"
                  value={perfil.nomeCompletoLegal ?? ""}
                  onChange={(e) => setPerfil({ ...perfil, nomeCompletoLegal: e.target.value })}
                />
                <Input
                  type="date"
                  label="Data de nascimento"
                  value={perfil.dataNascimento ?? ""}
                  onChange={(e) => setPerfil({ ...perfil, dataNascimento: e.target.value })}
                />
                <Input
                  label="País de nascimento"
                  value={perfil.paisNascimento ?? ""}
                  onChange={(e) => setPerfil({ ...perfil, paisNascimento: e.target.value })}
                />
                <Input
                  label="Nacionalidade"
                  value={perfil.nacionalidade ?? ""}
                  onChange={(e) => setPerfil({ ...perfil, nacionalidade: e.target.value })}
                />
                <Select
                  label="Estado civil"
                  value={perfil.estadoCivil ?? ""}
                  onChange={(e) =>
                    setPerfil({ ...perfil, estadoCivil: e.target.value as EstadoCivil })
                  }
                >
                  <option value="">Selecione</option>
                  {(Object.entries(ESTADO_CIVIL_LABEL) as [EstadoCivil, string][]).map(
                    ([valor, label]) => (
                      <option key={valor} value={valor}>
                        {label}
                      </option>
                    ),
                  )}
                </Select>
                <Input
                  label="Número do passaporte"
                  value={perfil.numeroPassaporte ?? ""}
                  onChange={(e) => setPerfil({ ...perfil, numeroPassaporte: e.target.value })}
                />
                <Input
                  type="date"
                  label="Validade do passaporte"
                  value={perfil.validadePassaporte ?? ""}
                  onChange={(e) => setPerfil({ ...perfil, validadePassaporte: e.target.value })}
                />
                <Input
                  className="sm:col-span-2"
                  label="Endereço atual completo"
                  value={perfil.enderecoAtual ?? ""}
                  onChange={(e) => setPerfil({ ...perfil, enderecoAtual: e.target.value })}
                />
                <Input
                  type="tel"
                  label="Telefone alternativo"
                  value={perfil.telefoneAlternativo ?? ""}
                  onChange={(e) => setPerfil({ ...perfil, telefoneAlternativo: e.target.value })}
                />
              </div>
              <div className="mt-7 flex justify-end border-t border-border pt-5">
                <Button onClick={handleSalvarPerfil} loading={saving} disabled={saving}>
                  {t("profile.save")}
                </Button>
              </div>
            </Card>
            <ProfileContext cliente={cliente} process />
          </div>
        </TabsContent>

        {mostraFamilia && (
          <TabsContent value="familia">
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
              <Card className="border-border/80 p-6 sm:p-7">
                <div className="mb-6">
                  <h2 className="font-display text-xl font-medium text-navy">
                    Família no processo
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Inclua quem deve constar na petição como beneficiário derivado.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {perfil.familiares.length === 0 ? (
                    <p className="text-sm text-ink-muted">Nenhum familiar cadastrado ainda.</p>
                  ) : (
                    perfil.familiares.map((familiar) => (
                      <div
                        key={familiar.id}
                        className="rounded-lg border border-border bg-cream-50/50 p-3"
                      >
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_auto]">
                          <Input
                            value={familiar.nome}
                            placeholder="Nome completo"
                            aria-label="Nome do familiar"
                            onChange={(e) =>
                              atualizarFamiliar(familiar.id, { nome: e.target.value })
                            }
                          />
                          <Select
                            value={familiar.parentesco}
                            aria-label="Parentesco"
                            onChange={(e) =>
                              atualizarFamiliar(familiar.id, {
                                parentesco: e.target.value as ParentescoFamiliar,
                              })
                            }
                          >
                            {(
                              Object.entries(PARENTESCO_LABEL) as [ParentescoFamiliar, string][]
                            ).map(([valor, label]) => (
                              <option key={valor} value={valor}>
                                {label}
                              </option>
                            ))}
                          </Select>
                          <Input
                            type="date"
                            value={familiar.dataNascimento ?? ""}
                            aria-label="Data de nascimento do familiar"
                            onChange={(e) =>
                              atualizarFamiliar(familiar.id, { dataNascimento: e.target.value })
                            }
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerFamiliar(familiar.id)}
                            aria-label="Remover familiar"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <Input
                            className="max-w-xs"
                            value={familiar.nacionalidade ?? ""}
                            placeholder="Nacionalidade"
                            aria-label="Nacionalidade do familiar"
                            onChange={(e) =>
                              atualizarFamiliar(familiar.id, { nacionalidade: e.target.value })
                            }
                          />
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                            <input
                              type="checkbox"
                              checked={familiar.incluirNoProcesso}
                              onChange={(e) =>
                                atualizarFamiliar(familiar.id, {
                                  incluirNoProcesso: e.target.checked,
                                })
                              }
                              className="h-4 w-4 accent-gold-600"
                            />
                            Incluir no processo
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={adicionarFamiliar}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Adicionar familiar
                  </Button>
                </div>
                <div className="mt-7 flex justify-end border-t border-border pt-5">
                  <Button onClick={handleSalvarPerfil} loading={saving} disabled={saving}>
                    {t("profile.save")}
                  </Button>
                </div>
              </Card>
              <ProfileContext cliente={cliente} family />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ProfileContext({
  cliente,
  process = false,
  family = false,
}: {
  cliente: NonNullable<ReturnType<typeof useClienteAtivo>>;
  process?: boolean;
  family?: boolean;
}) {
  const detail = family
    ? "Dados corretos ajudam a equipe a avaliar todos os elegíveis no processo."
    : process
      ? "Revise estes dados antes de qualquer etapa de petição."
      : "Sua equipe usa estes dados para manter cada comunicação do processo em dia.";

  return (
    <aside className="space-y-4 lg:sticky lg:top-7">
      <section className="rounded-[1.25rem] bg-navy p-6 text-white shadow-elevated">
        <div className="flex items-center gap-3">
          <Avatar name={cliente.nome} size="md" className="ring-2 ring-gold-200" />
          <div>
            <p className="font-display text-lg font-medium">{cliente.nome}</p>
            <p className="mt-0.5 text-xs text-white/60">Cliente Akros</p>
          </div>
        </div>
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-xs font-semibold uppercase tracking-label text-gold">Seu processo</p>
          <p className="mt-2 text-sm font-medium text-white">{cliente.tipoVisto}</p>
          <p className="mt-1 text-sm text-white/60">Acompanhado por {cliente.caseManager}</p>
        </div>
        <Link
          to="/portal/mensagens"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
        >
          <MessageCircle className="h-4 w-4 text-gold" aria-hidden />
          Falar com minha equipe
        </Link>
      </section>

      <section className="rounded-[1.25rem] bg-cream-300/65 p-5">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gold-700 shadow-subtle">
            {family ? (
              <CalendarDays className="h-4 w-4" aria-hidden />
            ) : (
              <LockKeyhole className="h-4 w-4" aria-hidden />
            )}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-navy">
              {family ? "Informação importante" : "Dados protegidos"}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{detail}</p>
          </div>
        </div>
      </section>
    </aside>
  );
}
