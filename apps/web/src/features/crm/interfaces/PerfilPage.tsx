import { container } from "@/app/di";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { Button, Card, Input, toast } from "@/shared/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function PerfilPage() {
  const { t } = useTranslation("portal");
  const cliente = useClienteAtivo();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    setNome(cliente.nome);
    setEmail(cliente.email);
    setTelefone(cliente.telefone);
  }, [cliente]);

  if (!cliente) return null;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await container.clientes.atualizar(cliente.id, { nome, email, telefone });
      toast.success(t("profile.saved"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("profile.title")}</h1>
        <p className="text-sm text-ink-soft">{t("profile.subtitle")}</p>
      </div>

      <Card className="max-w-lg">
        <div className="flex flex-col gap-4">
          <Input label={t("profile.name")} value={nome} onChange={(e) => setNome(e.target.value)} />
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

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">{t("profile.language")}</span>
            <LanguageSwitcher />
          </div>

          <Button
            className="mt-2 self-start"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            {t("profile.save")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
